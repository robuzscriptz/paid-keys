const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());

const keysPath = path.join(__dirname, 'keys.json');

app.post('/api/verify', (req, res) => {
    // 1. Read keys fresh from the file every time
    let database;
    try {
        database = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
    } catch (err) {
        return res.json({ allowed: false, message: "Database Error!" });
    }

    const { key, userId } = req.body;
    const keyData = database[key];

    if (!keyData) {
        return res.json({ allowed: false, message: "Invalid License Key!" });
    }

    // Initialize session object if it doesn't exist
    if (!keyData.sessions) keyData.sessions = {};
    if (!keyData.lastResetDate) keyData.lastResetDate = new Date().getUTCDate();

    // 2. Daily Time Reset Check
    const today = new Date().getUTCDate();
    if (keyData.lastResetDate !== today) {
        keyData.sessions = {}; 
        keyData.lastResetDate = today;
    }

    const currentTime = Date.now();

    // 3. Kick out inactive users (90 seconds)
    for (const activeId in keyData.sessions) {
        if (currentTime - keyData.sessions[activeId].lastSeen > 90000) {
            delete keyData.sessions[activeId];
        }
    }

    const activeUserIds = Object.keys(keyData.sessions);

    // 4. Handle existing user session
    if (keyData.sessions[userId]) {
        keyData.sessions[userId].minutesUsed += 1;
        keyData.sessions[userId].lastSeen = currentTime;

        if (keyData.sessions[userId].minutesUsed >= keyData.allowedMinutes) {
            return res.json({ allowed: false, message: "Your daily limit has expired!" });
        }
        return res.json({ allowed: true });
    }

    // 5. Handle new user slot
    if (activeUserIds.length < keyData.maxSessions) {
        keyData.sessions[userId] = { minutesUsed: 0, lastSeen: currentTime };
        return res.json({ allowed: true });
    } else {
        return res.json({ allowed: false, message: "Max sessions reached!" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
