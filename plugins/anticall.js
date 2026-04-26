const { cmd } = require("../command");
const config = require("../config");

const recentCallers = new Set();
let antiCallRegistered = false;

cmd({ on: "body" }, async (client) => {
    if (antiCallRegistered) return;
    antiCallRegistered = true;

    client.ev.on("call", async (callData) => {
        try {
            if (!config.ANTI_CALL) return;

            for (const call of callData) {
                if (call.status === "offer" && !call.isGroup) {
                    await client.rejectCall(call.id, call.from);

                    if (!recentCallers.has(call.from)) {
                        recentCallers.add(call.from);

                        await client.sendMessage(call.from, {
                            text: "```Hii this is TREND-X a Personal Assistant!! Sorry for now, we cannot receive calls. If you need help or want to request features, please chat the owner.``` ⚠️"
                        });

                        setTimeout(() => recentCallers.delete(call.from), 600000);
                    }
                }
            }
        } catch (error) {
            console.error("Call rejection error:", error);
        }
    });
});

cmd({
    pattern: "anticall",
    alias: ["callblock", "togglecall"],
    desc: "Toggle call blocking feature",
    category: "owner",
    react: "📞",
    filename: __filename,
    fromMe: true
},
async (client, message, m, { isOwner, from, sender, args }) => {
    try {
        if (!isOwner) {
            return client.sendMessage(from, {
                text: "🚫 Owner-only command",
                mentions: [sender]
            }, { quoted: message });
        }

        const action = args[0]?.toLowerCase() || "status";
        let statusText;
        let reaction = "📞";
        let additionalInfo = "";

        switch (action) {
            case "on":
                if (config.ANTI_CALL) {
                    statusText = "Anti-call is already *enabled* ✅";
                    reaction = "ℹ️";
                } else {
                    config.ANTI_CALL = true;
                    statusText = "Anti-call has been *enabled* ✅";
                    reaction = "✅";
                    additionalInfo = "Calls will be automatically rejected 🔇";
                }
                break;

            case "off":
                if (!config.ANTI_CALL) {
                    statusText = "Anti-call is already *disabled* 📳";
                    reaction = "ℹ️";
                } else {
                    config.ANTI_CALL = false;
                    statusText = "Anti-call has been *disabled* 📛";
                    reaction = "❌";
                    additionalInfo = "Calls will be accepted";
                }
                break;

            default:
                statusText = `Anti-call Status: ${config.ANTI_CALL ? "✅ *ENABLED*" : "❌ *DISABLED*"}`;
                additionalInfo = config.ANTI_CALL
                    ? "Calls are being blocked"
                    : "Calls are allowed";
                break;
        }

        await client.sendMessage(from, {
            image: { url: "https://files.catbox.moe/adymbp.jpg" },
            caption: `${statusText}\n\n${additionalInfo}\n\n_TRENDEX_`,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363408776497275@newsletter",
                    newsletterName: "TRENDEX🌟",
                    serverMessageId: 143
                }
            }
        }, { quoted: message });

        await client.sendMessage(from, {
            react: { text: reaction, key: message.key }
        });

    } catch (error) {
        console.error("Anti-call command error:", error);
        await client.sendMessage(from, {
            text: `⚠️ Error: ${error.message}`,
            mentions: [sender]
        }, { quoted: message });
    }
});
