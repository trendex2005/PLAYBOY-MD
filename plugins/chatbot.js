const axios = require("axios");
const { cmd } = require("../command");

let chatbotEnabled = false;

// ======== TOGGLE COMMAND ========
cmd({
  pattern: "chatbot",
  desc: "Toggle chatbot on or off for private chats.",
  category: "ai",
  react: "🤖",
  filename: __filename,
},
async (conn, mek, m, { from, args, reply }) => {
  const arg = (args[0] || "").toLowerCase();

  if (arg === "on") {
    chatbotEnabled = true;
    return reply("✅ *Chatbot enabled for private chats.*");
  }

  if (arg === "off") {
    chatbotEnabled = false;
    return reply("❌ *Chatbot disabled.*");
  }

  return reply(
    `🤖 *Chatbot Status:* ${chatbotEnabled ? "🟢 ON" : "🔴 OFF"}\n\nUse:\n.chatbot on — enable\n.chatbot off — disable`
  );
});

// ======== AUTO REPLY TO PRIVATE MESSAGES ONLY ========
cmd({
  on: "message"
},
async (conn, mek, m, { from, reply }) => {
  try {
    // Skip if chatbot is off
    if (!chatbotEnabled) return;

    // Skip self messages
    if (mek.key.fromMe) return;

    // Skip group chats — only reply in private
    if (m.isGroup) return;

    const body = m.body || m.text || "";
    if (!body) return;

    // Skip commands
    if (body.startsWith(".")) return;

    // Typing indicator
    await conn.sendPresenceUpdate("composing", from);

    // Query AI API
    const prompt = encodeURIComponent(body);
    const url = `https://api.giftedtech.web.id/api/ai/ai?apikey=gifted&q=${prompt}`;

    const { data } = await axios.get(url);
    const response = data?.result || data?.message || "🤖 I'm here to chat!";

    // Send AI reply
    await conn.sendMessage(from, {
      text: `${response}\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴠɪɴɪᴄ-xᴍᴅ ᴀɪ*`
    }, { quoted: mek });

  } catch (err) {
    console.error("Chatbot DM error:", err);
  }
});
