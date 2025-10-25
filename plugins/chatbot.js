const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { cmd } = require("../command");

const USER_GROUP_DATA = path.join(__dirname, "../data/userGroupData.json");
const chatMemory = new Map();

// Load and save group/user chatbot data
function loadUserGroupData() {
  try {
    return JSON.parse(fs.readFileSync(USER_GROUP_DATA));
  } catch {
    return { chatbot: {} };
  }
}
function saveUserGroupData(data) {
  fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
}

// Random delay for human-like typing
function getRandomDelay() {
  return Math.floor(Math.random() * 2000) + 2000;
}

// Typing simulation
async function showTyping(sock, chatId) {
  try {
    await sock.presenceSubscribe(chatId);
    await sock.sendPresenceUpdate("composing", chatId);
    await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
  } catch {}
}

// Extract user info
function extractUserInfo(text) {
  const info = {};
  if (text.toLowerCase().includes("my name is"))
    info.name = text.split("my name is")[1].trim().split(" ")[0];
  if (text.match(/\b\d+\s?years old\b/))
    info.age = text.match(/\d+/)?.[0];
  if (text.toLowerCase().includes("i live in") || text.toLowerCase().includes("i am from"))
    info.location = text.split(/i live in|i am from/i)[1]?.trim().split(/[.,!?]/)[0];
  return info;
}

// AI response using Axios
async function getAIResponse(text) {
  try {
    const res = await axios.get(`https://api.dreaded.site/api/chatgpt?text=${encodeURIComponent(text)}`);
    return res.data?.result?.prompt || res.data?.result || res.data?.response || "I’m not sure how to reply to that. 🤔";
  } catch (e) {
    return "⚠️ I had trouble thinking of a response just now. Try again!";
  }
}

/* =============================================================
   COMMAND: .chatbot on/off  (PRIVATE ONLY)
   ============================================================= */
cmd({
  pattern: "chatbot",
  alias: ["cb"],
  react: "🤖",
  desc: "Enable or disable chatbot in private chat.",
  category: "ai",
  filename: __filename
}, async (conn, m, store, { from, isGroup, q, reply }) => {
  const data = loadUserGroupData();

  // Only private chats allowed
  if (isGroup) return reply("❎ This command only works in *private chats*.");

  if (!q) {
    const status = data.chatbot[from] ? "🟢 ON" : "🔴 OFF";
    return reply(
      `*🤖 CHATBOT CONTROL PANEL*\n\n` +
      `Use:\n.chatbot on — Enable chatbot\n.chatbot off — Disable chatbot\n\nStatus: ${status}`
    );
  }

  if (q === "on") {
    if (data.chatbot[from]) return reply("✅ Chatbot is already *ON*.");
    data.chatbot[from] = true;
    saveUserGroupData(data);
    return reply("🤖 Chatbot has been *enabled*! You can now talk to me here.");
  }

  if (q === "off") {
    if (!data.chatbot[from]) return reply("❎ Chatbot is already *OFF*.");
    delete data.chatbot[from];
    saveUserGroupData(data);
    return reply("🛑 Chatbot has been *disabled* for this chat.");
  }

  reply("⚠️ Invalid option. Use `.chatbot on` or `.chatbot off`.");
});

/* =============================================================
   AUTO CHATBOT RESPONSE HANDLER (PRIVATE ONLY)
   ============================================================= */
module.exports = {
  onLoad: sock => {
    sock.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages[0];
      if (!msg.message) return;

      const chatId = msg.key.remoteJid;
      const fromMe = msg.key.fromMe;
      const isGroup = chatId.endsWith("@g.us");

      if (fromMe || isGroup) return;

      const data = loadUserGroupData();
      if (!data.chatbot[chatId]) return; // chatbot not enabled for this user

      const userMessage =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        "";

      if (!userMessage.trim()) return;

      // Manage user message memory
      if (!chatMemory.has(chatId)) chatMemory.set(chatId, []);
      const messages = chatMemory.get(chatId);
      messages.push(userMessage);
      if (messages.length > 20) messages.shift();
      chatMemory.set(chatId, messages);

      // Typing + delay
      await showTyping(sock, chatId);

      // Get AI response
      const response = await getAIResponse(userMessage);
      await new Promise(r => setTimeout(r, getRandomDelay()));

      // Send reply
      await sock.sendMessage(chatId, { text: response }, { quoted: msg });
    });
  }
};
