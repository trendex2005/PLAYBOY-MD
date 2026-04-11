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

    try {
      await reply("🔎 Searching for your song... (this may take a while)");

      const apiUrl = `https://zdmzfeqrclgdjzhapdxl.supabase.co/functions/v1/api-proxy/api/audio/archive-search?query=${encodeURIComponent(
        text
      )}`;

      const res = await axios.get(apiUrl, { timeout: 60000 });
      const data = res.data;

      if (!data || data.status === false || !data.result) {
        return reply("❌ Couldn't find that song.");
      }

      const result = data.result;
      const audioUrl = result.downloadUrl; // ✅ this is the correct field

      if (!audioUrl) {
        return reply("❌ API didn’t return any audio link.");
      }

      const title = result.title || text;
      const duration = result.duration ? `${result.duration}s` : "Unknown";
      const thumbnail =
        result.thumbnail ||
        (result.videoId ? `https://img.youtube.com/vi/${result.videoId}/hqdefault.jpg` : null) ||
        "https://i.ibb.co/4pDNDk1/music.jpg";

      // Send song info
      await malvin.sendMessage(
        m.chat,
        {
          image: { url: thumbnail },
          caption:
            `🎶 *Now Playing* — NovaCore AI\n\n` +
            `🎵 *Title:* ${title}\n` +
            `⏱ *Duration:* ${duration}\n` +
            `📺 *YouTube:* ${result.videoUrl || "Unknown"}\n\n` +
            `🔥 Brought to you by *NovaCore AI*`,
        },
        { quoted: mek }
      );

      // Send MP3
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
      reply(`⚠️ Error fetching song: ${err.message}`);
    }
  }
);
