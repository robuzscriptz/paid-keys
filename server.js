const express = require('express');
const app = express();
app.use(express.json());

// ==========================================
// 🔑 YOUR KEY DATABASE (AUTOMATED EXPIRE)
// ==========================================
let database = {
    "PREMIUM-KEY-123": {
        maxSessions: 2,       
        allowedMinutes: 60,   
        sessions: {},         // Format: { "UserId": { minutesUsed: 0, lastSeen: timestamp } }
        lastResetDate: new Date().getUTCDate() 
    }
};
// ==========================================

app.post('/api/verify', (req, res) => {
    const { key, userId } = req.body;
    const keyData = database[key];

    if (!keyData) {
        return res.json({ allowed: false, message: "Invalid License Key!" });
    }

    // 1. Daily Time Reset Check (UTC Midnight)
    const today = new Date().getUTCDate();
    if (keyData.lastResetDate !== today) {
        keyData.sessions = {}; 
        keyData.lastResetDate = today;
    }

    const currentTime = Date.now();

    // 2. AUTOMATIC SLOT CLEARING: Kick out anyone who hasn't pinged in 90 seconds
    for (const activeId in keyData.sessions) {
        const timeSinceLastPing = currentTime - keyData.sessions[activeId].lastSeen;
        if (timeSinceLastPing > 90000) { // 90,000 ms = 90 seconds
            delete keyData.sessions[activeId]; // Frees up the slot instantly!
        }
    }

    const activeUserIds = Object.keys(keyData.sessions);

    // 3. If user is ALREADY running the script, update their status
    if (keyData.sessions[userId] !== undefined) {
        keyData.sessions[userId].minutesUsed += 1; // Increment time
        keyData.sessions[userId].lastSeen = currentTime; // Refresh their online timestamp

        // Total time check
        if (keyData.sessions[userId].minutesUsed >= keyData.allowedMinutes) {
            const hoursAllowed = Math.round(keyData.allowedMinutes / 60);
            return res.json({ allowed: false, message: `Your ${hoursAllowed}-hour session limit has expired!` });
        }

        const sessionNumber = activeUserIds.indexOf(userId) + 1;
        return res.json({ allowed: true, sessionNumber: sessionNumber });
    }

    // 4. If it's a NEW user/account trying to take a slot
    if (activeUserIds.length < keyData.maxSessions) {
        // Register them into an open slot and save the current time
        keyData.sessions[userId] = {
            minutesUsed: 0,
            lastSeen: currentTime
        };
        
        const sessionNumber = Object.keys(keyData.sessions).length;
        return res.json({ allowed: true, sessionNumber: sessionNumber });
    } else {
        // Sessions are completely occupied by active players
        return res.json({ allowed: false, message: `Max ${keyData.maxSessions} sessions reached for this key!` });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
