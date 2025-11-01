const axios = require("axios");
const { cmd } = require("../command");

let chatbotActive = false; // Stores ON/OFF state

cmd({
  pattern: "chatbot",
  desc: "Toggle AI chatbot on/off (works only in private chats)",
  category: "ai",
  react: "🤖",
  filename: __filename
},
async (conn, mek, m, { args, reply }) => {
  const arg = (args[0] || "").toLowerCase();

  // Toggle ON
  if (arg === "on") {
    chatbotActive = true;
    reply("✅ Chatbot is now *ON* — I’ll reply to your private messages!");
    return;
  }

  // Toggle OFF
  if (arg === "off") {
    chatbotActive = false;
    reply("❌ Chatbot is now *OFF* — I’ll stop replying.");
    return;
  }

  // If chatbot is active, reply to any private message
  const from = m.key.remoteJid;
  const isGroup = from.endsWith("@g.us");
  const isFromMe = m.key.fromMe;

  if (!isGroup && !isFromMe && chatbotActive) {
    const body =
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      "";

    if (!body || body.startsWith(".")) return; // Ignore empty or commands

    try {
      await conn.sendPresenceUpdate("composing", from);

      const apiUrl = `https://api.giftedtech.web.id/api/ai/ai?apikey=gifted&q=${encodeURIComponent(body)}`;
      const { data } = await axios.get(apiUrl);

      const aiResponse = data?.result || data?.message || "🤖 No response from AI.";

      await conn.sendMessage(
        from,
        { text: aiResponse },
        { quoted: mek }
      );
    } catch (e) {
      console.error("Chatbot error:", e.message);
    }
  }
});
