const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "facebook",
    alias: ["fbdl", "fb", "facebookdl"],
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

        reply("⏳ Downloading Facebook video, please wait...");

        const apiUrl = `https://delirius-apiofc.vercel.app/download/facebook?url=${encodeURIComponent(q)}`;
        const res = await axios.get(apiUrl);
        const data = res.data;

        if (!data?.status || !data?.data) {
            return reply("❌ Failed to fetch Facebook video.");
        }

        const video =
            data.data.hd ||
            data.data.sd ||
            data.data.video;

        if (!video) {
            return reply("❌ Video link not found.");
        }

        const caption =
`📘 *Facebook Video*

📖 *Title:* ${data.data.title || "No title"}
🎥 *Quality:* ${data.data.hd ? "HD" : "SD"}`;

        await conn.sendMessage(
            from,
            {
                video: { url: video },
                mimetype: "video/mp4",
                caption
            },
            { quoted: mek }
        );

    } catch (e) {
        console.error("Facebook Downloader Error:", e);
        reply("❌ Error downloading Facebook video.");
    }
});
