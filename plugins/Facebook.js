const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "facebook",
    alias: ["fb", "fbdl", "facebookdl"],
    desc: "Download Facebook video",
    category: "downloader",
    react: "📘",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("❌ Please provide a Facebook video link.");
        if (!q.includes("facebook.com") && !q.includes("fb.watch"))
            return reply("❌ Invalid Facebook link.");

        reply("⏳ Downloading Facebook video...");

        // ✅ WORKING endpoint
        const apiUrl = `https://delirius-apiofc.vercel.app/api/facebook?url=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data?.status || !data?.result) {
            return reply("❌ Failed to fetch Facebook video.");
        }

        // Try best quality first
        const videoUrl =
            data.result.hd ||
            data.result.sd ||
            data.result.url;

        if (!videoUrl) {
            return reply("❌ Video link not found.");
        }

        const caption =
`📘 *Facebook Video*

📖 *Title:* ${data.result.title || "No title"}
🎥 *Quality:* ${data.result.hd ? "HD" : "SD"}`;

        await conn.sendMessage(
            from,
            {
                video: { url: videoUrl },
                mimetype: "video/mp4",
                caption
            },
            { quoted: mek }
        );

    } catch (e) {
        console.error("Facebook Downloader Error:", e?.response?.data || e);
        reply("❌ Facebook download failed.");
    }
});
