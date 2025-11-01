const axios = require("axios");
const { cmd } = require("../command");

let chatbotActive = false; // on/off state

cmd({
  pattern: "chatbot",
  desc: "Toggle AI chatbot on/off (works only in private chats)",
  category: "ai",
  react: "🤖",
  filename: __filename
},
async (conn, mek, m, { args, reply }) => {
  const arg = (args[0] || "").toLowerCase();

  if (arg === "on") {
    chatbotActive = true;
    reply("✅ Chatbot is now *ON* — I’ll reply to your private messages!");
    return;
  }

  if (arg === "off") {
    chatbotActive = false;
    reply("❌ Chatbot is now *OFF* — I’ll stop replying.");
    return;
  }

  reply("⚙️ Use `.chatbot on` or `.chatbot off` to control AI replies.");
});

// Listen for any incoming message (DM only)
const { default: makeWASocket } = require("@whiskeysockets/baileys");

// Wait a bit to ensure conn exists, then attach listener
setTimeout(() => {
  global.conn?.ev?.on("messages.upsert", async (m) => {
    try {
      const msg = m.messages[0];
      if (!msg.message) return;
      const from = msg.key.remoteJid;
      const isGroup = from.endsWith("@g.us");
      const isFromMe = msg.key.fromMe;

      // Only DM, not self, and chatbot active
      if (!isGroup && !isFromMe && chatbotActive) {
        const body =
          msg.message.conversation ||
          msg.message?.extendedTextMessage?.text ||
          "";

        if (!body || body.startsWith(".")) return;

        await global.conn.sendPresenceUpdate("composing", from);

        const apiUrl = `https://api.giftedtech.web.id/api/ai/ai?apikey=gifted&q=${encodeURIComponent(body)}`;
        const { data } = await axios.get(apiUrl);

        const response = data?.result || data?.message || "🤖 No response from AI.";

        await global.conn.sendMessage(from, { text: response }, { quoted: msg });
      }
    } catch (err) {
      console.error("Chatbot message error:", err.message);
    }
  });
}, 5000);
