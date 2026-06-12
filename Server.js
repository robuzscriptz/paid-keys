const express = require('express');
const app = express();
app.use(express.json());

// This acts as a temporary database. 
// NOTE: If the server restarts/goes to sleep, this resets.
let database = {
    "PREMIUM-KEY-123": {
        maxSessions: 2,
        allowedMinutes: 60,
        sessions: {} // Format: { "RobloxUserId": minutesUsed }
    }
};

app.post('/api/verify', (req, res) => {
    const { key, userId } = req.body;
    const keyData = database[key];

    if (!keyData) {
        return res.json({ allowed: false, message: "Invalid License Key!" });
    }

    const activeUserIds = Object.keys(keyData.sessions);

    // 1. If the user is ALREADY running the script, update their active time
    if (keyData.sessions[userId] !== undefined) {
        keyData.sessions[userId] += 1; // Add 1 minute

        if (keyData.sessions[userId] >= keyData.allowedMinutes) {
            return res.json({ allowed: false, message: "Your 1-hour session limit has expired!" });
        }

        const sessionNumber = activeUserIds.indexOf(userId) + 1;
        return res.json({ allowed: true, sessionNumber: sessionNumber });
    }

    // 2. If it's a NEW user trying to connect, check the 2-session cap
    if (activeUserIds.length < keyData.maxSessions) {
        keyData.sessions[userId] = 0; // Initialize at 0 minutes used
        
        const sessionNumber = Object.keys(keyData.sessions).length;
        return res.json({ allowed: true, sessionNumber: sessionNumber });
    } else {
        // Hit session 4 or exceeded max limits
        return res.json({ allowed: false, message: "Max 2 sessions reached for this key!" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));