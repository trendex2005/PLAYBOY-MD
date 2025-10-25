const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

// In-memory data
const chatMemory = {
    messages: new Map(),
    userInfo: new Map()
};

// Load user/group chatbot data
function loadUserGroupData() {
    try {
        return JSON.parse(fs.readFileSync(USER_GROUP_DATA));
    } catch (error) {
        console.error('❌ Error loading user group data:', error.message);
        return { groups: [], chatbot: {} };
    }
}

// Save user/group chatbot data
function saveUserGroupData(data) {
    try {
        fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Error saving user group data:', error.message);
    }
}

// Simulate human typing
function getRandomDelay() {
    return Math.floor(Math.random() * 3000) + 2000;
}

async function showTyping(sock, chatId) {
    try {
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
    } catch (error) {
        console.error('Typing indicator error:', error);
    }
}

// Extract user info (name, age, location)
function extractUserInfo(message) {
    const info = {};
    if (message.toLowerCase().includes('my name is')) {
        info.name = message.split('my name is')[1].trim().split(' ')[0];
    }
    if (message.toLowerCase().includes('i am') && message.toLowerCase().includes('years old')) {
        info.age = message.match(/\d+/)?.[0];
    }
    if (message.toLowerCase().includes('i live in') || message.toLowerCase().includes('i am from')) {
        info.location = message.split(/(?:i live in|i am from)/i)[1].trim().split(/[.,!?]/)[0];
    }
    return info;
}

// Simple AI responder (you can replace with real API)
async function getAIResponse(query, context = {}) {
    try {
        const api = `https://api.dreaded.site/api/chatgpt?text=${encodeURIComponent(query)}`;
        const res = await fetch(api);
        const data = await res.json();
        return data?.result?.prompt || data?.message || data?.answer || null;
    } catch (error) {
        console.error('AI API Error:', error.message);
        return null;
    }
}

async function handleChatbotCommand(sock, chatId, message, match) {
    if (!match) {
        await showTyping(sock, chatId);
        return sock.sendMessage(chatId, {
            text: `*CHATBOT SETUP*\n\n*.chatbot on*\nEnable chatbot\n\n*.chatbot off*\nDisable chatbot in this group`,
            quoted: message
        });
    }

    const data = loadUserGroupData();
    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const senderId = message.key.participant || message.participant || message.key.remoteJid;
    const isOwner = senderId === botNumber;

    let isAdmin = false;
    if (chatId.endsWith('@g.us')) {
        try {
            const groupMetadata = await sock.groupMetadata(chatId);
            isAdmin = groupMetadata.participants.some(
                p => p.id === senderId && (p.admin === 'admin' || p.admin === 'superadmin')
            );
        } catch {
            console.warn('⚠️ Could not fetch group metadata. Bot might not be admin.');
        }
    }

    if (!isOwner && !isAdmin) {
        await showTyping(sock, chatId);
        return sock.sendMessage(chatId, {
            text: '❌ Only group admins or the bot owner can use this command.',
            quoted: message
        });
    }

    if (match === 'on') {
        await showTyping(sock, chatId);
        if (data.chatbot[chatId]) {
            return sock.sendMessage(chatId, { text: '*Chatbot is already enabled*', quoted: message });
        }
        data.chatbot[chatId] = true;
        saveUserGroupData(data);
        console.log(`✅ Chatbot enabled for group ${chatId}`);
        return sock.sendMessage(chatId, { text: '*Chatbot enabled successfully!*', quoted: message });
    }

    if (match === 'off') {
        await showTyping(sock, chatId);
        if (!data.chatbot[chatId]) {
            return sock.sendMessage(chatId, { text: '*Chatbot is already disabled*', quoted: message });
        }
        delete data.chatbot[chatId];
        saveUserGroupData(data);
        console.log(`✅ Chatbot disabled for group ${chatId}`);
        return sock.sendMessage(chatId, { text: '*Chatbot disabled successfully!*', quoted: message });
    }

    return sock.sendMessage(chatId, { text: '*Invalid usage. Try .chatbot on/off*', quoted: message });
}

async function handleChatbotResponse(sock, chatId, message, userMessage, senderId) {
    const data = loadUserGroupData();
    if (!data.chatbot[chatId]) return;

    try {
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        let isBotMentioned = false;
        let isReplyToBot = false;

        if (message.message?.extendedTextMessage) {
            const ctx = message.message.extendedTextMessage.contextInfo || {};
            const mentionedJid = ctx.mentionedJid || [];
            const quotedParticipant = ctx.participant;
            isBotMentioned = mentionedJid.includes(botNumber);
            isReplyToBot = quotedParticipant === botNumber;
        } else if (message.message?.conversation) {
            isBotMentioned = userMessage.includes(`@${botNumber.split('@')[0]}`);
        }

        if (!isBotMentioned && !isReplyToBot) return;

        let cleanedMessage = userMessage.replace(new RegExp(`@${botNumber.split('@')[0]}`, 'g'), '').trim();

        if (!chatMemory.messages.has(senderId)) {
            chatMemory.messages.set(senderId, []);
            chatMemory.userInfo.set(senderId, {});
        }

        const userInfo = extractUserInfo(cleanedMessage);
        if (Object.keys(userInfo).length > 0) {
            chatMemory.userInfo.set(senderId, {
                ...chatMemory.userInfo.get(senderId),
                ...userInfo
            });
        }

        const messages = chatMemory.messages.get(senderId);
        messages.push(cleanedMessage);
        if (messages.length > 20) messages.shift();
        chatMemory.messages.set(senderId, messages);

        await showTyping(sock, chatId);

        const response = await getAIResponse(cleanedMessage, {
            messages,
            userInfo: chatMemory.userInfo.get(senderId)
        });

        if (!response) {
            await sock.sendMessage(chatId, {
                text: "Hmm 🤔 I'm having trouble processing that right now.",
                quoted: message
            });
            return;
        }

        await new Promise(resolve => setTimeout(resolve, getRandomDelay()));

        await sock.sendMessage(chatId, { text: response }, { quoted: message });

    } catch (error) {
        console.error('❌ Chatbot error:', error.message);
        await sock.sendMessage(chatId, {
            text: "Oops 😅 something went wrong. Try again later.",
            quoted: message
        });
    }
}

// Export as CommonJS plugin command
module.exports = {
    name: 'chatbot',
    alias: ['ai-chat'],
    category: 'ai',
    desc: 'Enable or disable chatbot in group',
    async execute(sock, chatId, message, args) {
        const match = args[0] ? args[0].toLowerCase() : null;
        await handleChatbotCommand(sock, chatId, message, match);
    },
    async onMessage(sock, chatId, message, userMessage, senderId) {
        // This function should be called automatically when any message is received
        await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
    }
};
