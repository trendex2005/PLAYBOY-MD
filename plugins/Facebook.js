const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "facebook",
    alias: ["fb", "fbdl"],
    desc: "Download Facebook video",
    category: "downloader",
    react: "📘",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("❌ Provide a Facebook link");
        if (!q.includes("facebook.com") && !q.includes("fb.watch"))
            return reply("❌ Invalid Facebook link");

        reply("⏳ Fetching Facebook video...");

        // ✅ STABLE API
        const api = `https://api.akuari.my.id/downloader/fbdl?link=${encodeURIComponent(q)}`;
        const { data } = await axios.get(api);

        if (!data || !data.respon) {
            return reply("❌ Failed to fetch video");
        }

        const videoUrl =
            data.respon.video_hd ||
            data.respon.video_sd;

        if (!videoUrl) {
            return reply("❌ No downloadable video found");
        }

        await conn.sendMessage(
            from,
            {
                video: { url: videoUrl },
                mimetype: "video/mp4",
                caption: "📘 *Facebook Video*"
            },
            { quoted: mek }
        );

    } catch (err) {
        console.error("FB ERROR:", err?.response?.data || err);
        reply("❌ Facebook download failed (blocked by FB)");
    }
});
