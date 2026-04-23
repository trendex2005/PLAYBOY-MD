const getFBInfo = require("@renpwn/fb-downloader");
const { cmd } = require("../command");

const FB_REGEX = /https?:\/\/(?:www\.|m\.|web\.)?(?:facebook\.com|fb\.watch|fb\.me)\/.+/i;

const safeReact = async (conn, mek, emoji) => {
  try {
    await conn.sendMessage(mek.key.remoteJid, {
      react: { text: emoji, key: mek.key }
    });
  } catch (_) {}
};

cmd({
  pattern: "fb",
  alias: ["facebook", "fbdl"],
  desc: "Download Facebook videos",
  category: "downloader",
  filename: __filename,
  use: "<Facebook URL>",
},
async (conn, mek, m, { from, q, reply }) => {
  try {
    // Input validation
    if (!q || !q.trim()) {
      return reply("*🏷️ Please provide a Facebook video link.*\n\nExample:\n*.fb https://www.facebook.com/...*");
    }

    const url = q.trim();

    if (!FB_REGEX.test(url)) {
      return reply("*❌ Invalid Facebook link.*\n\nSupported:\n• facebook.com/...\n• fb.watch/...\n• fb.me/...");
    }

    await safeReact(conn, mek, "📥");

    // Fetch video info using local package — no external API
    let info;
    try {
      info = await getFBInfo(url);
    } catch (err) {
      console.error("[fb] Scraper error:", err.message);
      await safeReact(conn, mek, "❌");
      return reply("*❌ Could not fetch video. The post may be private or the link is invalid.*");
    }

    // Pick HD first, fall back to SD
    const videoUrl = info?.hd || info?.sd;
    const title = info?.title || "Facebook Video";

    if (!videoUrl) {
      await safeReact(conn, mek, "❌");
      return reply("*❌ No downloadable video found. Try a different link.*");
    }

    const caption =
      `📥 *Facebook Video Downloaded*\n\n` +
      `🎬 *${title}*\n\n` +
      `- *Powered By TRENDEX AI ✅*`;

    // Send video
    try {
      await conn.sendMessage(from, {
        video: { url: videoUrl },
        mimetype: "video/mp4",
        caption,
        contextInfo: { mentionedJid: [m.sender] }
      }, { quoted: mek });
    } catch (sendErr) {
      console.error("[fb] Send error:", sendErr.message);
      await safeReact(conn, mek, "❌");
      return reply("*❌ Video could not be sent. It may be too large for WhatsApp.*");
    }

    await safeReact(conn, mek, "✅");

  } catch (e) {
    console.error("[fb] Unhandled error:", e);
    await safeReact(conn, mek, "❌");
    reply(`*❌ An error occurred:* ${e.message || "Unknown error"}`);
  }
});
