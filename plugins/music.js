const axios = require("axios");
const yts = require("yt-search");
const { cmd } = require("../command");

cmd(
  {
    pattern: "play",
    alias: ["song", "ytplay"],
    desc: "Download YouTube MP3 using bk9 API",
    category: "downloader",
    filename: __filename,
  },
  async (malvin, mek, m, { args, reply }) => {
    const query = args.join(" ");

    if (!query)
      return reply("❌ Please enter a song name!\n\nExample: .play Alone");

    try {
      await reply("🔎 Searching for song...");

      // 1️⃣ Search YouTube
      const search = await yts(query);
      const video = search.videos[0];

      if (!video) return reply("❌ Song not found.");

      await reply("⬇️ Converting to MP3...");

      // 2️⃣ Send video URL to bk9 API
      const apiUrl = `https://api.bk9.dev/download/ytmp3?url=${encodeURIComponent(
        video.url
      )}`;

      const res = await axios.get(apiUrl, { timeout: 60000 });
      const data = res.data;

      console.log("BK9 RESPONSE:", data); // debug

      if (!data || !data.url)
        return reply("❌ API failed to return audio.");

      const downloadUrl = data.url;

      // 3️⃣ Send thumbnail + info
      await malvin.sendMessage(
        m.chat,
        {
          image: { url: video.thumbnail },
          caption:
            `🎶 *Now Playing*\n\n` +
            `🎵 *Title:* ${video.title}\n` +
            `⏱ *Duration:* ${video.timestamp}\n` +
            `🔗 *YouTube:* ${video.url}`,
        },
        { quoted: mek }
      );

      // 4️⃣ Send audio
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
      console.error("PLAY ERROR:", err.response?.data || err.message);
      reply("⚠️ Failed to download song. Try another song.");
    }
  }
);
