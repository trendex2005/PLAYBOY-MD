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

        // ✅ Strict Instagram link validation
        const igRegex = /https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\//;
        if (!igRegex.test(text)) {
            return reply("❌ Invalid Instagram link.");
        }

        await react("⏳");

        // ✅ Timeout wrapper
        const timeout = ms => new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timeout")), ms)
        );

        let data;

        try {
            const res = await Promise.race([
                igdl(text),
                timeout(15000)
            ]);
            data = res;
        } catch (e) {
            console.error("Scraper failed:", e);
            return reply("❌ Failed to fetch media. Try another link.");
        }

        if (!data?.data?.length) {
            return reply("❌ No media found. The post may be private or unsupported.");
        }

        const mediaList = data.data.slice(0, 10); // limit to prevent spam

        for (const media of mediaList) {
            try {
                if (!media.url) continue;

                // ✅ Download media as buffer (FIXES YOUR ERROR)
                const res = await axios.get(media.url, {
                    responseType: "arraybuffer",
                    timeout: 15000,
                    headers: {
                        "User-Agent": "Mozilla/5.0"
                    }
                });

                const buffer = Buffer.from(res.data, "binary");

                // ✅ Improved video detection
                const isVideo =
                    media.type === "video" ||
                    media.url.includes(".mp4") ||
                    text.includes("/reel/") ||
                    text.includes("/tv/");

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

                // small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 800));

            } catch (mediaErr) {
                console.error("Media send failed:", mediaErr);
            }
        }

        await react("✅");

    } catch (err) {
        console.error("Instagram command error:", err);
        await react("❌");
        reply("❌ An error occurred while processing the request.");
    }
});
