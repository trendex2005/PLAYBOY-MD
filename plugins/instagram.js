const { cmd } = require('../command');
const { igdl } = require('ruhend-scraper');
const axios = require('axios');
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

        // 🔥 STEP 1: GET DATA
        const data = await igdl(text).catch(() => null);

        if (!data || !data.data || data.data.length === 0) {
            await react("❌");
            return reply("❌ No media found. Instagram blocked or link invalid.");
        }

        let success = 0;

        // 🔥 STEP 2: PROCESS MEDIA
        for (const media of data.data) {
            if (!media.url) continue;

            try {
                console.log("Downloading:", media.url);

                // 🔥 CRITICAL FIX: download buffer instead of URL
                const res = await axios.get(media.url, {
                    responseType: "arraybuffer",
                    timeout: 15000,
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

                success++;

            } catch (err) {
                console.log("Media failed:", media.url);
            }
        }

        // 🔥 STEP 3: FINAL CHECK
        if (success === 0) {
            await react("❌");
            return reply("❌ Failed to send media. Instagram blocked the files or links expired.");
        }

        await react("✅");

    } catch (err) {
        console.error("Instagram error:", err);
        await react("❌");
        reply("❌ Unexpected error occurred.");
    }
});
