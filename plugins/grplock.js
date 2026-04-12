const config = require('../config')
const { cmd, commands } = require('../command')

// Helper function to check admin status manually
async function checkAdmin(conn, from, sender) {
    const groupMetadata = await conn.groupMetadata(from)
    const admins = groupMetadata.participants
        .filter(p => p.admin !== null)
        .map(p => p.id)
    return admins.includes(sender)
}

// COMMAND: OPEN
cmd({
    pattern: "open",
    react: "🔓",
    desc: "Open group immediately",
    category: "group",
    use: '.open',
    filename: __filename
}, async (conn, mek, m, { from, sender, isGroup, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("This is for groups only.")
        
        // Manual Admin Check
        const realAdmin = await checkAdmin(conn, from, sender)
        if (!realAdmin) return reply("You must be an admin to use this.")
        
        if (!isBotAdmins) return reply("I need admin rights to open the group.")

        await conn.groupSettingUpdate(from, 'not_announcement')
        return reply("*GROUP OPENED* 🔓\nMembers can now chat.")
    } catch (e) {
        reply('*Error !!*')
    }
})

// COMMAND: CLOSE
cmd({
    pattern: "close",
    react: "🔐",
    desc: "Close group immediately",
    category: "group",
    use: '.close',
    filename: __filename
}, async (conn, mek, m, { from, sender, isGroup, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("This is for groups only.")
        
        // Manual Admin Check
        const realAdmin = await checkAdmin(conn, from, sender)
        if (!realAdmin) return reply("You must be an admin to use this.")
        
        if (!isBotAdmins) return reply("I need admin rights to close the group.")

        await conn.groupSettingUpdate(from, 'announcement')
        return reply("*GROUP CLOSED* 🔐\nOnly admins can chat now.")
    } catch (e) {
        reply('*Error !!*')
    }
})
