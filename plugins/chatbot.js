const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { cmd } = require("../command");

const USER_GROUP_DATA = path.join(__dirname, "../data/userGroupData.json");

// Load & Save user chatbot states
function loadData() {
  try {
    return JSON.parse(fs.readFileSync(USER_GROUP_DATA));
  } catch {
    return { chatbot: {} };
  }
}
function saveData(data) {
  fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
}

// Simulate typing
async function showTyping(conn, chatId) {
  try {
    await conn.presenceSubscribe(chatId);
    await conn.sendPresenceUpdate("composing", chatId);
    await new Promise(r => setTimeout(r, 1500));
  } catch {}
}

/* ==========================================================
   COMMAND: .chatbot on / off
   ========================================================== */
cmd({
  pattern: "chatbot",
  react: "🤖",
  desc: "Enable or disable the private AI chatbot.",
  category: "ai",
  filename: __filename
}, async (conn, m, store, { from, isGroup, q, reply }) => {
  if (isGroup) return reply("❎ This command only works in *private chats*.");

  const data = loadData();

  if (!q) {
    const status = data.chatbot[from] ? "🟢 ON" : "🔴 OFF";
    return reply(`🤖 *Chatbot Control*\n\nUse:\n.chatbot on — Enable chatbot\n.chatbot off — Disable chatbot\n\nStatus: ${status}`);
  }

  if (q === "on") {
    data.chatbot[from] = true;
    saveData(data);
    return reply("✅ Chatbot has been *enabled*! You can now chat with me directly.");
  }

  if (q === "off") {
    delete data.chatbot[from];
    saveData(data);
    return reply("🛑 Chatbot has been *disabled* for this chat.");
  }

  reply("⚠️ Invalid option. Use `.chatbot on` or `.chatbot off`.");
});

/* ==========================================================
   AUTO CHATBOT RESPONSE (PRIVATE CHATS ONLY)
   ========================================================== */
cmd({
  on: "message"
}, async (conn, m, store, { from, isGroup, body }) => {
  if (isGroup || !body || m.key.fromMe) return;

  const data = loadData();
  if (!data.chatbot[from]) return; // chatbot disabled for this user

  try {
    await showTyping(conn, from);
    const res = await axios.get(`https://api.dreaded.site/api/chatgpt?text=${encodeURIComponent(body)}`);

    const answer =
      res.data?.result?.prompt ||
      res.data?.result ||
      res.data?.response ||
      "🤔 I couldn’t think of a good reply just now.";

    await conn.sendMessage(from, { text: answer }, { quoted: m });
  } catch (err) {
    console.error("Chatbot Error:", err.message);
    await conn.sendMessage(from, { text: "⚠️ Something went wrong. Try again later." }, { quoted: m });
  }
});
