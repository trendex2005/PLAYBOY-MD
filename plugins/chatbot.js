/**
 * TREND-XMD Chatbot Plugin
 * =========================
 * Enables group-specific chatbot toggle (.chatbot on/off)
 * and handles AI chat replies when bot is mentioned or replied to.
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

// 🧠 In-memory storage for chat memory and user info
const chatMemory = {
  messages: new Map(),
  userInfo: new Map()
};

// Load / Save group chatbot data
function loadUserGroupData() {
  try {
    return JSON.parse(fs.readFileSync(USER_GROUP_DATA));
  } catch {
    return { groups: [], chatbot: {} };
  }
}
function saveUserGroupData(data) {
  fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
}

// Utility functions
const getRandomDelay = () => Math.floor(Math.random() * 3000) + 2000;
const delay = ms => new Promise(r => setTimeout(r, ms));

async function showTyping(sock, chatId) {
  try {
    await sock.presenceSubscribe(chatId);
    await sock.sendPresenceUpdate('composing', chatId);
    await delay(getRandomDelay());
  } catch {}
}

// Extract name/age/location hints from text
function extractUserInfo(message) {
  const info = {};
  const text = message.toLowerCase();

  if (text.includes('my name is'))
    info.name = message.split(/my name is/i)[1]?.trim().split(' ')[0];
  if (text.includes('i am') && text.includes('years old'))
    info.age = message.match(/\d+/)?.[0];
  if (text.includes('i live in') || text.includes('i am from'))
    info.location = message.split(/(?:i live in|i am from)/i)[1]?.trim().split(/[.,!?]/)[0];

  return info;
}

// 🧩 Command Handler
async function chatbotCommand(sock, chatId, message, args, isOwner) {
  const data = loadUserGroupData();
  const option = args[0];

  if (!option) {
    await showTyping(sock, chatId);
    return sock.sendMessage(chatId, {
      text: `*CHATBOT SETUP*\n\n.chatbot on → Enable chatbot\n.chatbot off → Disable chatbot`,
      quoted: message
    });
  }

  const sender = message.key.participant || message.participant || message.key.remoteJid;
  let isAdmin = false;

  // check admin privilege
  if (chatId.endsWith('@g.us')) {
    try {
      const meta = await sock.groupMetadata(chatId);
      isAdmin = meta.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));
    } catch {}
  }

  if (!isOwner && !isAdmin)
    return sock.sendMessage(chatId, { text: '❌ Admins or Owner only!', quoted: message });

  if (option === 'on') {
    if (data.chatbot[chatId]) return sock.sendMessage(chatId, { text: '✅ Chatbot already active', quoted: message });
    data.chatbot[chatId] = true;
    saveUserGroupData(data);
    return sock.sendMessage(chatId, { text: '*🤖 Chatbot enabled for this group!*', quoted: message });
  }

  if (option === 'off') {
    if (!data.chatbot[chatId]) return sock.sendMessage(chatId, { text: '❌ Chatbot already disabled', quoted: message });
    delete data.chatbot[chatId];
    saveUserGroupData(data);
    return sock.sendMessage(chatId, { text: '*🛑 Chatbot disabled for this group!*', quoted: message });
  }

  return sock.sendMessage(chatId, { text: '❌ Invalid option. Use `.chatbot on/off`', quoted: message });
}

// 💬 Chat AI Response
async function chatbotResponse(sock, chatId, message, text, senderId) {
  const data = loadUserGroupData();
  if (!data.chatbot[chatId]) return;

  const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
  const isReply = message.message?.extendedTextMessage?.contextInfo?.participant === botId;
  const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(botId)
    || text.includes(`@${botId.split('@')[0]}`);

  if (!isReply && !mentioned) return;

  // prepare user memory
  if (!chatMemory.messages.has(senderId)) {
    chatMemory.messages.set(senderId, []);
    chatMemory.userInfo.set(senderId, {});
  }

  const info = extractUserInfo(text);
  if (Object.keys(info).length)
    chatMemory.userInfo.set(senderId, { ...chatMemory.userInfo.get(senderId), ...info });

  const messages = chatMemory.messages.get(senderId);
  messages.push(text);
  if (messages.length > 20) messages.shift();

  await showTyping(sock, chatId);
  const reply = await getAIResponse(text, {
    messages,
    userInfo: chatMemory.userInfo.get(senderId)
  });

  await delay(getRandomDelay());
  await sock.sendMessage(chatId, { text: reply || '😅 Try again, I got confused.' }, { quoted: message });
}

// 🧠 Fetch AI reply from API
async function getAIResponse(userMessage, context) {
  try {
    const prompt = `
You're a real person chatting on WhatsApp, name: Knight Bot.
Short Hinglish replies, casual tone, emojis allowed.
Context:\n${context.messages.join('\n')}
User info: ${JSON.stringify(context.userInfo)}
User: ${userMessage}
You:
`.trim();

    const res = await fetch(`https://api.dreaded.site/api/chatgpt?text=${encodeURIComponent(prompt)}`);
    const data = await res.json();
    return data?.result?.prompt?.trim() || null;
  } catch {
    return null;
  }
}

// 📦 Export as plugin
module.exports = {
  name: 'chatbot',
  alias: ['ai', 'botchat'],
  category: 'ai',
  desc: 'Toggle chatbot on/off and reply with AI when mentioned',
  use: '.chatbot on/off',
  async execute(sock, m, args, { isOwner }) {
    await chatbotCommand(sock, m.chat, m, args, isOwner);
  },
  async onMessage(sock, m, { body, sender }) {
    await chatbotResponse(sock, m.chat, m, body, sender);
  }
};
