const axios = require("axios");
const { cmd } = require("../command");

let chatbotOn = false;

// ============================
// 🔹 CHATBOT TOGGLE COMMAND
// ============================
cmd({
  pattern: "chatbot",
  desc: "Turn chatbot on/off for private messages",
  category: "ai",
  react: "🤖",
  filename: __filename
},
async (conn, mek, m, { args, reply }) => {
  const arg = (args[0] || "").toLowerCase();

  if (arg === "on") {
    chatbotOn = true;
    return reply("✅ Chatbot is now *ON* — I’ll reply to private messages using the AI API.");
  }

  if (arg === "off") {
    chatbotOn = false;
    return reply("❌ Chatbot is now *OFF* — I’ll stop replying.");
  }

  reply(`🤖 Chatbot is currently *${chatbotOn ? "🟢 ON" : "🔴 OFF"}*\n\nUse:\n.chatbot on — enable\n.chatbot off — disable`);
});

// ============================
// 🔹 RAW EVENT LISTENER (DMs only)
// ============================
module.exports = (conn) => {
  conn.ev.on("messages.upsert", async (msg) => {
    try {
      if (!chatbotOn) return;
      const m = msg.messages[0];
      if (!m.message) return;

      const from = m.key.remoteJid;
      const isGroup = from.endsWith("@g.us");
      const isMe = m.key.fromMe;
      if (isGroup || isMe) return;

      const body =
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        m.message.imageMessage?.caption ||
        "";

      if (!body || body.startsWith(".")) return;

      console.log("🤖 Chatbot DM received:", body);

      await conn.sendPresenceUpdate("composing", from);

      // === USE GiftedTech API ===
    
      const apiUrl = `https://api.giftedtech.web.id/api/ai/ai?apikey=gifted&q=${encodeURIComponent(q)}`;

      const { data } = await axios.get(apiUrl);

      // Ensure only the API response is used
      if (!data || (!data.result && !data.message)) {
        console.log("⚠️ No valid response from API:", data);
        return await conn.sendMessage(from, { text: "⚠️ Sorry, I didn’t get a response from the AI." }, { quoted: m });
      }

      const response = data.result || data.message;

      // Send API response
      await conn.sendMessage(
        from,
        { text: `${response}\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴠɪɴɪᴄ-xᴍᴅ ᴀɪ*` },
        { quoted: m }
      );

      console.log("✅ Chatbot replied with API response");

    } catch (err) {
      console.error("❌ Chatbot DM Error:", err.message);
    }
  });
};
