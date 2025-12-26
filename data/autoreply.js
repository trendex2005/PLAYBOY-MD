const { default: makeWASocket, useSingleFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const axios = require('axios');

// Predefined responses
const responses = {
    "hi": "*💖Hey there! How’s it going?*",
    "good morning": "*Good morning! 🌞 Have a great day ahead!*",
    "who is your owner": "👑 *My owner is Trendex.*\nHe is the developer and controller of this bot.",
    "who created you": "*Trendex olton* is the genius behind me! 😆",
    // Add your other responses here...
};

// Function to get AI response
async function getAIResponse(prompt) {
    try {
        if (!prompt || !prompt.trim()) return "❓ Please ask me something.";

        const text = prompt.trim().toLowerCase();

        // Check predefined responses first
        for (let key in responses) {
            if (text.includes(key.toLowerCase())) return responses[key];
        }

        // Fallback to AI API
        const query = encodeURIComponent(prompt);
        const apiUrl = `https://api.giftedtech.web.id/api/ai/ai?apikey=gifted&q=${query}`;

        const { data } = await axios.get(apiUrl, { timeout: 15000 });
        if (data && data.result) return data.result;

        return "🤖 I couldn't find an answer to that.";
    } catch (err) {
        console.error("AI API Error:", err?.response?.data || err);
        return "⚠️ I'm having trouble responding right now.";
    }
}

// Start the bot
async function startBot() {
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
        version,
        printQRInTerminal: true,
    });

    // Listen for incoming messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return; // ignore own messages

        const jid = m.key.remoteJid;

        // Only personal chats
        if (!jid.endsWith('@s.whatsapp.net')) return;

        // Extract text robustly
        const text =
            m.message.conversation ||
            m.message.extendedTextMessage?.text ||
            m.message.imageMessage?.caption ||
            m.message.videoMessage?.caption ||
            m.message.documentMessage?.caption ||
            m.message.audioMessage?.caption;

        if (!text) return;

        // Get reply
        const replyText = await getAIResponse(text);

        // Send reply
        await sock.sendMessage(jid, { text: replyText }, { quoted: m });
    });
}

startBot();
