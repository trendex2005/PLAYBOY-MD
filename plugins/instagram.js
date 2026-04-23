const { cmd } = require('../command');
const { igdl } = require('ruhend-scraper');
const axios = require('axios'); // ✅ added
const config = require('../config');

cmd({
    pattern: "insta",
    alias: ["ig", "igdl", "reel", "instadl"],
    desc: "Download Instagram media",
    category: "downloader",
    react: "📥",
    filename: __filename
},
async (conn, mek, m, { from, args, reply, react }) => {
    try {
        const text = args.join(" ");

        if (!text) {
            return reply("📌 Please provide an Instagram link.");
        }

        await react("⏳");

        const data = await igdl(text);

        if (!data?.data?.length) {
            return reply("❌ No media found.");
        }

        for (const media of data.data) {
            try {
                if (!media.url) continue;

                // ✅ FIX: download buffer instead of sending URL
                const res = await axios.get(media.url, {
                    responseType: "arraybuffer",
                    headers: {
                        "User-Agent": "Mozilla/5.0"
                    }
                });

                const buffer = Buffer.from(res.data);

                const isVideo =
                    media.type === "video" ||
                    media.url.includes(".mp4");

                if (isVideo) {
                    await conn.sendMessage(from, {
                        video: buffer,
                        mimetype: "video/mp4",
                        caption: `*DOWNLOADED BY ${config.BOT_NAME.toUpperCase()}*`
                    }, { quoted: mek });
                } else {
                    await conn.sendMessage(from, {
                        image: buffer,
                        caption: `*DOWNLOADED BY ${config.BOT_NAME.toUpperCase()}*`
                    }, { quoted: mek });
                }

            } catch (err) {
                console.log("Media failed:", media.url);
            }
        }

        await react("✅");

    } catch (err) {
        console.error("Instagram command error:", err);
        await react("❌");
        reply("❌ Error processing request.");
    }
});
