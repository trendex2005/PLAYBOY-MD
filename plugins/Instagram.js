const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "instagram",
    alias: ["ig", "igdl", "instadl"],
    desc: "Download Instagram reels or posts",
    category: "downloader",
    react: "📸",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("❌ Please provide an Instagram link.");
        if (!q.includes("instagram.com"))
            return reply("❌ Invalid Instagram link.");

        reply("⏳ Downloading Instagram media, please wait...");

        const apiUrl = `https://delirius-apiofc.vercel.app/download/instagram?url=${encodeURIComponent(q)}`;
        const res = await axios.get(apiUrl);
        const data = res.data;

        if (!data?.status || !data?.data) {
            return reply("❌ Failed to fetch Instagram media.");
        }

        const media = data.data;

        // If multiple media (carousel)
        if (Array.isArray(media)) {
            for (let item of media) {
                if (item.type === "video") {
                    await conn.sendMessage(
                        from,
                        {
                            video: { url: item.url },
                            mimetype: "video/mp4"
                        },
                        { quoted: mek }
                    );
                } else {
                    await conn.sendMessage(
                        from,
                        {
                            image: { url: item.url }
                        },
                        { quoted: mek }
                    );
                }
            }
            return;
        }

        // Single media
        if (media.type === "video") {
            await conn.sendMessage(
                from,
                {
                    video: { url: media.url },
                    mimetype: "video/mp4",
                    caption: "📸 *Instagram Video*"
                },
                { quoted: mek }
            );
        } else {
            await conn.sendMessage(
                from,
                {
                    image: { url: media.url },
                    caption: "📸 *Instagram Image*"
                },
                { quoted: mek }
            );
        }

    } catch (e) {
        console.error("Instagram Downloader Error:", e);
        reply("❌ Error downloading Instagram media.");
    }
});
