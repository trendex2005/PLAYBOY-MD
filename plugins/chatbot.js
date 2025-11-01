const axios = require("axios");
const { cmd } = require("../command");

let chatbotEnabled = false;
const messageMemory = new Map();

function updateMemory(chatId, content, isUser) {
    if (!messageMemory.has(chatId)) messageMemory.set(chatId, []);
    messageMemory.get(chatId).push({
        role: isUser ? "user" : "assistant",
        content,
    });
    if (messageMemory.get(chatId).length > 5) {
        messageMemory.set(chatId, messageMemory.get(chatId).slice(-5));
    }
}

cmd({
    pattern: "chatbot",
    desc: "Toggle or chat with the AI assistant.",
    category: "ai",
    react: "🤖",
    filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
    try {
        const body = m.body || m.text || "";
        const arg = (args[0] || "").toLowerCase();

        // === TOGGLE COMMAND ===
        if (arg === "on") {
            chatbotEnabled = true;
            return reply("✅ *Chatbot has been enabled.*");
        }
        if (arg === "off") {
            chatbotEnabled = false;
            return reply("❌ *Chatbot has been disabled.*");
        }

        // === STATUS COMMAND ===
        if (!arg && body.startsWith(".")) {
            return reply(`🤖 *Chatbot is currently:* ${chatbotEnabled ? "🟢 ON" : "🔴 OFF"}\n\nUse:\n.chatbot on — enable\n.chatbot off — disable`);
        }

        // === AUTO RESPONSE ===
        if (!chatbotEnabled) return;
        if (!body) return;

        // Only reply to mentions in groups
        if (m.isGroup) {
            const mentionedJids = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const isMentioned = mentionedJids.includes(conn.user?.id || conn.user?.jid);
            if (!isMentioned) return;
        }

        await conn.sendPresenceUpdate("composing", from);
        updateMemory(from, body, true);

        const context = messageMemory.get(from)
            ?.map(msg => `${msg.role}: ${msg.content}`)
            .join("\n") || "";

        const prompt = encodeURIComponent(
`You are Vinic-Xmd AI, a smart WhatsApp chatbot developed by Kelvin Tech.
Previous chat:
${context}
User: ${body}`
        );

        const apiUrl = `https://api.giftedtech.web.id/api/ai/ai?apikey=gifted&q=${prompt}`;
        const { data } = await axios.get(apiUrl);

        const response = data?.result || data?.message || "⚠️ I'm having trouble understanding that.";

        updateMemory(from, response, false);

        await conn.sendMessage(from, {
            text: `${response}\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴠɪɴɪᴄ-xᴍᴅ ᴀɪ*`
        }, { quoted: mek });

    } catch (err) {
        console.error("Chatbot error:", err);
        reply(`❌ Error: ${err.message}`);
    }
});
