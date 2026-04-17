/* ============================================
   HUNTER XMD PRO - TIKTOK DOWNLOADER (BY LINK)
   COMMAND  : .tiktok <tiktok_url>
   ALIAS    : .ttdl .tt .tiktokdl
   API      : https://www.tikwm.com/api/ (POST)
   ============================================ */

const { cmd } = require('../command');
const axios = require('axios');

const BOT_NAME = 'TREND X';

// ─── Base64 / URL resolver ─────────────────────────────────────
function resolveMediaSource(link) {
    if (!link) return null;
    if (link.startsWith('http://') || link.startsWith('https://')) {
        return { url: link };
    }
    const base64Data = link.includes(',') ? link.split(',')[1] : link;
    try {
        return Buffer.from(base64Data, 'base64');
    } catch (e) {
        console.error('[resolveMedia] Failed to decode base64:', e.message);
        return null;
    }
}

// ─── tikwm downloader ──────────────────────────────────────────
async function tikwmDownload(url) {
    const res = await axios.post('https://www.tikwm.com/api/',
        new URLSearchParams({ url, hd: '1' }),
        {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10'
            }
        }
    );
    const d = res.data;
    console.log('[TIKTOK-DL] tikwm code:', d?.code, '| msg:', d?.msg);
    if (!d || d.code !== 0) throw new Error(d?.msg || 'tikwm error code: ' + d?.code);
    return d.data;
}

// ─── COMMAND ──────────────────────────────────────────────────
cmd({
    pattern: "tiktok",
    alias: ["ttdl", "tt", "tiktokdl"],
    desc: "Download TikTok video without watermark",
    category: "downloader",
    react: "🎵",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply }) => {
    try {
        // ── 1. Validate ────────────────────────────────────────
        if (!q) return reply(`🎵 *TikTok Downloader — ${BOT_NAME}*
━━━━━━━━━━━━━━━━━━━━
*Usage:*  .tiktok _[link]_

*Example:*
  › .tiktok https://www.tiktok.com/@user/video/123

━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);

        // Extract TikTok URL — also handles Facebook share links that embed TikTok URLs
        let tiktokUrl = q.trim();
        const ttMatch = tiktokUrl.match(/https?:\/\/(?:www\.|vm\.|vt\.)?tiktok\.com\/[^\s&]*/);
        if (!ttMatch) {
            return reply(`❌ *Invalid Link*
━━━━━━━━━━━━━━━━━━━━
Please send a valid TikTok link.
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }
        tiktokUrl = ttMatch[0];

        // ── 2. React + notify ──────────────────────────────────
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        await reply(`⏳ *Downloading TikTok video...*
━━━━━━━━━━━━━━━━━━━━
🔗  _${tiktokUrl.substring(0, 60)}..._
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);

        // ── 3. Fetch from tikwm ────────────────────────────────
        let data;
        try {
            data = await tikwmDownload(tiktokUrl);
        } catch (apiErr) {
            console.error('[TIKTOK-DL] API error:', apiErr.message);
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *Download Failed*
━━━━━━━━━━━━━━━━━━━━
_${apiErr.message.substring(0, 100)}_
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        // ── 4. Extract fields ──────────────────────────────────
        const title    = data.title || data.desc || 'TikTok Video';
        const author   = data.author?.nickname || data.author?.unique_id || 'Unknown';
        const username = data.author?.unique_id || '';
        const likes    = data.digg_count    || data.statistics?.digg_count    || 0;
        const comments = data.comment_count || data.statistics?.comment_count || 0;
        const shares   = data.share_count   || data.statistics?.share_count   || 0;
        const cover    = data.cover || data.origin_cover || null;

        // Video URL: prefer HD no-watermark
        const rawVideoUrl = data.hdplay || data.play || data.wmplay || null;

        if (!rawVideoUrl) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *No Video URL Found*
━━━━━━━━━━━━━━━━━━━━
tikwm returned data but no download link.
Try again in a moment.
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        const videoSource = resolveMediaSource(rawVideoUrl);
        if (!videoSource) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *Media Decode Failed*\n> ${BOT_NAME}`);
        }

        // ── 5. Send thumbnail first ────────────────────────────
        if (cover) {
            try {
                await conn.sendMessage(from, {
                    image: { url: cover },
                    caption: `🎵 *${title}*\n👤  ${author}${username ? ` (@${username})` : ''}\n⏳ _Sending video..._`
                }, { quoted: mek });
            } catch (_) { /* thumbnail is optional */ }
        }

        // ── 6. Build caption ───────────────────────────────────
        const caption = `🎵 *TikTok Video*
━━━━━━━━━━━━━━━━━━━━
📖  ${title.substring(0, 100)}
👤  ${author}${username ? ` (@${username})` : ''}
━━━━━━━━━━━━━━━━━━━━
👍  ${Number(likes).toLocaleString()}   💬  ${Number(comments).toLocaleString()}   🔁  ${Number(shares).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`;

        // ── 7. Send video ──────────────────────────────────────
        const payload = { mimetype: 'video/mp4', caption };
        payload.video = videoSource;

        await conn.sendMessage(from, payload, { quoted: mek });
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('[TIKTOK-DL] Fatal:', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
        reply(`❌ *Error*\n━━━━━━━━━━━━━━━━━━━━\n${e.message.substring(0, 100)}\n━━━━━━━━━━━━━━━━━━━━\n> ${BOT_NAME}`);
    }
});
