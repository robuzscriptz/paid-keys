const express = require('express');
const app = express();
app.use(express.json());

// ==========================================
// 🔑 YOUR KEY DATABASE (ADD KEYS HERE)
// ==========================================
let database = {
    "PREMIUM-KEY-123": {
        maxSessions: 2,       // Allows max 2 accounts
        allowedMinutes: 60,   // Allows 1 hour total
        sessions: {},         // DO NOT TOUCH (Tracks active user IDs)
        lastResetDate: new Date().getUTCDate() 
    },
    "PLAYER-KEY-XYZ": {
        maxSessions: 3,       // Allows max 3 accounts
        allowedMinutes: 120,  // Allows 2 hours total
        sessions: {},         // DO NOT TOUCH
        lastResetDate: new Date().getUTCDate()
    },
    "ANOTHER-KEY-HERE": {
        maxSessions: 4,       // Allows max 4 accounts
        allowedMinutes: 180,  // Allows 3 hours total
        sessions: {},         // DO NOT TOUCH
        lastResetDate: new Date().getUTCDate()
    }
};
// ==========================================

app.post('/api/verify', (req, res) => {
    const { key, userId } = req.body;
    const keyData = database[key];

    // Check if key exists
    if (!keyData) {
        return res.json({ allowed: false, message: "Invalid License Key!" });
    }

    // Daily Reset check (Resets hours used if a new calendar day starts)
    const today = new Date().getUTCDate();
    if (keyData.lastResetDate !== today) {
        keyData.sessions = {}; 
        keyData.lastResetDate = today;
    }

    const activeUserIds = Object.keys(keyData.sessions);

    // 1. If the user is ALREADY running the script, update their active time
    if (keyData.sessions[userId] !== undefined) {
        keyData.sessions[userId] += 1; // Add 1 minute from heartbeat loop

        // Check if they ran out of time
        if (keyData.sessions[userId] >= keyData.allowedMinutes) {
            const hoursAllowed = Math.round(keyData.allowedMinutes / 60);
            return res.json({ allowed: false, message: `Your ${hoursAllowed}-hour session limit has expired!` });
        }

        const sessionNumber = activeUserIds.indexOf(userId) + 1;
        return res.json({ allowed: true, sessionNumber: sessionNumber });
    }

    // 2. If it's a NEW user trying to connect, check your session cap
    if (activeUserIds.length < keyData.maxSessions) {
        keyData.sessions[userId] = 0; // Initialize at 0 minutes used
        
        const sessionNumber = Object.keys(keyData.sessions).length;
        return res.json({ allowed: true, sessionNumber: sessionNumber });
    } else {
        // Hit the session cap limit
        return res.json({ allowed: false, message: `Max ${keyData.maxSessions} sessions reached for this key!` });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
