const yts = require('yt-search');
const axios = require('axios');

module.exports = {
    cmd: ['play', 'song'],
    desc: 'Download YouTube music as MP3',
    type: 'music',
    exec: async (sock, m) => {
        try {
            const text = m.text || "";
            const searchQuery = text.split(' ').slice(1).join(' ').trim();
            
            if (!searchQuery) {
                return await sock.sendMessage(m.chat, { 
                    text: "🎵 What song do you want to download?\n\nExample: *.play calm down*"
                });
            }

            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) {
                return await sock.sendMessage(m.chat, { text: "❌ No songs found!" });
            }

            const video = videos[0];
            await sock.sendMessage(m.chat, { text: `_⏳ Downloading **${video.title}**..._` });

            const response = await axios.get(`https://apis-keith.vercel.app/download/dlmp3?url=${video.url}`);
            const data = response.data;

            if (!data?.status || !data?.result?.downloadUrl) {
                return await sock.sendMessage(m.chat, { text: "⚠️ Failed to fetch audio. Try again later." });
            }

            const audioUrl = data.result.downloadUrl;
            const title = data.result.title || video.title;

            await sock.sendMessage(m.chat, {
                audio: { url: audioUrl },
                mimetype: "audio/mpeg",
                fileName: `${title}.mp3`,
                caption: `🎶 *${title}*`
            }, { quoted: m });

        } catch (error) {
            console.error('Error in play command:', error);
            await sock.sendMessage(m.chat, { text: "❌ Download failed. Please try again later." });
        }
    }
};
