/* ============================================
   TRENDEX KING - AUDIO / VIDEO DOWNLOADER
   COMMAND: .play [song name] | .video [name]
   API: Noobs API (https://noobs-api.top)
   STYLE: Clean Modern Card Design
   FIX: Base64 buffer support included
   ============================================ */

const { cmd } = require('../command');
const ytSearch = require('yt-search');
const axios = require('axios');

// API Base
const BASE_URL = 'https://apis.davidcyril.name.ng/';

// Bot Identity
const BOT_NAME   = 'TREND-X';
const BOT_FOOTER = '🎯 TREND-X  — ᴍᴜꜱɪᴄ ᴍᴏᴅᴜʟᴇ';
const OWNER_NAME = 'TRENDEX';
const BOT_VERSION = '𝟯𝟬.𝟬.𝟬';

// ─── Helpers ──────────────────────────────────────────────────

function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000)     return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
}

// Converts base64 string → Buffer, or returns { url } for direct links
function resolveMediaSource(downloadLink) {
    if (!downloadLink) return null;
    if (downloadLink.startsWith('http://') || downloadLink.startsWith('https://')) {
        return { url: downloadLink };
    }
    const base64Data = downloadLink.includes(',')
        ? downloadLink.split(',')[1]
        : downloadLink;
    try {
        return Buffer.from(base64Data, 'base64');
    } catch (e) {
        console.error('[resolveMediaSource] Base64 parse failed:', e.message);
        return null;
    }
}

// ─── Message Templates (clean modern card style) ──────────────

function songCard(video) {
    return `🎵 *Now Playing*
━━━━━━━━━━━━━━━━━━━━
🎧  *${video.title}*
🎤  ${video.author.name}
⏱  ${video.timestamp}   •   👁 ${formatNumber(video.views)}
🗓  ${video.ago}
━━━━━━━━━━━━━━━━━━━━
⬇️  _Fetching audio, please wait..._
💡  Use *.video* to get the MP4 version

> ${BOT_NAME}`;
}

function videoCard(video) {
    return `🎬 *Video Ready*
━━━━━━━━━━━━━━━━━━━━
🎞  *${video.title}*
🎤  ${video.author.name}
⏱  ${video.timestamp}   •   👁 ${formatNumber(video.views)}
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`;
}

function helpPlay() {
    return `🎵 *${BOT_NAME} — Music Help*
━━━━━━━━━━━━━━━━━━━━
*Usage:*  .play _[song name]_

*Examples:*
  › .play faded
  › .play shape of you
  › .play believer

👑 Owner: ${OWNER_NAME}
⚡ Version: ${BOT_VERSION}
━━━━━━━━━━━━━━━━━━━━
_Powered by Noobs API_`;
}

function helpVideo() {
    return `🎬 *${BOT_NAME} — Video Help*
━━━━━━━━━━━━━━━━━━━━
*Usage:*  .video _[song / video name]_

*Example:*
  › .video faded

━━━━━━━━━━━━━━━━━━━━
_Powered by Trendex king_`;
}

function errCard(label, detail = 'Please try again later.') {
    return `❌ *${label}*
━━━━━━━━━━━━━━━━━━━━
${detail}
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`;
}

// ─── PLAY COMMAND ─────────────────────────────────────────────
cmd({
    pattern: "play",
    alias: ["song", "music", "ytmp3"],
    desc: "Play audio from YouTube",
    category: "downloader",
    react: "🎵",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, sender, pushname }) => {
    try {
        await conn.sendMessage(from, { react: { text: "🎵", key: mek.key } });

        if (!q) return await reply(helpPlay());

        console.log('[PLAY] Searching:', q);

        const search = await ytSearch(q);
        const video  = search.videos[0];

        if (!video) {
            return await reply(errCard('No Results Found', `No track matched _"${q}"_\nTry different keywords.`));
        }

        // Send preview card with thumbnail
        await conn.sendMessage(from, {
            image:      { url: video.thumbnail },
            caption:    songCard(video),
            footer:     BOT_FOOTER,
            buttons: [{
                buttonId:   `.video ${video.title}`,
                buttonText: { displayText: '🎬 Get Video Version' },
                type: 1
            }],
            headerType: 1
        }, { quoted: mek });

        // Fetch audio from API
        const apiURL   = `${BASE_URL}/dipto/ytDl3?link=${encodeURIComponent(video.videoId)}&format=mp3`;
        console.log('[PLAY] API:', apiURL);
        const response = await axios.get(apiURL, { timeout: 30000 });
        const data     = response.data;

        if (!data.downloadLink) {
            return await reply(errCard('Download Failed', 'Could not retrieve the audio stream.'));
        }

        const audioSource = resolveMediaSource(data.downloadLink);
        if (!audioSource) {
            return await reply(errCard('Invalid Audio Data', 'The API returned unreadable data.'));
        }

        const audioPayload = {
            mimetype:  'audio/mpeg',
            fileName:  `${video.title.replace(/[^\w\s]/gi, '')}.mp3`,
            ptt:       false,
            contextInfo: {
                externalAdReply: {
                    title:        video.title.substring(0, 30),
                    body:         `${video.author.name} • ${video.timestamp}`,
                    thumbnailUrl: video.thumbnail,
                    sourceUrl:    `https://youtube.com/watch?v=${video.videoId}`,
                    mediaType:    2
                }
            }
        };

        audioPayload.audio = audioSource; // works for both Buffer and { url }

        await conn.sendMessage(from, audioPayload, { quoted: mek });
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (err) {
        console.error('[PLAY] Error:', err);
        await reply(errCard('Something Went Wrong', err.message.substring(0, 80)));
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});

// ─── VIDEO COMMAND ────────────────────────────────────────────
cmd({
    pattern: "video",
    alias: ["ytvideo", "ytmp4"],
    desc: "Download YouTube video",
    category: "downloader",
    react: "🎬",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        await conn.sendMessage(from, { react: { text: "🎬", key: mek.key } });

        if (!q) return reply(helpVideo());

        const search = await ytSearch(q);
        const video  = search.videos[0];

        if (!video) {
            return reply(errCard('No Results Found', `No video matched _"${q}"_\nTry different keywords.`));
        }

        const apiURL   = `${BASE_URL}/dipto/ytDl3?link=${encodeURIComponent(video.videoId)}&format=mp4`;
        const response = await axios.get(apiURL, { timeout: 30000 });
        const data     = response.data;

        if (!data.downloadLink) {
            return reply(errCard('Download Failed', 'Could not retrieve the video stream.'));
        }

        const videoSource = resolveMediaSource(data.downloadLink);
        if (!videoSource) {
            return reply(errCard('Invalid Video Data', 'The API returned unreadable data.'));
        }

        const videoPayload = {
            mimetype: 'video/mp4',
            caption:  videoCard(video)
        };

        videoPayload.video = videoSource; // works for both Buffer and { url }

        await conn.sendMessage(from, videoPayload, { quoted: mek });
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (err) {
        console.error('[VIDEO] Error:', err);
        reply(errCard('Something Went Wrong', err.message.substring(0, 80)));
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});
