const { cmd } = require('../command');
const axios = require('axios');
const moment = require('moment-timezone');

// ===== CONFIG =====
const CHATBASE_API_KEY = "r9cvjohsszysfgtg8ns15f178p2t5vvw"; 
const CHATBASE_BOT_ID = "336LTrQsevExXhPxeod0N";

// Track status per user
let chatbaseToggle = {};

const fakeContact = {
  key: { fromMe: false, participant: "0@s.whatsapp.net", remoteJid: "status@broadcast" },
  message: {
    contactMessage: {
      displayName: "TREND-X | TREND-X",
      vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:TREND-X | TREND-X\nORG:TREND-X;\nTEL;type=CELL;type=VOICE;waid=254700000000:+254 700 000000\nEND:VCARD`,
      jpegThumbnail: Buffer.alloc(0)
    }
  }
};

const getContextInfo = (title, url, thumb) => ({
  externalAdReply: {
    showAdAttribution: true,
    title: title,
    body: "TREND X | Multi-Device WhatsApp Bot",
    thumbnailUrl: thumb || "https://files.catbox.moe/adymbp.jpg",
    sourceUrl: url || "https://github.com/trendex2030/TREND-X"
  },
  forwardingScore: 999,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: '120363401765045963@newsletter',
    newsletterName: 'TREND-X'
  }
});

// === TOGGLE COMMAND ===
cmd({
  pattern: "cbot",
  alias: ["chatbase", "cb"],
  desc: "Toggle Chatbase chatbot (private only)",
  category: "ai",
  react: "🤖",
  filename: __filename
},
async (conn, mek, m, { q, reply }) => {
  if (m.isGroup) return reply("⚠️ Chatbase only works in *private chat*.");

  const userId = m.sender;
  if (!q) return reply("⚙️ Usage:\n\n.cbot on → Enable\n.cbot off → Disable\n.cbot status → Check");

  if (q.toLowerCase() === "on") {
    chatbaseToggle[userId] = true;
    return reply("✅ Chatbase enabled.");
  }
  if (q.toLowerCase() === "off") {
    chatbaseToggle[userId] = false;
    return reply("❌ Chatbase disabled.");
  }
  if (q.toLowerCase() === "status") {
    return reply(`🤖 Chatbase: ${chatbaseToggle[userId] ? "ON ✅" : "OFF ❌"}`);
  }
});

// === HOOK: LISTEN TO ALL PRIVATE MESSAGES ===
cmd({
  on: "message", // special hook to catch every message
  dontAddCommandList: true
},
async (conn, mek, m, { q, reply }) => {
  if (m.isGroup) return;
  if (!chatbaseToggle[m.sender]) return;
  if (!q) return;

  try {
    const res = await axios.post(
      "https://www.chatbase.co/api/v1/chat",
      {
        messages: [{ role: "user", content: q }],
        chatbotId: CHATBASE_BOT_ID,
        stream: false,
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${CHATBASE_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const answer = res.data.text || "⚠️ No response from Chatbase.";
    await conn.sendMessage(m.chat, {
      text: `🤖 *Chatbase:*\n\n${answer}`,
      contextInfo: getContextInfo("Chatbase Reply")
    }, { quoted: fakeContact });

  } catch (e) {
    console.error("Chatbase error:", e.response?.data || e.message);
    reply("❌ Failed to contact Chatbase API.");
  }
});
