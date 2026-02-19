const ytdl = require("ytdl-core");
const yts = require("yt-search");
const { cmd } = require("../command");

cmd(
  {
    pattern: "play",
    alias: ["song", "ytplay"],
    desc: "Download song from YouTube",
    category: "downloader",
    filename: __filename,
  },
  async (malvin, mek, m, { args, reply }) => {
    const text =
      (args && args.length ? args.join(" ") : null) ||
      (m?.quoted?.text ? m.quoted.text : null);

    if (!text)
      return reply("❌ Please enter a song name!\n\nExample: .play Alone");

    try {
      await reply("🔎 Searching YouTube...");

      // 🔎 Search YouTube
      const search = await yts(text);
      const video = search.videos[0];

      if (!video) return reply("❌ Song not found.");

      await reply("⬇️ Downloading audio...");

      const stream = ytdl(video.url, {
        filter: "audioonly",
        quality: "highestaudio",
      });

      // 🖼 Send Thumbnail + Info
      await malvin.sendMessage(
        m.chat,
        {
          image: { url: video.thumbnail },
          caption:
            `🎶 *Now Playing — TREND-X AI*\n\n` +
            `🎵 *Title:* ${video.title}\n` +
            `⏱ *Duration:* ${video.timestamp}\n` +
            `📺 *Views:* ${video.views}\n` +
            `🔗 *URL:* ${video.url}`,
        },
        { quoted: mek }
      );

      // 🔊 Send Audio
      await malvin.sendMessage(
        m.chat,
        {
          audio: stream,
          mimetype: "audio/mpeg",
          fileName: `${video.title}.mp3`,
        },
        { quoted: mek }
      );
    } catch (err) {
      console.error("PLAY ERROR:", err);
      reply("⚠️ Failed to download song. Try another song.");
    }
  }
);
