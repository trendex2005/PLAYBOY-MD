// plugins/play.js
const axios = require("axios");
const { cmd } = require("../command");

cmd(
  {
    pattern: "play",
    alias: ["song", "ytplay"],
    desc: "Play music from YouTube",
    category: "downloader",
    filename: __filename,
  },
  async (malvin, mek, m, { args, reply }) => {
    const text =
      (args && args.length ? args.join(" ") : null) ||
      (m?.quoted?.text ? m.quoted.text : null);

    if (!text) return reply("❌ Please enter a song name!\n\nExample: .play Alone");
    if (text.length > 200) return reply("❌ Query too long. Keep it under 200 characters.");

    try {
      await reply("🔎 Searching for your song... please wait");

      // ✅ Step 1: Search YouTube for the song
      const searchUrl = `https://api.vreden.my.id/api/v1/search/youtube?q=${encodeURIComponent(text)}`;
      const searchRes = await axios.get(searchUrl, { timeout: 30000 });

      console.log("SEARCH RESPONSE:", JSON.stringify(searchRes.data, null, 2));

      const searchResult = searchRes.data?.result?.[0];
      if (!searchResult) return reply("❌ No YouTube results found for: " + text);

      const videoUrl = searchResult.url;
      if (!videoUrl) return reply("❌ Couldn't get video URL from search.");

      await reply("⬇️ Found! Now downloading...");

      // ✅ Step 2: Download audio using the real YouTube URL
      const downloadUrl = `https://api.vreden.my.id/api/v1/download/youtube/audio?url=${encodeURIComponent(videoUrl)}`;
      const res = await axios.get(downloadUrl, { timeout: 60000 });

      console.log("DOWNLOAD RESPONSE:", JSON.stringify(res.data, null, 2));

      const data = res.data;
      if (!data || data.status === false || !data.result) {
        return reply("❌ Couldn't download that song. Try a different name.");
      }

      const result = data.result;
      const audioUrl = result.downloadUrl;

      if (!audioUrl) return reply("❌ API didn't return any audio link.");

      const formatDuration = (s) =>
        `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

      const title = result.title || searchResult.title || text;
      const duration = result.duration ? formatDuration(result.duration) : "Unknown";
      const thumbnail =
        result.thumbnail ||
        searchResult.thumbnail ||
        (result.videoId ? `https://img.youtube.com/vi/${result.videoId}/hqdefault.jpg` : null) ||
        "https://img.youtube.com/vi/default/hqdefault.jpg";

      // ✅ Send song info with thumbnail
      await malvin.sendMessage(
        m.chat,
        {
          image: { url: thumbnail },
          caption:
            `🎶 *Now Playing* — NovaCore AI\n\n` +
            `🎵 *Title:* ${title}\n` +
            `⏱ *Duration:* ${duration}\n` +
            `📺 *YouTube:* ${videoUrl}\n\n` +
            `🔥 Brought to you by *NovaCore AI*`,
        },
        { quoted: mek }
      );

      // ✅ Send MP3 audio
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
      console.error("play.js error:", err.message);
      reply("⚠️ Something went wrong. Please try again later.");
    }
  }
);
