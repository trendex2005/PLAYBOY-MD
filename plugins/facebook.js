/* ============================================
   HUNTER XMD PRO - FACEBOOK VIDEO DOWNLOADER
   COMMAND  : .fb <facebook_url>
   ALIAS    : .facebook .fbdl

   CONFIRMED reachable from your Heroku dyno:
   ✅ apiskeith.top  (in YOUR logs: /download/audio works)
   ✅ www.tikwm.com  (used by tiktok plugins)
   ✅ api.cobalt.tools (gets 400 = alive)
   ============================================ */

const axios = require('axios');
const { cmd } = require('../command');

const BOT_NAME = 'TREND-X';

function resolveMediaSource(link) {
    if (!link) return null;
    if (link.startsWith('http://') || link.startsWith('https://')) return { url: link };
    try {
        const b = link.includes(',') ? link.split(',')[1] : link;
        return Buffer.from(b, 'base64');
    } catch (e) { return null; }
}

// ─── apiskeith.top — try every possible FB endpoint ──────────
// Your bot uses: /download/audio  →  so try /download/video and /download/facebook
async function tryApisKeith(url, endpoint) {
    const res = await axios.get(
        `https://apiskeith.top${endpoint}?url=${encodeURIComponent(url)}`,
        { timeout: 25000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const d = res.data;
    console.log(`[FB-DL] ApisKeith ${endpoint}:`, JSON.stringify(d).substring(0, 400));
    const v = d?.url || d?.hd || d?.sd || d?.video || d?.videoUrl
            || d?.data?.url || d?.data?.hd || d?.data?.sd
            || d?.result?.url || d?.result?.hd
            || (Array.isArray(d?.links) ? d.links[0]?.url : null)
            || (Array.isArray(d?.medias) ? (d.medias.find(x => (x.quality||'').includes('HD')) || d.medias[0])?.url : null);
    if (v) return v;
    throw new Error(`apiskeith ${endpoint}: no video URL`);
}

// ─── cobalt — correct v10 body ────────────────────────────────
async function tryCobalt(url) {
    const instances = [
        'https://api.cobalt.tools',
        'https://cobalt.imput.net',
        'https://co.wuk.sh',
    ];
    for (const base of instances) {
        try {
            const res = await axios.post(`${base}/`, { url }, {
                timeout: 20000,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            const d = res.data;
            console.log(`[FB-DL] Cobalt(${base}):`, JSON.stringify(d).substring(0, 300));
            if (d?.url) return d.url;
            if (d?.status === 'picker' && d?.picker?.length) {
                const v = d.picker.find(x => x.type === 'video') || d.picker[0];
                if (v?.url) return v.url;
            }
        } catch (e) {
            console.error(`[FB-DL] Cobalt(${base}) err:`, e.message);
        }
    }
    throw new Error('All cobalt instances failed');
}

// ─── tikwm facebook endpoint ──────────────────────────────────
async function tryTikwmFb(url) {
    const res = await axios.post('https://www.tikwm.com/api/facebook',
        new URLSearchParams({ url, hd: '1' }),
        {
            timeout: 25000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X)',
                'Referer': 'https://www.tikwm.com/'
            }
        }
    );
    const d = res.data;
    console.log('[FB-DL] TikwmFB:', JSON.stringify(d).substring(0, 300));
    if (d?.code === 0 && d?.data) {
        const v = d.data.hdplay || d.data.play || d.data.url || d.data.video;
        if (v) return v;
    }
    throw new Error(`tikwm-fb: code=${d?.code} msg=${d?.msg}`);
}

// ─── COMMAND ──────────────────────────────────────────────────
cmd({
    pattern: "fb",
    alias: ["facebook", "fbdl"],
    desc: "Download Facebook videos",
    category: "downloader",
    react: "📥",
    filename: __filename,
    use: "<Facebook URL>"
},
async (conn, mek, m, { from, args, q, reply }) => {
    try {
        if (!q || !q.startsWith('http')) {
            return reply(`📥 *Facebook Video Downloader*\n━━━━━━━━━━━━━━━━━━━━\n*Usage:* .fb _<Facebook URL>_\n\n*Examples:*\n  .fb https://fb.watch/xxxxx\n  .fb https://www.facebook.com/reel/xxxxx\n  .fb https://www.facebook.com/watch?v=xxxxx\n━━━━━━━━━━━━━━━━━━━━\n> ${BOT_NAME}`);
        }

        if (!q.includes('facebook.com') && !q.includes('fb.watch') && !q.includes('fb.com')) {
            return reply(`❌ *Invalid Link*\nPlease send a valid Facebook URL.\n> ${BOT_NAME}`);
        }

        const fbUrl = q.trim();
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        await reply(`⏳ *Downloading...*\n━━━━━━━━━━━━━━━━━━━━\n🔗 _${fbUrl.substring(0, 55)}..._\n━━━━━━━━━━━━━━━━━━━━\n> ${BOT_NAME}`);

        let rawVideoUrl = null;

        // Try apiskeith endpoints first (confirmed reachable domain)
        const keithEndpoints = [
            '/download/facebook',
            '/download/video',
            '/api/fbdl',
            '/api/facebook',
            '/fbdl',
        ];

        for (const ep of keithEndpoints) {
            try {
                console.log(`[FB-DL] ApisKeith trying: ${ep}`);
                rawVideoUrl = await tryApisKeith(fbUrl, ep);
                if (rawVideoUrl) {
                    console.log(`[FB-DL] ✅ SUCCESS apiskeith${ep}:`, rawVideoUrl.substring(0, 80));
                    break;
                }
            } catch (e) {
                console.error(`[FB-DL] ❌ apiskeith${ep}:`, e.message);
            }
        }

        // Then try cobalt
        if (!rawVideoUrl) {
            try {
                rawVideoUrl = await tryCobalt(fbUrl);
                if (rawVideoUrl) console.log('[FB-DL] ✅ SUCCESS Cobalt:', rawVideoUrl.substring(0, 80));
            } catch (e) {
                console.error('[FB-DL] ❌ Cobalt:', e.message);
            }
        }

        // Then try tikwm
        if (!rawVideoUrl) {
            try {
                rawVideoUrl = await tryTikwmFb(fbUrl);
                if (rawVideoUrl) console.log('[FB-DL] ✅ SUCCESS TikwmFB:', rawVideoUrl.substring(0, 80));
            } catch (e) {
                console.error('[FB-DL] ❌ TikwmFB:', e.message);
            }
        }

        if (!rawVideoUrl) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *Download Failed*\n━━━━━━━━━━━━━━━━━━━━\nCould not download this video.\n\n› Video may be private or expired\n› Try a public Facebook video link\n━━━━━━━━━━━━━━━━━━━━\n> ${BOT_NAME}`);
        }

        const videoSource = resolveMediaSource(rawVideoUrl);
        if (!videoSource) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *Media Error*\n> ${BOT_NAME}`);
        }

        await conn.sendMessage(from, {
            video: videoSource,
            mimetype: 'video/mp4',
            caption: `📥 *Facebook Video*\n━━━━━━━━━━━━━━━━━━━━\n✅ Downloaded successfully\n━━━━━━━━━━━━━━━━━━━━\n> ${BOT_NAME}`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('[FB-DL] Fatal:', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
        reply(`❌ *Error*\n${e.message.substring(0, 100)}\n> ${BOT_NAME}`);
    }
});
