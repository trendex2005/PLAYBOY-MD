const axios = require("axios");
const { cmd } = require("../command");

const safeReact = async (conn, mek, emoji) => {
  try {
    await conn.sendMessage(mek.key.remoteJid, {
      react: { text: emoji, key: mek.key }
    });
  } catch (_) {}
};

const FB_REGEX = /https?:\/\/(?:www\.|m\.|web\.)?(?:facebook\.com|fb\.watch|fb\.me)\/.+/i;

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

    // API call
    let data;
    try {
      const res = await axios.get("https://apiskeith.top/download/fbdown", {
        params: { url },
        timeout: 20000
      });
      data = res.data;
    } catch (apiErr) {
      await safeReact(conn, mek, "❌");
      const reason = apiErr.code === 'ECONNABORTED'
        ? "Request timed out. Try again."
        : apiErr.response?.status === 429
          ? "Too many requests. Please wait and try again."
          : "API is unreachable. Try again later.";
      return reply(`*❌ ${reason}*`);
    }

    // Validate response
    if (!data?.status || !data?.data?.url) {
      await safeReact(conn, mek, "❌");
      return reply("*❌ Failed to fetch video. The link may be private or unsupported.*");
    }

    // Send video
    try {
      await conn.sendMessage(from, {
        video: { url: data.data.url },
        mimetype: 'video/mp4',
        caption: "📥 *Facebook Video Downloaded*\n\n- *Powered By TRENDEX AI ✅*",
        contextInfo: { mentionedJid: [m.sender] }
      }, { quoted: mek });
    } catch (sendErr) {
      console.error("[fb] Send failed:", sendErr.message);
      await safeReact(conn, mek, "❌");
      return reply("*❌ Video could not be sent. It may be too large.*");
    }

    await safeReact(conn, mek, "✅");

  } catch (e) {
    console.error("[fb] Unhandled error:", e);
    await safeReact(conn, mek, "❌");
    reply(`*❌ An error occurred:* ${e.message || "Unknown error"}`);
  }
});
