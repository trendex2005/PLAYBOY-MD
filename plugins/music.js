const axios = require('axios'); // Fixed: Added quotes
const { cmd } = require('../command');

cmd({
    pattern: "play",
    alias: ["song", "ytplay"],
    desc: "Play music from YouTube",
    category: "downloader",
    filename: __filename,
}, async (malvin, mek, m, { args, reply }) => {
    // 1. Properly join arguments for the song name
    const text = (args && args.length ? args.join(" ") : null) || (m?.quoted?.text ? m.quoted.text : null);

    if (!text) return reply("❌ Please enter a song name!\n\nExample: .play Alone");

    try {
        await reply("🔎 Searching for your song... (this may take a while)");

        // 2. Fixed URL formatting: Ensure the domain is correct and query is encoded
        const apiUrl = `https://princetechn.com{encodeURIComponent(text)}`;
        
        const res = await axios.get(apiUrl, { timeout: 60000 });
        const data = res.data;

        // 3. Robust response checking
        if (!data || data.status === false || !data.result) {
            return reply("❌ Couldn't find that song. Try a different title.");
        }

        const result = data.result;
        const audioUrl = result.downloadUrl; // Verified field for PrinceTechn API
        const title = result.title || text;
        const duration = result.duration ? `${result.duration}s` : "Unknown";
        const thumbnail = result.thumbnail || `https://youtube.com{result.videoId}/hqdefault.jpg`;

        if (!audioUrl) {
            return reply("❌ The API found the song but didn't provide a download link.");
        }

        // 4. Send the visual "Now Playing" card
        await malvin.sendMessage(m.chat, { 
            image: { url: thumbnail }, 
            caption: `🎶 *Now Playing* — NovaCore AI\n\n` +
                     `+ 🎵 *Title:* ${title}\n` +
                     `+ ⏱ *Duration:* ${duration}\n` +
                     `+ 📺 *YouTube:* ${result.videoUrl || 'N/A'}\n\n` +
                     `🔥 *Powered by NovaCore AI*`
        }, { quoted: mek });

        // 5. Send the MP3 file directly
        await malvin.sendMessage(m.chat, { 
            audio: { url: audioUrl }, 
            mimetype: 'audio/mpeg', 
            fileName: `${title}.mp3` 
        }, { quoted: mek });

    } catch (err) {
        console.error("play.js error:", err.message);
        // Error handling for common network issues
        if (err.code === 'ENOTFOUND') {
            reply("⚠️ Connection error: Could not reach the API server. Please check your internet or try again later.");
        } else {
            reply(`⚠️ Error: ${err.message}`);
        }
    }
});
