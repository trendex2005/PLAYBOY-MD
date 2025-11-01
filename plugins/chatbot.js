const axios = require("axios");
const { cmd, commands } = require("../command");

// In-memory toggle state
let chatbotEnabled = false;

// Simple in-memory chat memory (optional)
const messageMemory = new Map();

// Function to update short-term context
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

// === REGISTER COMMAND ===
cmd({
  pattern: "chatbot",
  alias: ["cb", "aichat"],
  desc: "Toggle or talk with the chatbot",
  category: "ai",
  async run(m, conn, args, prefix, isCmd, isGroup, botNumber, reply) {
    try {
      const body = m.body || m.text || "";

      // TOGGLE
      const arg = (args[0] || "").toLowerCase();
      if (arg === "on") {
        chatbotEnabled = true;
        return reply("✅ *Chatbot has been enabled.*");
      }
      if (arg === "off") {
        chatbotEnabled = false;
        return reply("❌ *Chatbot has been disabled.*");
      }

      // STATUS
      if (isCmd && !arg)
        return reply(
          `🤖 *Chatbot Status:* ${chatbotEnabled ? "🟢 ON" : "🔴 OFF"}\n\nUse:\n.chatbot on — enable\n.chatbot off — disable`
        );

      // Skip processing if chatbot disabled
      if (!chatbotEnabled) return;

      // Ignore commands or empty text
      if (!body || body.startsWith(prefix)) return;

      // Group handling: respond only when mentioned
      if (isGroup) {
        const mentionedJids =
          m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const isMentioned = mentionedJids.includes(botNumber);
        if (!isMentioned) return;
      }

      console.log("🤖 Chatbot received:", body);

      // Show typing indicator
      await conn.sendPresenceUpdate("composing", m.chat);

      // Update memory
      updateMemory(m.chat, body, true);

      // Build context
      const context = messageMemory
        .get(m.chat)
        ?.map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n");

      // Prompt for AI
      const prompt = encodeURIComponent(
        `You are Vinic-Xmd AI, a friendly WhatsApp assistant developed by Kelvin Tech.
Previous conversation:
${context || ""}
User: ${body}`
      );

      const url = `https://api.giftedtech.web.id/api/ai/ai?apikey=gifted&q=${prompt}`;

      const { data } = await axios.get(url);
      const response =
        data?.result ||
        data?.message ||
        "I'm sorry, I couldn't process that right now.";

      // Add bot reply to memory
      updateMemory(m.chat, response, false);

      await conn.sendMessage(
        m.chat,
        { text: `${response}\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴠɪɴɪᴄ-xᴍᴅ ᴀɪ*` },
        { quoted: m }
      );

      console.log("✅ Chatbot response sent.");
    } catch (err) {
      console.error("Chatbot error:", err);
      reply("⚠️ Error while processing AI response.");
    }
  },
});
