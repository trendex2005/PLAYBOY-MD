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

      // ✅ Step 1: Search YouTube using YouTube oEmbed + scrape-free API
      let videoUrl = null;
      let searchTitle = text;
      let searchThumbnail = null;

      try {
        const searchRes = await axios.get(
          `https://www.youtube.com/results?search_query=${encodeURIComponent(text)}`,
          {
            timeout: 15000,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          }
        );

        const html = searchRes.data;
        const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
        if (!match) return reply("❌ Couldn't find that song on YouTube.");

        const videoId = match[1];
        videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        searchThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

        // Try to get title
        const titleMatch = html.match(/"title":"([^"]+)"/);
        if (titleMatch) searchTitle = titleMatch[1];

        console.log("Found video:", videoUrl, searchTitle);
      } catch (searchErr) {
        console.error("Search error:", searchErr.message);
        return reply(`❌ Search failed: ${searchErr.message}`);
      }

      await reply(`✅ Found: ${searchTitle}\n⬇️ Now downloading...`);

      // ✅ Step 2: Download using Vreden API with real YouTube URL
      try {
        const downloadApiUrl = `https://api.vreden.my.id/api/v1/download/youtube/audio?url=${encodeURIComponent(videoUrl)}`;
        console.log("Downloading from:", downloadApiUrl);

        const res = await axios.get(downloadApiUrl, { timeout: 60000 });
        console.log("Download response:", JSON.stringify(res.data, null, 2));

        const data = res.data;

        if (!data || data.status === false || !data.result) {
          return reply(`❌ Download failed. Response:\n${JSON.stringify(data)}`);
        }

        const result = data.result;
        const audioUrl = result.downloadUrl;

        if (!audioUrl) {
          return reply(`❌ No audio URL returned. Result:\n${JSON.stringify(result)}`);
        }

        const formatDuration = (s) =>
          `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

        const title = result.title || searchTitle;
        const duration = result.duration ? formatDuration(result.duration) : "Unknown";
        const thumbnail =
          result.thumbnail ||
          searchThumbnail ||
          `https://img.youtube.com/vi/default/hqdefault.jpg`;

        // ✅ Send thumbnail + info
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

        // ✅ Send MP3
        await malvin.sendMessage(
          m.chat,
          {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: `${title}.mp3`,
          },
          { quoted: mek }
        );

      } catch (downloadErr) {
        console.error("Download error:", downloadErr.message);
        return reply(`❌ Download step failed: ${downloadErr.message}`);
      }

    } catch (err) {
      console.error("play.js error:", err.message);
      reply(`⚠️ Unexpected error: ${err.message}`);
    }
  }
);
