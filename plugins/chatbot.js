const axios = require("axios");
const { cmd } = require("../command");

let chatbotOn = false; // chatbot state

cmd({
  pattern: "chatbot",
  desc: "Toggle chatbot ON/OFF or chat with AI in DMs",
  category: "ai",
  react: "🤖",
  filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
  try {
    const isGroup = from.endsWith("@g.us");
    const body =
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      "";

    // If the user runs the command with arguments
    if (args.length > 0) {
      const option = args[0].toLowerCase();
      if (option === "on") {
        chatbotOn = true;
        return reply("✅ Chatbot is now *ON* — I'll reply to your private messages.");
      }
      if (option === "off") {
        chatbotOn = false;
        return reply("❌ Chatbot is now *OFF* — I won't reply to DMs.");
      }
    }

    // If chatbot is ON and message is from a DM, reply via API
    if (chatbotOn && !isGroup) {
      if (!body || body.startsWith(".")) return; // Ignore empty or command messages
      await conn.sendPresenceUpdate("composing", from);

      const apiUrl = `https://api.giftedtech.web.id/api/ai/ai?apikey=gifted&q=${encodeURIComponent(body)}`;
      const { data } = await axios.get(apiUrl);
      const response = data?.result || data?.message || "🤖 AI didn’t respond.";

      await conn.sendMessage(from, { text: response }, { quoted: mek });
    }

  } catch (err) {
    console.error("Chatbot Error:", err);
    reply("❌ Error in chatbot: " + err.message);
  }
});
