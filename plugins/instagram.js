const { cmd } = require('../command');
const { igdl } = require('ruhend-scraper');
const config = require('../config');

cmd({
  pattern: "instagram",
  alias: ["ig", "insta", "igdl", "reels"],
  desc: "Download Instagram media",
  category: "media",
  react: "📥",
  filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
  try {
    const text = args.join(" ");

    if (!text) {
      return reply("Provide an Instagram link.");
    }

    const data = await igdl(text).catch(() => null);

    if (!data || !data.data || !data.data.length) {
      return reply("❌ Failed to fetch media.");
    }

    for (const media of data.data) {
      if (media.type === "video") {
        await conn.sendMessage(from, {
          video: { url: media.url },
          caption: `DOWNLOADED BY ${config.BOT_NAME}`
        }, { quoted: mek });
      } else {
        await conn.sendMessage(from, {
          image: { url: media.url },
          caption: `DOWNLOADED BY ${config.BOT_NAME}`
        }, { quoted: mek });
      }
    }

  } catch (e) {
    console.error(e);
    reply("Error occurred.");
  }
});
