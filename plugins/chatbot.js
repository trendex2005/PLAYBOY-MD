// ===== chatbot.js =====
// ✅ Full Vinic-Xmd AI system with toggle, memory & auto-reply
// CommonJS version integrated with your command handler

const axios = require("axios");
const { cmd, commands } = require("../command"); // integrated import

// ==== MEMORY & CONFIG ====
const messageMemory = new Map();
let CHATBOT_ENABLED = true; // default ON

// ==== MEMORY HANDLER ====
function updateMemory(chatId, content, isUser) {
  if (!messageMemory.has(chatId)) messageMemory.set(chatId, []);
  messageMemory.get(chatId).push({
    role: isUser ? "user" : "assistant",
    content,
  });

  // keep only last 5 messages
  if (messageMemory.get(chatId).length > 5) {
    messageMemory.set(chatId, messageMemory.get(chatId).slice(-5));
  }
}

// ==== TOGGLE FUNCTIONS ====
function setChatbotState(state) {
  CHATBOT_ENABLED = state;
  return CHATBOT_ENABLED;
}

function getChatbotState() {
  return CHATBOT_ENABLED;
}

function clearChatbotMemory(chatId = null) {
  if (chatId) messageMemory.delete(chatId);
  else messageMemory.clear();
  return true;
}

// ==== MAIN CHATBOT HANDLER ====
async function handleChatbot(m, conn, body, from, isGroup, botNumber, isCmd, prefix) {
  try {
    if (!CHATBOT_ENABLED) {
      console.log("Chatbot: Disabled");
      return false;
    }

    if (!body || m.key.fromMe || body.startsWith(prefix)) {
      console.log("Chatbot: Skipping own message or command");
      return false;
    }

    // Ignore specific numbers
    const senderNumber = m.sender.split("@")[0];
    const ignoredNumbers = ["256742932677", "256755585369"];
    if (ignoredNumbers.includes(senderNumber)) {
      console.log(`🤖 Ignoring ${senderNumber}`);
      return false;
    }

    let shouldRespond = false;

    if (isGroup) {
      const mentionedJids = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const isMentioned = mentionedJids.includes(botNumber);
      const isReplyToBot = m.message?.extendedTextMessage?.contextInfo?.participant === botNumber;

      console.log(`Group mention: ${isMentioned}, replyToBot: ${isReplyToBot}`);
      if (!isMentioned && !isReplyToBot) return false;

      shouldRespond = true;
    } else {
      shouldRespond = true;
    }

    console.log("Chatbot processing:", body);
    await conn.sendPresenceUpdate("composing", from);
    updateMemory(from, body, true);

    const isAskingAboutCreator = /(who made you|who created you|who is your (creator|developer|owner)|who are you|what are you)/i.test(body);
    let response;

    if (isAskingAboutCreator) {
      response = "I am *Vinic-Xmd AI*, created by Kelvin Tech from Uganda — a skilled and visionary developer who brought me to life.";
    } else {
      const context = messageMemory.has(from)
        ? messageMemory.get(from).map(msg => `${msg.role}: ${msg.content}`).join("\n")
        : `user: ${body}`;

      const prompt = `You are Vinic-Xmd AI, a WhatsApp assistant developed by Kelvin Tech from Uganda.
Respond smartly, confidently, and politely.
If insulted, say "Let's begin afresh."

Previous conversation:
${context}

Current message: ${body}

Respond as Vinic-Xmd AI:`;

      const query = encodeURIComponent(prompt);
      const apiUrl = `https://api.giftedtech.web.id/api/ai/ai?apikey=gifted&q=${query}`;
      const { data } = await axios.get(apiUrl);

      response = data?.result || data?.message || "I'm sorry, I couldn't process that. Let's begin afresh.";
    }

    updateMemory(from, response, false);
    const finalResponse = `${response}\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴠɪɴɪᴄ-xᴍᴅ ᴀɪ*`;

    await conn.sendMessage(from, { text: finalResponse }, { quoted: m });
    console.log("Chatbot: Response sent");
    return true;
  } catch (err) {
    console.error("Chatbot Error:", err.message);
    return false;
  }
}

// ==== TOGGLE COMMAND ====
async function toggleChatbotCommand(m, { args, reply }) {
  try {
    const input = (args[0] || "").toLowerCase();

    if (!input) {
      const status = CHATBOT_ENABLED ? "🟢 ON" : "🔴 OFF";
      return reply(`🤖 *Chatbot is currently:* ${status}\n\nUse:\n.chatbot on – enable\n.chatbot off – disable`);
    }

    if (input === "on") {
      setChatbotState(true);
      return reply("✅ *Chatbot has been enabled.*");
    }

    if (input === "off") {
      setChatbotState(false);
      return reply("❌ *Chatbot has been disabled.*");
    }

    return reply("⚙️ Usage:\n.chatbot on – enable\n.chatbot off – disable");
  } catch (err) {
    console.error("Chatbot toggle error:", err);
    return reply("❗ Error while toggling Chatbot.");
  }
}

// ==== REGISTER COMMAND ====
cmd({
  pattern: "chatbot",
  alias: ["cb", "botchat", "chatai"],
  desc: "Toggle or interact with Vinic-Xmd AI Chatbot",
  category: "settings",
  async run(m, conn, args, prefix, isCmd, isGroup, botNumber, reply) {
    if (args.length > 0) {
      await toggleChatbotCommand(m, { args, reply });
    } else {
      await handleChatbot(m, conn, m.body, m.chat, isGroup, botNumber, isCmd, prefix);
    }
  },
});
