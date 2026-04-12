const config = require('../config')
const { cmd, commands } = require('../command')

// COMMAND: OPEN GROUP IMMEDIATELY
cmd({
    pattern: "open",
    alias: ["openanytime"],
    react: "🔓",
    desc: "Open group to all members immediately",
    category: "group",
    use: '.open',
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("This command is only for groups.")
        if (!isAdmins) return reply("You must be an admin to use this.")
        if (!isBotAdmins) return reply("The bot must be an admin to change group settings.")

        await conn.groupSettingUpdate(from, 'not_announcement')
        return reply("*GROUP OPENED* 🔓\nAll members can now send messages.")
        
    } catch (e) {
        reply('*Error !!*')
        console.log(e)
    }
})

// COMMAND: CLOSE GROUP IMMEDIATELY
cmd({
    pattern: "close",
    alias: ["closeanytime"],
    react: "🔐",
    desc: "Close group to admins only immediately",
    category: "group",
    use: '.close',
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("This command is only for groups.")
        if (!isAdmins) return reply("You must be an admin to use this.")
        if (!isBotAdmins) return reply("The bot must be an admin to change group settings.")

        await conn.groupSettingUpdate(from, 'announcement')
        return reply("*GROUP CLOSED* 🔐\nOnly admins can now send messages.")
        
    } catch (e) {
        reply('*Error !!*')
        console.log(e)
    }
})
