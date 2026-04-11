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

      // ✅ Step 1: Search YouTube
      let videoUrl = null;
      let searchTitle = text;
      let searchThumbnail = null;

      try {
        const searchUrl = `https://api.vreden.my.id/api/v1/search/youtube?q=${encodeURIComponent(text)}`;
        console.log("Searching:", searchUrl);
        const searchRes = await axios.get(searchUrl, { timeout: 30000 });
        console.log("Search result:", JSON.stringify(searchRes.data, null, 2));

        const searchResult = searchRes.data?.result?.[0];
        videoUrl = searchResult?.url;
        searchTitle = searchResult?.title || text;
        searchThumbnail = searchResult?.thumbnail || null;

        if (!videoUrl) {
          return reply(`❌ Search failed. API response:\n${JSON.stringify(searchRes.data)}`);
        }
      } catch (searchErr) {
        console.error("Search error:", searchErr.message);
        return reply(`❌ Search step failed: ${searchErr.message}`);
      }

      await reply(`✅ Found: ${searchTitle}\n⬇️ Now downloading...`);

      // ✅ Step 2: Download audio
      try {
        const downloadUrl = `https://api.vreden.my.id/api/v1/download/youtube/audio?url=${encodeURIComponent(videoUrl)}`;
        console.log("Downloading:", downloadUrl);
        const res = await axios.get(downloadUrl, { timeout: 60000 });
        console.log("Download result:", JSON.stringify(res.data, null, 2));

        const data = res.data;

        if (!data || data.status === false || !data.result) {
          return reply(`❌ Download API failed. Response:\n${JSON.stringify(data)}`);
        }

        const result = data.result;
        const audioUrl = result.downloadUrl;

        if (!audioUrl) {
          return reply(`❌ No audio URL in response. Full result:\n${JSON.stringify(result)}`);
        }

        const formatDuration = (s) =>
          `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

        const title = result.title || searchTitle;
        const duration = result.duration ? formatDuration(result.duration) : "Unknown";
        const thumbnail =
          result.thumbnail ||
          searchThumbnail ||
          (result.videoId ? `https://img.youtube.com/vi/${result.videoId}/hqdefault.jpg` : null) ||
          "https://img.youtube.com/vi/default/hqdefault.jpg";

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
