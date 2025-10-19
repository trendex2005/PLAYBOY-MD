const { cmd } = require('../command');
const config = require("../config");

// Anti-Link System
const linkPatterns = [
  /https?:\/\/(?:chat\.whatsapp\.com|wa\.me)\/\S+/gi,
  /^https?:\/\/(www\.)?whatsapp\.com\/channel\/([a-zA-Z0-9_-]+)$/,
  /wa\.me\/\S+/gi,
  /https?:\/\/(?:t\.me|telegram\.me)\/\S+/gi,
  /https?:\/\/(?:www\.)?youtube\.com\/\S+/gi,
  /https?:\/\/youtu\.be\/\S+/gi,
  /https?:\/\/(?:www\.)?facebook\.com\/\S+/gi,
  /https?:\/\/fb\.me\/\S+/gi,
  /https?:\/\/(?:www\.)?instagram\.com\/\S+/gi,
  /https?:\/\/(?:www\.)?twitter\.com\/\S+/gi,
  /https?:\/\/(?:www\.)?tiktok\.com\/\S+/gi,
  /https?:\/\/(?:www\.)?linkedin\.com\/\S+/gi,
  /https?:\/\/(?:www\.)?snapchat\.com\/\S+/gi,
  /https?:\/\/(?:www\.)?pinterest\.com\/\S+/gi,
  /https?:\/\/(?:www\.)?reddit\.com\/\S+/gi,
  /https?:\/\/ngl\/\S+/gi,
  /https?:\/\/(?:www\.)?discord\.com\/\S+/gi,
  /https?:\/\/(?:www\.)?twitch\.tv\/\S+/gi,
  /https?:\/\/(?:www\.)?vimeo\.com\/\S+/gi,
  /https?:\/\/(?:www\.)?dailymotion\.com\/\S+/gi,
  /https?:\/\/(?:www\.)?medium\.com\/\S+/gi
];

cmd({
    on: "body"
}, async (conn, m, store, { from, body, sender, isGroup, isAdmins, isBotAdmins, reply }) => {
  try {
    if (!isGroup || isAdmins || !isBotAdmins || sender === conn.user?.id) return;

    const text = body.toLowerCase();
    const hasBadWord = config.ANTI_BAD_WORD === "true" && badWords.some(word => text.includes(word));
    const hasLink = config.ANTI_LINK === "true" && linkPatterns.some(pattern => pattern.test(body));

    if (hasBadWord) {
      await conn.sendMessage(from, { delete: m.key });
      await conn.sendMessage(from, {
        text: `🚫 *Bad language is not allowed!*\n@${sender.split('@')[0]}`,
        mentions: [sender]
      }, { quoted: m });
      return;
    }

    if (hasLink) {
      await conn.sendMessage(from, { delete: m.key });
      await conn.sendMessage(from, {
        text: `⚠️ *Links are not allowed in this group!*\n@${sender.split('@')[0]} has been removed.`,
        mentions: [sender]
      }, { quoted: m });

      await conn.groupParticipantsUpdate(from, [sender], "remove");
    }
  } catch (error) {
    console.error(error);
    reply("❌ Error while processing message.");
  }
});
