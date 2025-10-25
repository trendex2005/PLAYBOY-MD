const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { cmd } = require('../command');

const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

// In-memory chat memory
const chatMemory = {
  messages: new Map(),
  userInfo: new Map()
};

// Load/save data
function loadUserData() {
  try {
    return JSON.parse(fs.readFileSync(USER_GROUP_DATA));
  } catch {
    return { chatbot: {} };
  }
}

function saveUserData(data) {
  fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
}

// Simulated typing indicator
function getRandomDelay() {
  return Math.floor(Math.random() * 3000) + 2000;
}

async function showTyping(sock, chatId) {
  try {
    await sock.presenceSubscribe(chatId);
    await sock.sendPresenceUpdate('composing', chatId);
    await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
  } catch (e) {
    console.error('Typing indicator error:', e.message);
  }
}

// Extract simple user info from chat
function extractUserInfo(message) {
  const info = {};
  const text = message.toLowerCase();

  if (text.includes('my name is'))
    info.name = text.split('my name is')[1].trim().split(' ')[0];

  if (text.includes('i am') && text.includes('years old'))
    info.age = text.match(/\d+/)?.[0];

  if (text.includes('i live in') || text.includes('i am from'))
    info.location = text.split(/(?:i live in|i am from)/i)[1].trim().split(/[.,!?]/)[0];

  return info;
}

// Get AI response
async function getAIResponse(query) {
  try {
    const res = await fetch(`https://api.dreaded.site/api/chatgpt?text=${encodeURIComponent(query)}`);
    const json = await res.json();
    return json?.result?.prompt || json?.result || json?.response || null;
  } catch (e) {
    console.error('AI API Error:', e.message);
    return null;
  }
}

/* =======================================================================
   COMMAND: .chatbot on/off  (PRIVATE ONLY)
   ======================================================================= */
cmd({
  pattern: 'chatbot',
  alias: ['cb'],
  react: '🤖',
  desc: 'Enable or disable chatbot in private chat.',
  category: 'ai',
  filename: __filename
}, async (conn, m, store, { from, isGroup, q, reply }) => {
  if (isGroup) return reply('❎ This command only works in *private chats*.');

  const data = loadUserData();

  if (!q) {
    return reply(
      '*🤖 Chatbot Control Panel*\n\n' +
      '`.chatbot on` — Enable chatbot\n' +
      '`.chatbot off` — Disable chatbot\n\n' +
      `🟢 Status: *${data.chatbot[from] ? 'ON' : 'OFF'}*`
    );
  }

  if (q === 'on') {
    if (data.chatbot[from]) return reply('✅ Chatbot is already *ON* for you.');
    data.chatbot[from] = true;
    saveUserData(data);
    return reply('🤖 Chatbot has been *enabled*! You can now chat with me directly.');
  }

  if (q === 'off') {
    if (!data.chatbot[from]) return reply('❎ Chatbot is already *OFF* for you.');
    delete data.chatbot[from];
    saveUserData(data);
    return reply('🛑 Chatbot has been *disabled*. I will stop replying until you turn it back on.');
  }

  reply('⚠️ Invalid option. Use `.chatbot on` or `.chatbot off`.');
});

/* =======================================================================
   AUTO CHATBOT RESPONSE (PRIVATE ONLY)
   ======================================================================= */
cmd({
  on: 'message'
}, async (conn, m, store, { from, body, isGroup }) => {
  if (isGroup || !body || m.key.fromMe) return;

  const data = loadUserData();
  if (!data.chatbot[from]) return;

  // Initialize memory
  if (!chatMemory.messages.has(from)) {
    chatMemory.messages.set(from, []);
    chatMemory.userInfo.set(from, {});
  }

  // Extract user info
  const info = extractUserInfo(body);
  if (Object.keys(info).length) {
    chatMemory.userInfo.set(from, {
      ...chatMemory.userInfo.get(from),
      ...info
    });
  }

  // Save message history (limit to last 10)
  const messages = chatMemory.messages.get(from);
  messages.push(body);
  if (messages.length > 10) messages.shift();
  chatMemory.messages.set(from, messages);

  // Simulate human typing
  await showTyping(conn, from);

  // Get AI reply
  const response = await getAIResponse(body);

  if (!response) {
    return conn.sendMessage(from, { text: "😅 Sorry, I'm having trouble responding right now. Try again later." }, { quoted: m });
  }

  // Small natural delay
  await new Promise(resolve => setTimeout(resolve, getRandomDelay()));

  // Send response
  await conn.sendMessage(from, { text: response }, { quoted: m });
});
