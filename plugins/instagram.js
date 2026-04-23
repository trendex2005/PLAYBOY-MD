const axios = require("axios");
const { cmd } = require('../command');

// Prevent duplicate processing
const processedMessages = new Set();

// Valid Instagram URL patterns
const IG_REGEX = /https?:\/\/(?:www\.)?(?:instagram\.com|instagr\.am)\/(p|reel|tv|stories)\/[\w-]+/;

function isValidIgUrl(url) {
  return typeof url === 'string' && IG_REGEX.test(url);
}

function deduplicateMedia(arr) {
  const seen = new Set();
  return (arr || []).filter(m => {
    if (!m?.url || seen.has(m.url)) return false;
    seen.add(m.url);
    return true;
  });
}

function isVideo(media, postUrl = '') {
  return (
    media?.type === 'video' ||
    /\.(mp4|mov|webm)$/i.test(media?.url || '') ||
    /\/(reel|tv)\//.test(postUrl)
  );
}

cmd({
  pattern: "insta",
  alias: ["igdl", "reel", "ig", "instadl"],
  desc: "Download Instagram reels or image posts",
  category: "downloader",
  react: "⏳",
  filename: __filename
},
async (conn, mek, m, { from, q, reply, react }) => {
  // --- Duplicate guard ---
  const msgId = mek?.key?.id;
  if (!msgId) return;
  if (processedMessages.has(msgId)) return;
  processedMessages.add(msgId);
  setTimeout(() => processedMessages.delete(msgId), 5 * 60 * 1000);

  try {
    // --- Input validation ---
    if (!q || !q.trim()) {
      return reply("🏷️ Please provide an Instagram post or reel link.\n\nExample:\n.insta https://www.instagram.com/reel/xxxxx");
    }

    const url = q.trim();

    if (!isValidIgUrl(url)) {
      return reply("❌ Invalid Instagram link.\n\nSupported formats:\n• instagram.com/p/...\n• instagram.com/reel/...\n• instagram.com/tv/...");
    }

    await react("📥");

    // --- API call with timeout ---
    let data;
    try {
      const res = await axios.get("https://delirius-apiofc.vercel.app/download/igv2", {
        params: { url: url },
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      data = res.data;
    } catch (apiErr) {
      await react("❌");
      const reason = apiErr.code === 'ECONNABORTED'
        ? "Request timed out. Try again."
        : apiErr.response?.status === 404
          ? "Post not found. It may have been deleted."
          : apiErr.response?.status === 429
            ? "Too many requests. Please wait and try again."
            : "API is unreachable. Try again later.";
      return reply(`❌ ${reason}`);
    }

    // --- Validate API response ---
    if (!data?.status || !data?.data) {
      await react("❌");
      return reply("❌ Could not fetch media. The post may be private or unavailable.");
    }

    const {
      fullname = "Unknown",
      likes = "N/A",
      comments = "N/A",
      followed = "N/A",
      download = []
    } = data.data;

    // --- Validate media list ---
    const mediaList = deduplicateMedia(download).slice(0, 20);

    if (!mediaList.length) {
      await react("❌");
      return reply("❌ No downloadable media found. The post might be private or unsupported.");
    }

    // --- Build caption ---
    const caption =
      `*❒ Instagram Downloader ❒*\n\n` +
      `👤 *User:* ${fullname}\n` +
      `♥️ *Likes:* ${likes}\n` +
      `💬 *Comments:* ${comments}\n` +
      `👥 *Followers:* ${followed}`;

    // --- Send each media item ---
    let successCount = 0;

    for (let i = 0; i < mediaList.length; i++) {
      const media = mediaList[i];

      if (!media?.url) continue;

      try {
        const mediaType = isVideo(media, url) ? 'video' : 'image';

        await conn.sendMessage(from, {
          [mediaType]: { url: media.url },
          ...(mediaType === 'video' && { mimetype: 'video/mp4' }),
          caption: i === 0 ? caption : '', // Caption only on first item
          contextInfo: { mentionedJid: [m.sender] }
        }, { quoted: mek });

        successCount++;

      } catch (sendErr) {
        console.error(`[insta] Failed to send media ${i + 1}:`, sendErr.message);
        // Keep going — don't crash the whole loop
      }

      // Delay between sends to avoid rate limiting
      if (i < mediaList.length - 1) {
        await new Promise(r => setTimeout(r, 1200));
      }
    }

    // --- Final react ---
    if (successCount === 0) {
      await react("❌");
      return reply("❌ All media failed to send. The files may be too large or unavailable.");
    }

    await react("✅");

  } catch (e) {
    console.error("[insta] Unhandled error:", e);
    try { await react("❌"); } catch (_) {}
    reply(`❌ Unexpected error: ${e.message || "Unknown error"}`);
  }
});
