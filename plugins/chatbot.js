const axios = require("axios");
const { cmd } = require("../command");

let chatbotOn = false;

// ============================
// 🔹 TOGGLE CHATBOT
// ============================
cmd({
  pattern: "chatbot",
  desc: "Turn chatbot on/off for private messages only",
  category: "ai",
  react: "🤖",
  filename: __filename
},
async (conn, mek, m, { args, reply }) => {
  const arg = (args[0] || "").toLowerCase();

  if (arg === "on") {
    chatbotOn = true;
    return reply("✅ Chatbot is now *ON* — I’ll reply to your private messages.");
  }

  if (arg === "off") {
    chatbotOn = false;
    return reply("❌ Chatbot is now *OFF* — I’ll stop replying.");
  }

  return reply(`🤖 Chatbot is currently *${chatbotOn ? "🟢 ON" : "🔴 OFF"}*\n\nUse:\n.chatbot on — enable\n.chatbot off — disable`);
});

// ============================
// 🔹 RAW MESSAGE LISTENER
// ============================
cmd({
  on: "message"
}, async (conn, mek, m, { from }) => {
  try {
    if (!chatbotOn) return;           // Only when ON
    if (mek.key.fromMe) return;       // Ignore self
    if (m.isGroup) return;            // Ignore groups

    const body =
      m.text ||
      m.body ||
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      "";
    if (!body || body.startsWith(".")) return;

    await conn.sendPresenceUpdate("composing", from);

    const query = encodeURIComponent(body);
    const apiUrl = `https://api.giftedtech.web.id/api/ai/ai?apikey=gifted&q=${query}`;

    const { data } = await axios.get(apiUrl);
    const response =
      data?.result ||
      data?.message ||
      "🤖 I'm here and listening!";

    await conn.sendMessage(
      from,
      { text: `${response}\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴠɪɴɪᴄ-xᴍᴅ ᴀɪ*` },
      { quoted: mek }
    );

  } catch (err) {
    console.error("Chatbot error:", err.message);
  }
});
