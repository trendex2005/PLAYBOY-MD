const { cmd } = require('../command');
const config = require('../config');

// ── Auto Bio Interval Tracker ──────────────────────────────
let autoBioInterval = null;
let autoBioEnabled = config.AUTO_BIO === 'true';
let autoBioText = config.AUTO_BIO_TEXT || 'TREND-X | ⏱ {uptime} | 🕒 {time}';

function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
}

function buildBio(template) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    const uptime = formatUptime(Math.floor(process.uptime()));
    return template
        .replace(/{uptime}/gi, uptime)
        .replace(/{time}/gi, time)
        .replace(/{date}/gi, date)
        .replace(/{botname}/gi, config.BOT_NAME || 'Hunter XMD');
}

function startAutoBio(conn) {
    if (autoBioInterval) clearInterval(autoBioInterval);
    autoBioInterval = setInterval(async () => {
        try {
            const bio = buildBio(autoBioText);
            await conn.updateProfileStatus(bio);
        } catch (e) {
            console.error('Auto-bio update error:', e.message);
        }
    }, 60 * 1000); // updates every 1 minute
    console.log('✅ Auto-bio started');
}

function stopAutoBio() {
    if (autoBioInterval) {
        clearInterval(autoBioInterval);
        autoBioInterval = null;
    }
    autoBioEnabled = false;
    console.log('❌ Auto-bio stopped');
}

module.exports = { startAutoBio, stopAutoBio };

// ── Auto-start if AUTO_BIO=true in Heroku config vars ──────
// Called from index.js after conn is ready:
// const { startAutoBio } = require('./plugins/auto-bio');
// if (config.AUTO_BIO === 'true') startAutoBio(conn);

// ── Command ────────────────────────────────────────────────
cmd({
    pattern: "autobio",
    alias: ['bio', 'setbio'],
    desc: "Auto update bot bio with uptime/time.",
    category: "owner",
    react: "✏️",
    filename: __filename
},
async (conn, mek, m, { from, reply, text, isOwner, isCreator }) => {
    if (!isOwner && !isCreator) return reply('❌ Owner only command!');

    const action = text?.toLowerCase().trim();

    if (!action || action === 'status') {
        return reply(
            `*✏️ AUTO BIO STATUS*\n\n` +
            `Status : ${autoBioEnabled ? '✅ Running' : '❌ Stopped'}\n` +
            `Template : \`${autoBioText}\`\n\n` +
            `*Variables:*\n` +
            `• \`{uptime}\` → Bot uptime\n` +
            `• \`{time}\` → Current time\n` +
            `• \`{date}\` → Current date\n` +
            `• \`{botname}\` → Bot name\n\n` +
            `*Commands:*\n` +
            `• \`.autobio on\` — Start\n` +
            `• \`.autobio off\` — Stop\n` +
            `• \`.autobio set 🏹 {botname} | {uptime}\` — Custom template`
        );
    }

    if (action === 'on' || action === 'enable') {
        if (autoBioEnabled) return reply('✅ Auto-bio is *already running*!');
        autoBioEnabled = true;
        startAutoBio(conn);
        const preview = buildBio(autoBioText);
        return reply(`✅ *Auto-bio ENABLED!*\n\n📝 Preview: _${preview}_\n\n_Updates every 1 minute._`);
    }

    if (action === 'off' || action === 'disable') {
        if (!autoBioEnabled) return reply('❌ Auto-bio is *already stopped*!');
        stopAutoBio();
        return reply('❌ *Auto-bio DISABLED!*\n\n_Bio will no longer auto-update._');
    }

    if (action.startsWith('set ')) {
        const newTemplate = text.slice(4).trim();
        if (!newTemplate) return reply('❌ Please provide a bio template!\n\nExample:\n`.autobio set 🏹 {botname} | {uptime} | {time}`');
        autoBioText = newTemplate;
        const preview = buildBio(newTemplate);
        return reply(`✅ *Bio template updated!*\n\n📝 Preview: _${preview}_\n\nType \`.autobio on\` to start.`);
    }

    return reply(
        `❌ Unknown action!\n\n` +
        `• \`.autobio on\`\n` +
        `• \`.autobio off\`\n` +
        `• \`.autobio status\`\n` +
        `• \`.autobio set your text {uptime}\``
    );
});
