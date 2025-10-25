const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const DATA_PATH = path.join(__dirname, '../data/userGroupData.json');

// Ensure data file exists
if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify({ chatbot: {} }, null, 2));
}

// Load/save
const loadData = () => JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const saveData = (data) => fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

// Typing simulation
const delay = (ms) => new Promise(r => setTimeout(r, ms));
async function typing(sock, chatId) {
    await sock.presenceSubscribe(chatId);
    await sock.sendPresenceUpdate('composing', chatId);
    await delay(Math.floor(Math.random() * 2000) + 1500);
}

// AI API
async function getAIResponse(query) {
    try {
        const url = `https://api.dreaded.site/api/chatgpt?text=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();
        return data?.result?.prompt || data?.message || data?.answer || null;
    } catch (err) {
        console.error('AI API Error:', err.message);
        return null;
    }
}

// Chatbot toggle + auto-response
module.exports = {
    name: 'chatbot',
    alias: ['ai-chat'],
    category: 'ai',
    desc: 'Enable or disable chatbot in this group',

    async execute(sock, chatId, msg, args) {
        const sender = msg.key.participant || msg.key.remoteJid;
        const data = loadData();

        // Only group admins or bot owner
        let isAdmin = false;
        let botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        if (chatId.endsWith('@g.us')) {
            try {
                const meta = await sock.groupMetadata(chatId);
                isAdmin = meta.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));
            } catch {
                console.log('⚠️ Could not fetch admin list.');
            }
        }

        const isOwner = sender === botNumber;
        if (!isOwner && !isAdmin) {
            return sock.sendMessage(chatId, { text: '❌ Only group admins or the bot owner can use this command.', quoted: msg });
        }

        const option = args[0]?.toLowerCase();
        if (!option || !['on', 'off'].includes(option)) {
            return sock.sendMessage(chatId, {
                text: `*Chatbot Setup*\n\n.chatbot on → Enable chatbot\n.chatbot off → Disable chatbot`,
                quoted: msg
            });
        }

        if (option === 'on') {
            data.chatbot[chatId] = true;
            saveData(data);
            await sock.sendMessage(chatId, { text: '✅ Chatbot has been enabled in this group.', quoted: msg });
        } else {
            delete data.chatbot[chatId];
            saveData(data);
            await sock.sendMessage(chatId, { text: '❌ Chatbot has been disabled in this group.', quoted: msg });
        }
    },

    /**
     * 🔁 AUTO-REPLY HANDLER
     * Call this from your main message listener when a message is received.
     */
    async onMessage(sock, chatId, msg, text, sender) {
        const data = loadData();
        if (!data.chatbot[chatId]) return; // chatbot off

        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        let mentioned = false;
        let replyToBot = false;

        // Detect mentions/replies
        if (msg.message?.extendedTextMessage) {
            const ctx = msg.message.extendedTextMessage.contextInfo || {};
            mentioned = (ctx.mentionedJid || []).includes(botNumber);
            replyToBot = ctx.participant === botNumber;
        } else if (msg.message?.conversation) {
            mentioned = text.includes(`@${botNumber.split('@')[0]}`);
        }

        if (!mentioned && !replyToBot) return;

        await typing(sock, chatId);
        const clean = text.replace(new RegExp(`@${botNumber.split('@')[0]}`, 'g'), '').trim();
        const aiResponse = await getAIResponse(clean);

        await delay(Math.floor(Math.random() * 2000) + 1000);
        await sock.sendMessage(chatId, { text: aiResponse || "🤖 Sorry, I didn’t get that.", quoted: msg });
    }
};
