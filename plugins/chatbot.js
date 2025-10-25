const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { cmd } = require("../command");

const USER_GROUP_DATA = path.join(__dirname, "../data/userGroupData.json");

// --- Helpers ---
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

async function getAIResponse(query) {
  try {
    const res = await axios.get(
      `https://api.dreaded.site/api/chatgpt?text=${encodeURIComponent(query)}`
    );
    return res.data?.result?.prompt || res.data?.result || res.data?.response;
  } catch (err) {
    console.error("AI API error:", err.message);
    return null;
  }
}

// --- .chatbot on/off command ---
cmd({
  pattern: "chatbot",
  react: "🤖",
  desc: "Enable or disable AI chatbot in private chat.",
  category: "ai",
  filename: __filename
}, async (conn, m, store, { from, isGroup, q, reply }) => {
  if (isGroup) return reply("❎ This command works only in *private chats*.");

  const data = loadData();

  if (!q) {
    const status = data.chatbot[from] ? "🟢 ON" : "🔴 OFF";
    return reply(`🤖 *Chatbot Control*\n\nUse:\n.chatbot on — Enable chatbot\n.chatbot off — Disable chatbot\n\nCurrent Status: ${status}`);
  }

  if (q === "on") {
    data.chatbot[from] = true;
    saveData(data);
    return reply("✅ Chatbot enabled! You can now talk to me here.");
  }

  if (q === "off") {
    delete data.chatbot[from];
    saveData(data);
    return reply("🛑 Chatbot disabled for this chat.");
  }

  reply("⚠️ Invalid command. Use `.chatbot on` or `.chatbot off`.");
});

// --- Auto chatbot replies (only in private) ---
cmd({
  pattern: "auto-chatbot",
  dontAddCommandList: true,
  filename: __filename
}, async (conn, m, store, { from, body, isGroup, reply }) => {
  try {
    if (isGroup || !body || m.key.fromMe) return;

    const data = loadData();
    if (!data.chatbot[from]) return;

    const answer = await getAIResponse(body);
    if (!answer) return reply("⚠️ Couldn't get a response. Try again later.");

    await conn.sendMessage(from, { text: answer }, { quoted: m });
  } catch (err) {
    console.error("Chatbot response error:", err);
    reply("❌ Error getting response.");
  }
});
