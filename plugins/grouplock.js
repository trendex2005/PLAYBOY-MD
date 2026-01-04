cmd({
    pattern: "open",
    react: "🔓",
    desc: "Open group immediately",
    category: "group",
    use: '.open',
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, reply }) => {
    try {
        if (!isGroup) return reply(ONLGROUP)
        if (!isAdmins) return reply(ADMIN)

        await conn.groupSettingUpdate(from, 'not_announcement')
        reply(`*OPEN GROUP* ✅\nMembers can now send messages 🔓`)
        await conn.sendMessage(from, { react: { text: `✅`, key: mek.key }})
    } catch (e) {
        reply('*Error !!*')
        l(e)
    }
})

cmd({
    pattern: "close",
    react: "🔐",
    desc: "Close group immediately",
    category: "group",
    use: '.close',
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, reply }) => {
    try {
        if (!isGroup) return reply(ONLGROUP)
        if (!isAdmins) return reply(ADMIN)

        await conn.groupSettingUpdate(from, 'announcement')
        reply(`*CLOSE GROUP* ✅\nOnly admins can send messages 🔐`)
        await conn.sendMessage(from, { react: { text: `✅`, key: mek.key }})
    } catch (e) {
        reply('*Error !!*')
        l(e)
    }
})
