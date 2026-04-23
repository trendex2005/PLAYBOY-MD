const { igdl } = require('ruhend-scraper');
const { cmd, commands } = require('../command');

// Prevent duplicate processing
const processedMessages = new Set();

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
    /\.(mp4|mov|avi|mkv|webm)$/i.test(media?.url || '') ||
    /\/(reel|tv)\//.test(postUrl)
  );
}

const safeReact = async (conn, mek, react, emoji) => {
  try {
    if (typeof react === 'function') {
      await react(emoji);
    } else {
      await conn.sendMessage(mek.key.remoteJid, {
        react: { text: emoji, key: mek.key }
      });
    }
  } catch (_) {}
};

cmd({
  pattern: "insta",
  alias: ["igdl", "reel", "ig", "instadl"],
  desc: "Download Instagram reels or image posts",
  category: "downloader",
  react: "⏳",
  filename: __filename
},
async (conn, mek, m, { from, args, q, reply, react }) => {

  // Duplicate guard
  const msgId = mek?.key?.id;
  if (!msgId) return;
  if (processedMessages.has(msgId)) return;
  processedMessages.add(msgId);
  setTimeout(() => processedMessages.delete(msgId), 5 * 60 * 1000);

  try {
    // Input validation
    if (!q || !q.trim()) {
      return reply("*🏷️ ᴘʟᴇᴀsᴇ ᴘʀᴏᴠɪᴅᴇ ᴀɴ ɪɴsᴛᴀɢʀᴀᴍ ᴘᴏsᴛ ᴏʀ ʀᴇᴇʟ ʟɪɴᴋ.*");
    }

    const url = q.trim();

    if (!url.includes("instagram.com") && !url.includes("instagr.am")) {
      return reply("*❌ Invalid Instagram link.*");
    }

    await safeReact(conn, mek, react, "📥");

    // Fetch media using ruhend-scraper
    let downloadData;
    try {
      downloadData = await igdl(url);
    } catch (scraperErr) {
      console.error("[insta] Scraper error:", scraperErr.message);
      await safeReact(conn, mek, react, "❌");
      return reply("*❌ Failed to fetch media. The post may be private or the link is invalid.*");
    }

    // Validate scraper response
    if (!downloadData?.data?.length) {
      await safeReact(conn, mek, react, "❌");
      return reply("*❌ No media found. The post may be private, deleted, or unsupported.*");
    }

    // Deduplicate and limit
    const mediaList = deduplicateMedia(downloadData.data).slice(0, 20);

    if (!mediaList.length) {
      await safeReact(conn, mek, react, "❌");
      return reply("*❌ No valid media could be extracted.*");
    }

    const captionText =
      `*❒ TREND-X ᴠɪᴅᴇᴏ ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ ❒*`;

    let sent = 0;

    for (let i = 0; i < mediaList.length; i++) {
      const media = mediaList[i];
      if (!media?.url) continue;

      try {
        const mediaIsVideo = isVideo(media, url);

        await conn.sendMessage(from, {
          [mediaIsVideo ? 'video' : 'image']: { url: media.url },
          ...(mediaIsVideo && { mimetype: 'video/mp4' }),
          caption: i === 0 ? captionText : '',
          contextInfo: { mentionedJid: [m.sender] }
        }, { quoted: mek });

        sent++;

      } catch (sendErr) {
        console.error(`[insta] Media ${i + 1} failed:`, sendErr.message);
        // Continue with next item
      }

      // Delay between sends
      if (i < mediaList.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (sent === 0) {
      await safeReact(conn, mek, react, "❌");
      return reply("*❌ All media failed to send. Files may be too large or expired.*");
    }

    await safeReact(conn, mek, react, "✅");

  } catch (e) {
    console.error("[insta] Unhandled error:", e);
    await safeReact(conn, mek, react, "❌");
    reply(`*❌ An error occurred:* ${e.message || "Unknown error"}`);
  }
});
