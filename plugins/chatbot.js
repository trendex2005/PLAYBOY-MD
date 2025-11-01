const axios = require("axios");
const { cmd } = require("../command");

let chatbotEnabled = false; // default OFF

// =======================
// 🔹 TOGGLE COMMAND
// =======================
cmd({
  pattern: "chatbot",
  desc: "Toggle chatbot on/off (works only in private chat)",
  category: "ai",
  react: "🤖",
  filename: __filename
},
async (conn, mek, m, { args, reply }) => {
  const arg = (args[0] || "").toLowerCase();

  if (arg === "on") {
    chatbotEnabled = true;
    return reply("✅ Chatbot has been *enabled* for private chats.");
  }

  if (arg === "off") {
    chatbotEnabled = false;
    return reply("❌ Chatbot has been *disabled*.");
  }

  reply(`🤖 Chatbot is currently *${chatbotEnabled ? "ON 🟢" : "OFF 🔴"}*\n\nUse:\n.chatbot on — Enable chatbot\n.chatbot off — Disable chatbot`);
});

// =======================
// 🔹 AUTO-REPLY TO DM MESSAGES
// =======================
cmd({
  on: "text"
}, async (conn, mek, m, { from, reply }) => {
  try {
    if (!chatbotEnabled) return; // Ignore if off
    if (mek.key.fromMe) return; // Ignore own messages
    if (m.isGroup) return; // Ignore groups

    const body = m.body || m.text || "";
    if (!body || body.startsWith(".")) return; // Skip empty/commands

    await conn.sendPresenceUpdate("composing", from);

    const query = encodeURIComponent(body);
    const apiUrl = `https://api.giftedtech.web.id/api/ai/ai?apikey=gifted&q=${query}`;

    const { data } = await axios.get(apiUrl);
    const response = data?.result || data?.message || "I’m here and listening 👋";

    await conn.sendMessage(from, {
      text: `${response}\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴠɪɴɪᴄ-xᴍᴅ ᴀɪ*`
    }, { quoted: mek });

  } catch (err) {
    console.error("Chatbot error:", err.message);
  }
});
