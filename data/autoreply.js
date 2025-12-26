const axios = require("axios");

/**
 * Get AI response with owner override
 * @param {string} text
 * @returns {Promise<string>}
 */
async function getAIResponse(text) {
    try {
        if (!text || !text.trim()) return "❓ Please ask me something.";

        const lower = text.trim().toLowerCase();

        // Owner override
        if (
            lower.includes("owner") ||
            lower.includes("who created you") ||
            lower.includes("who is your owner") ||
            lower.includes("who made you")
        ) {
            return "👑 *My owner is Trendex.*\nHe is the developer and controller of this bot.";
        }

        // Call AI API
        const query = encodeURIComponent(text);
        const apiUrl = `https://api.giftedtech.web.id/api/ai/ai?apikey=gifted&q=${query}`;
        const { data } = await axios.get(apiUrl, { timeout: 15000 });

        if (data && data.result) return data.result;

        return "🤖 I couldn't find an answer to that.";
    } catch (err) {
        console.error("AI API Error:", err?.response?.data || err);
        return "⚠️ I'm having trouble responding right now.";
    }
}

/**
 * Handle incoming personal messages
 * @param {import('@whiskeysockets/baileys').WAConnection} conn
 * @param {import('@whiskeysockets/baileys').proto.WebMessageInfo} m
 */
async function handleMessage(conn, m) {
    try {
        if (!m.message || m.key.fromMe) return;

        const jid = m.key.remoteJid;

        // Only personal chats
        if (!jid.endsWith("@s.whatsapp.net")) return;

        // Extract text from different message types
        const text =
            m.message.conversation ||
            m.message.extendedTextMessage?.text ||
            m.message.imageMessage?.caption ||
            m.message.videoMessage?.caption ||
            m.message.documentMessage?.caption ||
            m.message.audioMessage?.caption;

        if (!text) return;

        // Get AI response
        const replyText = await getAIResponse(text);

        // Send the reply
        await conn.sendMessage(jid, { text: replyText }, { quoted: m });
    } catch (err) {
        console.error("Error handling personal message:", err);
    }
}

module.exports = { handleMessage, getAIResponse };
