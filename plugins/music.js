const axios = require("axios");
const { cmd } = require("../command");

cmd(
  {
    pattern: "play",
    alias: ["song", "ytplay"],
    desc: "Download and play music from YouTube",
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
      await reply("🔎 Searching for your song... Please wait");

      // 🔎 STEP 1: Search YouTube
      const searchApi = `https://api.giftedtech.co.ke/api/search/ytsearch?apikey=gifted&query=${encodeURIComponent(
        text
      )}`;

      const searchRes = await axios.get(searchApi, { timeout: 60000 });
      const searchData = searchRes.data;

      if (!searchData || !searchData.result || !searchData.result[0]) {
        return reply("❌ Song not found.");
      }

      const video = searchData.result[0];
      const videoUrl = video.url;

      // 🎵 STEP 2: Download MP3
      const downloadApi = `https://api.giftedtech.co.ke/api/download/ytmp3?apikey=gifted&url=${encodeURIComponent(
        videoUrl
      )}`;

      const res = await axios.get(downloadApi, { timeout: 60000 });
      const data = res.data;

      if (!data || !data.result || !data.result.downloadUrl) {
        return reply("❌ Failed to download audio.");
      }

      const audioUrl = data.result.downloadUrl;
      const title = data.result.title || video.title || text;
      const duration = data.result.duration || video.duration || "Unknown";
      const thumbnail =
        data.result.thumbnail ||
        video.thumbnail ||
        `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;

      // 🖼 Send Song Info
      await malvin.sendMessage(
        m.chat,
        {
          image: { url: thumbnail },
          caption:
            `🎶 *Now Playing — TREND-X AI*\n\n` +
            `🎵 *Title:* ${title}\n` +
            `⏱ *Duration:* ${duration}\n` +
            `📺 *YouTube:* ${videoUrl}\n\n` +
            `🔥 Powered by TRENDEX AI`,
        },
        { quoted: mek }
      );

      // 🔊 Send MP3
      await malvin.sendMessage(
        m.chat,
        {
          audio: { url: audioUrl },
          mimetype: "audio/mpeg",
          fileName: `${title}.mp3`,
        },
        { quoted: mek }
      );
    } catch (err) {
      console.error("PLAY ERROR:", err.response?.data || err.message);

      reply(
        `⚠️ Error fetching song:\n${
          err.response?.data
            ? JSON.stringify(err.response.data)
            : err.message
        }`
      );
    }
  }
);
