const axios = require('axios');
const { cmd } = require('../command');

cmd({
    pattern: "play",
    alias: ["song", "ytplay"],
    desc: "Play music from YouTube",
    category: "downloader",
    filename: __filename,
}, async (malvin, mek, m, { args, reply }) => {
    // 1. Extract the search query
    const text = (args && args.length ? args.join(" ") : null) || (m?.quoted?.text ? m.quoted.text : null);

    if (!text) return reply("❌ Please enter a song name!\n\nExample: .play Alone");

    try {
        await reply("🔎 Searching for your song... (this may take a while)");

        // 2. Hit the SocialKit API (Replace this URL if you choose a different provider)
        const apiUrl = `https://socialkit.dev{encodeURIComponent(text)}`;
        const res = await axios.get(apiUrl, { timeout: 60000 });
        const data = res.data;

        // 3. Validate the API response
        if (!data || data.status === false || !data.result) {
            return reply("❌ Couldn't find that song. The API might be down.");
        }

        const result = data.result;
        const audioUrl = result.downloadUrl; // Ensure this field matches your chosen API's output
        const title = result.title || text;
        const duration = result.duration ? `${result.duration}s` : "Unknown";
        const thumbnail = result.thumbnail || (result.videoId ? `https://youtube.com{result.videoId}/hqdefault.jpg` : "https://ibb.co");

        if (!audioUrl) {
            return reply("❌ API didn't return a valid audio link.");
        }

        // 4. Send song details with the thumbnail
        await malvin.sendMessage(m.chat, { 
            image: { url: thumbnail }, 
            caption: `🎶 *Now Playing* — NovaCore AI\n\n` +
                     `+ 🎵 *Title:* ${title}\n` +
                     `+ ⏱ *Duration:* ${duration}\n` +
                     `+ 📺 *YouTube:* ${result.videoUrl || 'N/A'}\n\n` +
                     `🔥 Brought to you by *NovaCore AI*`
        }, { quoted: mek });

        // 5. Send the MP3 file
        await malvin.sendMessage(m.chat, { 
            audio: { url: audioUrl }, 
            mimetype: 'audio/mpeg', 
            fileName: `${title}.mp3` 
        }, { quoted: mek });

    } catch (err) {
        console.error("play.js error:", err.message);
        reply(`⚠️ Error fetching song: ${err.message}`);
    }
});
