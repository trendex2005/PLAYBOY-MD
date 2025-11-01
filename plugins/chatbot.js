const axios = require("axios");
const { cmd } = require("../command");

let chatbotActive = false; // state tracker

cmd({
  pattern: "chatbot",
  desc: "Turn chatbot ON or OFF (only works in DMs)",
  category: "ai",
  react: "🤖",
  filename: __filename
},
async (conn, mek, m, { args, reply }) => {
  const state = (args[0] || "").toLowerCase();

  if (state === "on") {
    chatbotActive = true;
    reply("✅ Chatbot is now *ON* — I’ll reply to private messages.");
  } else if (state === "off") {
    chatbotActive = false;
    reply("❌ Chatbot is now *OFF* — I’ll stop replying.");
  } else {
    reply("Usage: `.chatbot on` or `.chatbot off`");
  }
});

// ✅ Auto listener (does not depend on prefix)
setTimeout(() => {
  try {
    if (!global.conn) return console.log("Chatbot: conn not ready yet");

    global.conn.ev.on("messages.upsert", async (msgUpdate) => {
      try {
        const msg = msgUpdate.messages[0];
        if (!msg.message) return;
        const from = msg.key.remoteJid;
        const isGroup = from.endsWith("@g.us");
        const isFromMe = msg.key.fromMe;

        // Only DM, chatbot ON, and not self
        if (chatbotActive && !isGroup && !isFromMe) {
          const text =
            msg.message.conversation ||
            msg.message?.extendedTextMessage?.text ||
            "";

          if (!text || text.startsWith(".")) return;

          await global.conn.sendPresenceUpdate("composing", from);

          const apiUrl = `https://api.giftedtech.web.id/api/ai/ai?apikey=gifted&q=${encodeURIComponent(text)}`;
          const { data } = await axios.get(apiUrl);
          const response = data?.result || data?.message || "🤖 No response from AI.";

          await global.conn.sendMessage(from, { text: response }, { quoted: msg });
        }
      } catch (err) {
        console.error("Chatbot DM Error:", err.message);
      }
    });

    console.log("✅ Chatbot listener attached successfully");
  } catch (err) {
    console.error("Chatbot init error:", err.message);
  }
}, 8000);
