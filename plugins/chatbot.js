// commands/chatbot.js
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // require node-fetch v2 (or replace with axios if using v3 ESM)

const DATA_PATH = path.join(__dirname, '../data/userGroupData.json');
const DEBUG = true; // set to false to reduce console noise

function log(...args) { if (DEBUG) console.log('[chatbot]', ...args); }
function warn(...args) { if (DEBUG) console.warn('[chatbot]', ...args); }
function err(...args) { console.error('[chatbot]', ...args); }

// Ensure data file exists
function ensureDataFile() {
    try {
        const dir = path.dirname(DATA_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            log('Created data directory:', dir);
        }
        if (!fs.existsSync(DATA_PATH)) {
            fs.writeFileSync(DATA_PATH, JSON.stringify({ chatbot: {} }, null, 2), 'utf8');
            log('Created data file at', DATA_PATH);
        }
    } catch (e) {
        err('Failed to ensure data file:', e.message);
        throw e;
    }
}

function loadData() {
    try {
        ensureDataFile();
        const raw = fs.readFileSync(DATA_PATH, 'utf8');
        return JSON.parse(raw || '{}');
    } catch (e) {
        err('loadData error:', e.message);
        return { chatbot: {} };
    }
}
function saveData(data) {
    try {
        ensureDataFile();
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        err('saveData error:', e.message);
    }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function randomDelay(min = 800, max = 2200) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
async function showTyping(sock, chatId) {
    try {
        await sock.presenceSubscribe(chatId).catch(()=>{});
        await sock.sendPresenceUpdate('composing', chatId).catch(()=>{});
        await delay(randomDelay());
    } catch (e) {
        warn('showTyping failed:', e.message);
    }
}

// Basic AI call — replace with your own API if you prefer
async function getAIResponse(query) {
    try {
        if (!query || !query.trim()) return null;
        const url = `https://api.dreaded.site/api/chatgpt?text=${encodeURIComponent(query)}`;
        const res = await fetch(url, { timeout: 10000 });
        const data = await res.json();
        // Try common response fields
        return data?.result?.prompt || data?.message || data?.answer || data?.data || (typeof data === 'string' ? data : null);
    } catch (e) {
        warn('getAIResponse error:', e.message);
        return null;
    }
}

async function handleToggleCommand(sock, chatId, msg, option) {
    try {
        const data = loadData();
        const sender = msg.key.participant || msg.key.remoteJid;
        const botJid = sock.user && sock.user.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : null;
        let isAdmin = false;

        if (chatId.endsWith('@g.us')) {
            try {
                const meta = await sock.groupMetadata(chatId);
                isAdmin = meta.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));
            } catch (e) {
                warn('Could not fetch group metadata:', e.message);
            }
        }
        const isOwner = sender === botJid;

        if (!isOwner && !isAdmin) {
            await showTyping(sock, chatId);
            return sock.sendMessage(chatId, { text: '❌ Only group admins or the bot owner can use this command.', quoted: msg });
        }

        if (!option || !['on','off'].includes(option)) {
            await showTyping(sock, chatId);
            return sock.sendMessage(chatId, {
                text: `*Chatbot setup*\n\n.chatbot on — enable\n.chatbot off — disable`,
                quoted: msg
            });
        }

        if (option === 'on') {
            data.chatbot = data.chatbot || {};
            data.chatbot[chatId] = true;
            saveData(data);
            log('Chatbot enabled for', chatId);
            await showTyping(sock, chatId);
            return sock.sendMessage(chatId, { text: '✅ Chatbot enabled for this group.', quoted: msg });
        } else {
            data.chatbot = data.chatbot || {};
            if (data.chatbot[chatId]) {
                delete data.chatbot[chatId];
                saveData(data);
            }
            log('Chatbot disabled for', chatId);
            await showTyping(sock, chatId);
            return sock.sendMessage(chatId, { text: '❌ Chatbot disabled for this group.', quoted: msg });
        }
    } catch (e) {
        err('handleToggleCommand error:', e.message);
        try { await sock.sendMessage(chatId, { text: '⚠️ Error handling chatbot command.', quoted: msg }); } catch {}
    }
}

/**
 * Attempt to handle an incoming message for the chatbot.
 * Will reply if the bot is mentioned or the message is a reply to the bot (in groups).
 * Returns true if a reply was attempted (useful for testing).
 */
async function tryAutoReply(sock, chatId, msg, text) {
    try {
        if (!msg || !msg.message) return false;
        const data = loadData();
        if (!data.chatbot || !data.chatbot[chatId]) {
            log('chatbot disabled for', chatId);
            return false;
        }

        const botJid = sock.user && sock.user.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : null;
        if (!botJid) {
            warn('Bot JID not available on socket yet.');
            return false;
        }

        let mentioned = false;
        let replyToBot = false;

        if (msg.message.extendedTextMessage) {
            const ctx = msg.message.extendedTextMessage.contextInfo || {};
            const mentionedJid = ctx.mentionedJid || [];
            const quotedParticipant = ctx.participant;
            mentioned = mentionedJid.includes(botJid);
            replyToBot = quotedParticipant === botJid;
        } else if (msg.message.conversation) {
            mentioned = (text || '').includes(`@${botJid.split('@')[0]}`);
        }

        if (!mentioned && !replyToBot) {
            log('Not mentioned / not replyToBot; no action.');
            return false;
        }

        // Clean text
        let clean = (text || '').replace(new RegExp(`@${botJid.split('@')[0]}`, 'g'), '').trim();
        if (!clean) clean = text || '';

        log('Preparing reply (clean):', clean.slice(0,200));

        // Simulate typing
        await showTyping(sock, chatId);

        // Get AI response
        const ai = await getAIResponse(clean);
        const reply = ai || "🤖 Sorry, I couldn't think of a response right now.";

        // random human delay
        await delay(randomDelay(500, 1500));
        await sock.sendMessage(chatId, { text: reply }, { quoted: msg });

        log('Replied to', chatId);
        return true;
    } catch (e) {
        err('tryAutoReply error:', e.message);
        try { await sock.sendMessage(chatId, { text: '⚠️ Chatbot encountered an error while replying.', quoted: msg }); } catch {}
        return false;
    }
}

// EXPORTS

/**
 * execute(sock, chatId, msg, args)
 * call this when user types ".chatbot on" or ".chatbot off"
 */
async function execute(sock, chatId, msg, args = []) {
    const option = args[0] ? String(args[0]).toLowerCase() : null;
    return handleToggleCommand(sock, chatId, msg, option);
}

/**
 * register(sock)
 * convenience helper that binds to messages.upsert for you.
 * If you prefer manual hooking, call tryAutoReply in your message loop instead.
 */
function register(sock) {
    if (!sock || !sock.ev || typeof sock.ev.on !== 'function') {
        throw new Error('Please pass a Baileys socket (sock) with .ev.on to register.');
    }
    // listens to incoming messages and passes them to tryAutoReply
    sock.ev.on('messages.upsert', async (m) => {
        try {
            const messages = m.messages || [];
            for (const msg of messages) {
                if (!msg.message) continue;
                const from = msg.key.remoteJid;
                const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || '';
                // Avoid system messages
                if (msg.key && msg.key.fromMe) continue;
                await tryAutoReply(sock, from, msg, text);
            }
        } catch (e) {
            warn('messages.upsert handler error:', e.message);
        }
    });
    log('Registered auto-reply handler on socket.');
}

module.exports = {
    name: 'chatbot',
    alias: ['chat'],
    desc: 'Enable/disable group chatbot and auto-reply when mentioned',
    execute,
    register,
    // Export tryAutoReply in case you want to call manually from your message event
    tryAutoReply,
};
