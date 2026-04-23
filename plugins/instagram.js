const axios = require("axios");
const { cmd, commands } = require('../command');


cmd({
    pattern: "instagram",
    alias: ["igdl", "reel", "ig", "instadl"],
    desc: "Download Instagram reels or image posts",
    category: "downloader",
    react: "⏳",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply, react }) => {
    try {
        if (!q) return reply("*🏷️ ᴘʟᴇᴀsᴇ ᴘʀᴏᴠɪᴅᴇ ᴀɴ ɪɴsᴛᴀɢʀᴀᴍ ᴘᴏsᴛ ᴏʀ ʀᴇᴇʟ ʟɪɴᴋ.*");
        if (!q.includes("instagram.com")) return reply("Invalid Instagram link.");

        const apiUrl = `https://apiskeith.top/download/instadl?url=${q}`;
        const { data } = await axios.get(apiUrl);

        if (!data.status || !data.data) {
            await react("❌"); 
            return reply("Failed to fetch Instagram media.");
        }

        const { username, fullname, caption, likes, comments, followed, download } = data.data;

        const captionText = `*❒ ᴀʟɪ-ᴍᴅ ᴠɪᴅᴇᴏ ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ ❒*\n\n` +
                            `👤 *ᴜsᴇʀ:* ${fullname}\n` +
                            `♥️ *ʟɪᴋᴇs:* ${likes}\n💬 *ᴄᴏᴍᴍᴇɴᴛs:* ${comments}\n👥 *ғᴏʟʟᴏᴡᴇʀs:* ${followed}\n`;

        for (const media of download) {
            if (media.type === "image") {
                await conn.sendMessage(from, {
                    image: { url: media.url },
                    caption: captionText,
                    contextInfo: { mentionedJid: [m.sender] }
                }, { quoted: mek });
            } else if (media.type === "video") {
                await conn.sendMessage(from, {
                    video: { url: media.url },
                    caption: captionText,
                    contextInfo: { mentionedJid: [m.sender] }
                }, { quoted: mek });
            }
        }

        await react("✅"); // React after successfully sending media
    } catch (e) {
        console.error("Error in Instagram downloader command:", e);
        await react("❌");
        reply(`An error occurred: ${e.message}`);
    }
});
