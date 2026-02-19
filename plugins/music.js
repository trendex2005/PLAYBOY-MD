const axios = require("axios");
const yts = require("yt-search");
const { cmd } = require("../command");

cmd(
  {
    pattern: "play",
    alias: ["song"],
    desc: "Download song via API",
    category: "downloader",
    filename: __filename,
  },
  async (malvin, mek, m, { args, reply }) => {
    const text = args.join(" ");
    if (!text) return reply("❌ Enter song name!");

    try {
      await reply("🔎 Searching...");

      // Step 1: Search YouTube
      const search = await yts(text);
      const video = search.videos[0];
      if (!video) return reply("❌ Song not found.");

      await reply("⬇️ Converting to MP3...");

      // Step 2: Use API converter
      const apiUrl = `https://api.bk9.dev/download/ytmp3?url=${video.url}`;

      const res = await axios.get(apiUrl);
      const data = res.data;

      if (!data.status) return reply("❌ API failed.");

      const downloadUrl = data.result.download.url;

      // Send info
      await malvin.sendMessage(
        m.chat,
        {
          image: { url: video.thumbnail },
          caption:
            `🎶 *Now Playing*\n\n` +
            `🎵 ${video.title}\n` +
            `⏱ ${video.timestamp}`,
        },
        { quoted: mek }
      );

      // Send audio
      await malvin.sendMessage(
        m.chat,
        {
          audio: { url: downloadUrl },
          mimetype: "audio/mpeg",
          fileName: `${video.title}.mp3`,
        },
        { quoted: mek }
      );
    } catch (err) {
      console.log(err.message);
      reply("⚠️ API Error. Try again later.");
    }
  }
);
