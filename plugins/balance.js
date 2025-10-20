// balance.js
// Created by sung🤴

const { lite } = require('../lite');
const fs = require('fs');
const config = require('../settings');

const dataFile = './data/economy.json'; // File to store user balances

// Ensure database exists
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({ users: {} }));

lite({
    pattern: "balance",
    alias: ["bal", "coins"],
    desc: "Check your current coin balance",
    category: "economy",
    react: "💰",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {

    let db = JSON.parse(fs.readFileSync(dataFile));

    // Initialize user if not exists
    if (!db.users[from]) {
        db.users[from] = { coins: 1000, lastDaily: 0 };
    }

    const coins = db.users[from].coins;

    // Styled message
    const message = `
╭───「 💰 *Your Balance* 💰 」
│
│ 👤 User: ${m.pushName || "Unknown"}
│ 🏦 Coins: ${coins} 💎
│
╰───────────────────────────╯
`;

    reply(message);
});
