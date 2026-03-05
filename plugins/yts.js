const { cmd } = require('../command');
const axios = require('axios');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const fs = require('fs');
const path = require('path');

cmd({
    pattern: "play",
    alias: ["song", "ytplay", "music", "video", "ytvideo"],
    desc: "Download YouTube videos or audio",
    category: "download",
    use: ".play <song name> or .play video <song name>",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("❌ Please provide a song name!\n\n*Examples:*\n.play Alan Walker Faded (audio)\n.play video Alan Walker Faded (video)");

        // Check if user wants video or audio
        let isVideo = false;
        let searchQuery = q;
        
        if (q.toLowerCase().startsWith('video ')) {
            isVideo = true;
            searchQuery = q.substring(6).trim();
        } else if (q.toLowerCase().startsWith('audio ')) {
            searchQuery = q.substring(6).trim();
        }

        const startTime = Date.now();
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        
        // Send initial status
        const statusMsg = await reply(`🔍 *Searching:* ${searchQuery}\n⏱️ Please wait...`);

        // Step 1: Search for the video
        const searchResults = await ytSearch(searchQuery);
        
        if (!searchResults || !searchResults.videos || searchResults.videos.length === 0) {
            return reply("❌ No results found. Try different keywords.");
        }

        // Get the best match
        const video = searchResults.videos[0];
        
        const videoInfo = {
            title: video.title,
            url: video.url,
            duration: video.timestamp,
            views: formatNumber(video.views),
            thumbnail: video.thumbnail,
            author: video.author.name,
            uploaded: video.ago,
            videoId: video.videoId
        };

        // Update status
        await conn.sendMessage(from, {
            text: `📥 *Processing ${isVideo ? 'VIDEO' : 'AUDIO'}:*\n🎵 ${videoInfo.title}\n👤 ${videoInfo.author}\n⏱️ Duration: ${videoInfo.duration}\n\n⏳ Getting ${isVideo ? 'video' : 'audio'}...`,
            edit: statusMsg.key
        });

        let mediaBuffer = null;
        let downloadMethod = '';
        let errorLog = [];

        // METHOD 1: Try y2mate API (most reliable for both audio/video)
        const y2mateApis = [
            {
                name: 'Y2Mate API 1',
                url: `https://y2mate.guru/api/convert?url=${encodeURIComponent(video.url)}&format=${isVideo ? 'mp4' : 'mp3'}`
            },
            {
                name: 'Y2Mate API 2',
                url: `https://y2mate.ch/api/v1/convert?url=${encodeURIComponent(video.url)}&type=${isVideo ? 'video' : 'audio'}`
            }
        ];

        for (const api of y2mateApis) {
            try {
                console.log(`Attempting ${api.name}...`);
                const response = await axios.get(api.url, { timeout: 15000 });
                
                if (response.data && response.data.download_url) {
                    const mediaResponse = await axios.get(response.data.download_url, {
                        responseType: 'arraybuffer',
                        timeout: 60000
                    });
                    mediaBuffer = Buffer.from(mediaResponse.data);
                    downloadMethod = api.name;
                    console.log(`✅ ${api.name} success`);
                    break;
                }
            } catch (err) {
                errorLog.push(`${api.name}: ${err.message}`);
            }
        }

        // METHOD 2: Try SSYoutube API
        if (!mediaBuffer) {
            try {
                console.log("Attempting SSYoutube API...");
                const ssyApi = `https://api.ssyoutube.com/api/v1/${isVideo ? 'getVideo' : 'getAudio'}?url=${encodeURIComponent(video.url)}`;
                const response = await axios.get(ssyApi, { timeout: 15000 });
                
                if (response.data && response.data.url) {
                    const mediaResponse = await axios.get(response.data.url, {
                        responseType: 'arraybuffer',
                        timeout: 60000
                    });
                    mediaBuffer = Buffer.from(mediaResponse.data);
                    downloadMethod = 'SSYoutube';
                }
            } catch (err) {
                errorLog.push(`SSYoutube: ${err.message}`);
            }
        }

        // METHOD 3: Try multiple download APIs
        const downloadApis = [
            {
                name: 'API 1',
                url: `https://api.davidcyriltech.my.id/download/${isVideo ? 'ytvideo' : 'ytmp3'}?url=${encodeURIComponent(video.url)}`,
                parse: (data) => data.downloadUrl || data.url
            },
            {
                name: 'API 2',
                url: `https://api.siputzx.my.id/api/d/${isVideo ? 'ytmp4' : 'ytmp3'}?url=${encodeURIComponent(video.url)}`,
                parse: (data) => data.data?.download
            },
            {
                name: 'API 3',
                url: `https://api.ryzendesu.vip/api/downloader/yt?url=${encodeURIComponent(video.url)}&type=${isVideo ? 'mp4' : 'mp3'}`,
                parse: (data) => data.url || data.download
            },
            {
                name: 'API 4',
                url: `https://api.agatz.xyz/api/yt?url=${encodeURIComponent(video.url)}`,
                parse: (data) => isVideo ? data.video : data.audio
            },
            {
                name: 'API 5',
                url: `https://ytdl.guruapi.tech/api/${isVideo ? 'ytmp4' : 'ytmp3'}?url=${encodeURIComponent(video.url)}`,
                parse: (data) => data.result?.download
            }
        ];

        for (const api of downloadApis) {
            if (mediaBuffer) break;
            
            try {
                console.log(`Attempting ${api.name}...`);
                const response = await axios.get(api.url, { 
                    timeout: 15000,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                
                if (response.data) {
                    const downloadUrl = api.parse(response.data);
                    
                    if (downloadUrl) {
                        const mediaResponse = await axios.get(downloadUrl, {
                            responseType: 'arraybuffer',
                            timeout: 60000,
                            headers: { 'User-Agent': 'Mozilla/5.0' }
                        });
                        mediaBuffer = Buffer.from(mediaResponse.data);
                        downloadMethod = api.name;
                        console.log(`✅ ${api.name} success`);
                        break;
                    }
                }
            } catch (err) {
                errorLog.push(`${api.name}: ${err.message}`);
            }
        }

        // METHOD 4: Try ytdl-core as last resort
        if (!mediaBuffer) {
            try {
                console.log(`Attempting ytdl-core ${isVideo ? 'video' : 'audio'} download...`);
                
                const options = isVideo ? 
                    { quality: 'lowest', filter: 'videoandaudio' } : 
                    { filter: 'audioonly', quality: 'highestaudio' };
                
                // Get info first
                const info = await ytdl.getInfo(video.url);
                let format;
                
                if (isVideo) {
                    // Try to find a format with both video and audio
                    format = ytdl.chooseFormat(info.formats, { quality: '18' }); // 360p with audio
                    if (!format) {
                        format = ytdl.chooseFormat(info.formats, { quality: 'lowest' });
                    }
                } else {
                    format = ytdl.chooseFormat(info.formats, { filter: 'audioonly' });
                }
                
                if (format && format.url) {
                    const response = await axios.get(format.url, {
                        responseType: 'arraybuffer',
                        timeout: 60000,
                        headers: { 
                            'User-Agent': 'Mozilla/5.0',
                            'Range': 'bytes=0-'
                        }
                    });
                    mediaBuffer = Buffer.from(response.data);
                    downloadMethod = 'ytdl-core';
                    console.log(`✅ ytdl-core success: ${mediaBuffer.length} bytes`);
                }
            } catch (err) {
                errorLog.push(`ytdl-core: ${err.message}`);
            }
        }

        // METHOD 5: Try direct download from YouTube
        if (!mediaBuffer) {
            try {
                console.log("Attempting direct download...");
                const directApi = `https://youtube.com/watch?v=${video.videoId}`;
                const response = await axios.get(directApi, { 
                    responseType: 'arraybuffer',
                    timeout: 30000,
                    headers: { 
                        'User-Agent': 'Mozilla/5.0',
                        'Accept': 'video/mp4'
                    }
                });
                mediaBuffer = Buffer.from(response.data);
                downloadMethod = 'Direct';
            } catch (err) {
                errorLog.push(`Direct: ${err.message}`);
            }
        }

        // If all methods fail
        if (!mediaBuffer) {
            console.log("All download methods failed:", errorLog);
            
            // Generate alternative download links
            const altLinks = [
                `https://www.y2mate.com/youtube/${video.videoId}`,
                `https://en.savefrom.net/${video.videoId}/`,
                `https://loader.to/api/button/?url=${video.url}&f=${isVideo ? 'mp4' : 'mp3'}`,
                `https://yt1s.com/en/youtube-to-${isVideo ? 'mp4' : 'mp3'}?q=${video.videoId}`
            ];

            const errorMessage = `❌ *Download Failed*\n\n` +
                `🎵 *Title:* ${videoInfo.title}\n` +
                `👤 *Channel:* ${videoInfo.author}\n` +
                `⏱️ *Duration:* ${videoInfo.duration}\n` +
                `👀 *Views:* ${videoInfo.views}\n\n` +
                `⚠️ Could not download ${isVideo ? 'video' : 'audio'} at this time.\n\n` +
                `🔗 *Watch on YouTube:*\n${videoInfo.url}\n\n` +
                `📱 *Alternative Download Sites:*\n` +
                altLinks.map((link, i) => `${i+1}. ${link}`).join('\n') + '\n\n' +
                `💡 *Tips:*\n` +
                `• Try .play audio ${searchQuery}\n` +
                `• Try .play video ${searchQuery}\n` +
                `• Use different keywords\n` +
                `• Download manually from the links above`;
            
            return await conn.sendMessage(from, {
                image: { url: videoInfo.thumbnail },
                caption: errorMessage,
                contextInfo: {
                    externalAdReply: {
                        title: videoInfo.title.substring(0, 30),
                        body: `👤 ${videoInfo.author} • ⏱️ ${videoInfo.duration}`,
                        thumbnailUrl: videoInfo.thumbnail,
                        sourceUrl: videoInfo.url,
                        mediaType: 1
                    }
                }
            }, { quoted: mek });
        }

        // Calculate stats
        const downloadTime = ((Date.now() - startTime) / 1000).toFixed(1);
        const fileSize = (mediaBuffer.length / (1024 * 1024)).toFixed(2);

        // Prepare caption
        const caption = `╭══━ ★ *GURU-MD ${isVideo ? 'VIDEO' : 'PLAYER'}* ★ ━══╮\n\n` +
            `🎵 *Title:* ${videoInfo.title}\n` +
            `👤 *Channel:* ${videoInfo.author}\n` +
            `⏱️ *Duration:* ${videoInfo.duration}\n` +
            `👀 *Views:* ${videoInfo.views}\n` +
            `📅 *Uploaded:* ${videoInfo.uploaded}\n` +
            `📦 *Size:* ${fileSize} MB\n` +
            `⚡ *Speed:* ${downloadTime}s\n` +
            `🔧 *Method:* ${downloadMethod}\n\n` +
            `╰══━ ★ *Powered By GuruTech* ★ ━══╯`;

        // Send based on type
        if (isVideo) {
            await conn.sendMessage(from, {
                video: mediaBuffer,
                mimetype: 'video/mp4',
                fileName: `${videoInfo.title.replace(/[^\w\s]/gi, '')}.mp4`,
                caption: caption,
                contextInfo: {
                    externalAdReply: {
                        title: videoInfo.title.substring(0, 30),
                        body: `👤 ${videoInfo.author} • ⏱️ ${videoInfo.duration}`,
                        thumbnailUrl: videoInfo.thumbnail,
                        sourceUrl: videoInfo.url,
                        mediaType: 2
                    }
                }
            }, { quoted: mek });
        } else {
            await conn.sendMessage(from, {
                audio: mediaBuffer,
                mimetype: 'audio/mpeg',
                fileName: `${videoInfo.title.replace(/[^\w\s]/gi, '')}.mp3`,
                caption: caption,
                contextInfo: {
                    externalAdReply: {
                        title: videoInfo.title.substring(0, 30),
                        body: `👤 ${videoInfo.author} • ⏱️ ${videoInfo.duration}`,
                        thumbnailUrl: videoInfo.thumbnail,
                        sourceUrl: videoInfo.url,
                        mediaType: 2,
                        renderLargerThumbnail: false
                    }
                }
            }, { quoted: mek });
        }

        // Send success reaction
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        // Send thumbnail as view once
        await conn.sendMessage(from, {
            image: { url: videoInfo.thumbnail },
            caption: `🎵 *${isVideo ? 'Video' : 'Audio'} Ready:*\n> ${videoInfo.title}\n> ${videoInfo.author}\n\n> © ᴄʀᴇᴀᴛᴇᴅ ʙʏ GuruTech`,
            viewOnce: true
        }, { quoted: mek });

    } catch (error) {
        console.error("Play command error:", error);
        
        let errorMsg = "❌ An error occurred.\n\n";
        
        if (error.message.includes('yt-search')) {
            errorMsg += "Search service unavailable. Please try again later.";
        } else if (error.message.includes('network')) {
            errorMsg += "Network error. Check your internet connection.";
        } else if (error.message.includes('timeout')) {
            errorMsg += "Request timeout. The service is slow, try again.";
        } else {
            errorMsg += error.message || "Unknown error";
        }
        
        errorMsg += "\n\n🔄 Try using different keywords or .play video/audio command.";
        
        await reply(errorMsg);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});

// Helper function to format views
function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// Quick audio download command
cmd({
    pattern: "yt",
    alias: ["ytaudio", "ytmp3"],
    desc: "Quick YouTube audio download",
    category: "download",
    use: ".yt <song name>",
    react: "🎧",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("❌ Provide a song name!");
        
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        
        const search = await ytSearch(q);
        if (!search.videos.length) return reply("❌ No results found!");
        
        const video = search.videos[0];
        
        // Try direct API first
        try {
            const apiUrl = `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(video.url)}`;
            const response = await axios.get(apiUrl, { timeout: 10000 });
            
            if (response.data && response.data.downloadUrl) {
                await conn.sendMessage(from, {
                    audio: { url: response.data.downloadUrl },
                    mimetype: 'audio/mpeg',
                    fileName: `${video.title}.mp3`,
                    caption: `🎵 *${video.title}*\n👤 ${video.author.name}\n⏱️ ${video.timestamp}`
                }, { quoted: mek });
                
                await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
                return;
            }
        } catch (err) {
            console.log("Quick API failed, trying ytdl...");
        }
        
        // Fallback to ytdl
        const info = await ytdl.getInfo(video.url);
        const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly' });
        
        await conn.sendMessage(from, {
            audio: { url: format.url },
            mimetype: 'audio/mpeg',
            fileName: `${video.title}.mp3`,
            caption: `🎵 *${video.title}*\n👤 ${video.author.name}\n⏱️ ${video.timestamp}`
        }, { quoted: mek });
        
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
        
    } catch (error) {
        console.error("YT command error:", error);
        reply("❌ Error: " + error.message);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});

// Video download command
cmd({
    pattern: "video",
    alias: ["ytvideo", "ytmp4"],
    desc: "Download YouTube video",
    category: "download",
    use: ".video <song name>",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("❌ Provide a video name!");
        
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        
        const search = await ytSearch(q);
        if (!search.videos.length) return reply("❌ No results found!");
        
        const video = search.videos[0];
        
        // Try API first
        try {
            const apiUrl = `https://api.davidcyriltech.my.id/download/ytvideo?url=${encodeURIComponent(video.url)}`;
            const response = await axios.get(apiUrl, { timeout: 10000 });
            
            if (response.data && response.data.downloadUrl) {
                await conn.sendMessage(from, {
                    video: { url: response.data.downloadUrl },
                    mimetype: 'video/mp4',
                    caption: `🎬 *${video.title}*\n👤 ${video.author.name}\n⏱️ ${video.timestamp}`
                }, { quoted: mek });
                
                await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
                return;
            }
        } catch (err) {
            console.log("Video API failed, trying ytdl...");
        }
        
        // Fallback to ytdl
        const info = await ytdl.getInfo(video.url);
        const format = ytdl.chooseFormat(info.formats, { quality: '18' }); // 360p
        
        await conn.sendMessage(from, {
            video: { url: format.url },
            mimetype: 'video/mp4',
            caption: `🎬 *${video.title}*\n👤 ${video.author.name}\n⏱️ ${video.timestamp}`
        }, { quoted: mek });
        
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
        
    } catch (error) {
        console.error("Video command error:", error);
        reply("❌ Error: " + error.message);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});

// API status check
cmd({
    pattern: "apistatus",
    alias: ["checkapi"],
    desc: "Check YouTube download APIs status",
    category: "tools",
    react: "🔌",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const apis = [
        { name: 'Y2Mate', url: 'https://y2mate.guru/api', type: 'remote' },
        { name: 'David Cyril', url: 'https://api.davidcyriltech.my.id', type: 'remote' },
        { name: 'Siputzx', url: 'https://api.siputzx.my.id', type: 'remote' },
        { name: 'Ryzendesu', url: 'https://api.ryzendesu.vip', type: 'remote' },
        { name: 'ytdl-core', url: null, type: 'local' }
    ];
    
    let statusMsg = "🔌 *API Status Check*\n\n";
    
    for (const api of apis) {
        if (api.type === 'local') {
            statusMsg += `✅ ${api.name}: Available (Local)\n`;
        } else {
            try {
                await axios.get(api.url, { timeout: 5000 });
                statusMsg += `✅ ${api.name}: Online\n`;
            } catch {
                statusMsg += `❌ ${api.name}: Offline\n`;
            }
        }
    }
    
    statusMsg += "\n> *Usage:*\n";
    statusMsg += "• .play <song> - Audio\n";
    statusMsg += "• .play video <song> - Video\n";
    statusMsg += "• .yt <song> - Quick audio\n";
    statusMsg += "• .video <song> - Quick video\n\n";
    statusMsg += "> © GURU-TECH";
    
    await reply(statusMsg);
});
