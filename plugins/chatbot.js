const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { cmd } = require("../command");

const USER_GROUP_DATA = path.join(__dirname, "../data/userGroupData.json");

// Load & Save chatbot status
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

// Random delay for typing simulation
function randomDelay() {
  return Math.floor(Math.random() * 2000) + 1000;
}

async function showTyping(conn, chatId) {
  try {
    await conn.presenceSubscribe(chatId);
    await conn.sendPresenceUpdate("composing", chatId);
    await new Promise(resolve => setTimeout(resolve, randomDelay()));
  } catch {}
}

// === MAIN COMMAND ===
cmd({
  pattern: "chatbot",
  alias: ["cb"],
  react: "🤖",
  desc: "Enable or disable chatbot in private chats.",
  category: "ai",
  filename: __filename
}, async (conn, m, store, { from, isGroup, q, reply }) => {
  const data = loadData();

  if (isGroup) return reply("❎ This command only works in *private chats*.");

  if (!q) {
    const status = data.chatbot[from] ? "🟢 ON" : "🔴 OFF";
    return reply(
      `*🤖 CHATBOT CONTROL PANEL*\n\nUse:\n.chatbot on — Enable chatbot\n.chatbot off — Disable chatbot\n\nStatus: ${status}`
    );
  }

  if (q === "on") {
    data.chatbot[from] = true;
    saveData(data);
    return reply("✅ Chatbot has been *enabled*! You can now talk to me here.");
  }

  if (q === "off") {
    delete data.chatbot[from];
    saveData(data);
    return reply("🛑 Chatbot has been *disabled* in this chat.");
  }

  reply("⚠️ Invalid option. Use `.chatbot on` or `.chatbot off`.");
});

// === AUTO RESPONSE HANDLER ===
cmd({
  on: "message"
}, async (conn, m, store) => {
  const data = loadData();
  const from = m.key.remoteJid;
  const isGroup = from.endsWith("@g.us");

  // Only respond in private chats
  if (isGroup) return;
  if (!data.chatbot[from]) return; // chatbot off
  if (m.key.fromMe) return;

  const text =
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    "";

  if (!text.trim()) return;

  await showTyping(conn, from);

  try {
    const response = await axios.get(
      `https://api.dreaded.site/api/chatgpt?text=${encodeURIComponent(text)}`
    );

    const answer =
      response.data?.result?.prompt ||
      response.data?.result ||
      "🤖 I'm not sure how to respond to that.";

    await new Promise(r => setTimeout(r, randomDelay()));

    await conn.sendMessage(from, { text: answer }, { quoted: m });
  } catch (error) {
    console.error("Chatbot API Error:", error);
    await conn.sendMessage(from, { text: "⚠️ I had trouble thinking just now. Try again later." }, { quoted: m });
  }
});
