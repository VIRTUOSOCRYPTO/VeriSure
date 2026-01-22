const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Emoji indicators
const RISK_EMOJIS = {
    high: '🔴',
    medium: '🟡',
    low: '🟢'
};

const CONFIDENCE_EMOJIS = {
    high: '✅',
    medium: '⚠️',
    low: '❓'
};

// Message handler
class MessageHandler {
    // Handle incoming WhatsApp message
    async handleMessage(sock, message, rateLimiter, backendApiUrl, apiKey, logger) {
        try {
            const chatId = message.key.remoteJid;
            const phoneNumber = chatId.split('@')[0];
            
            // Extract message content
            const messageType = Object.keys(message.message || {})[0];
            
            // Handle text commands
            if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
                const text = message.message.conversation || message.message.extendedTextMessage?.text || '';
                const textLower = text.toLowerCase().trim();

                // Help command
                if (textLower === 'help' || textLower === '/help') {
                    await this.sendHelpMessage(sock, chatId);
                    return;
                }

                // Status command
                if (textLower.startsWith('status ') || textLower.startsWith('/status ')) {
                    const jobId = textLower.replace(/^\/?(status)\s+/i, '').trim();
                    await this.sendStatusMessage(sock, chatId, jobId, backendApiUrl, logger);
                    return;
                }

                // PDF command
                if (textLower.startsWith('pdf ') || textLower.startsWith('/pdf ')) {
                    const reportId = textLower.replace(/^\/?(pdf)\s+/i, '').trim();
                    await this.sendPdfReport(sock, chatId, reportId, backendApiUrl, logger);
                    return;
                }

                // Regular text analysis
                if (text && text.length > 5) {
                    await this.analyzeText(sock, chatId, phoneNumber, text, rateLimiter, backendApiUrl, apiKey, logger);
                    return;
                }
            }

            // Handle image messages
            if (messageType === 'imageMessage') {
                await this.analyzeImage(sock, chatId, phoneNumber, message, rateLimiter, backendApiUrl, apiKey, logger);
                return;
            }

            // Handle video messages
            if (messageType === 'videoMessage') {
                await this.analyzeVideo(sock, chatId, phoneNumber, message, rateLimiter, backendApiUrl, apiKey, logger);
                return;
            }

            // Handle audio messages
            if (messageType === 'audioMessage') {
                await this.analyzeAudio(sock, chatId, phoneNumber, message, rateLimiter, backendApiUrl, apiKey, logger);
                return;
            }

            // Handle document messages (could be text files)
            if (messageType === 'documentMessage') {
                await this.sendTextMessage(sock, chatId, '📄 Document analysis coming soon! For now, please send images, videos, audio, or text messages.');
                return;
            }

            // Unsupported message type
            await this.sendTextMessage(sock, chatId, '❌ Unsupported message type. Please send:\n\n📝 Text\n🖼️ Images\n🎥 Videos\n🎵 Audio\n\nOr type "help" for commands.');

        } catch (error) {
            logger.error('Message handling error:', error);
            await this.sendTextMessage(sock, message.key.remoteJid, '❌ An error occurred while processing your message. Please try again.');
        }
    }

    // Analyze text content
    async analyzeText(sock, chatId, phoneNumber, text, rateLimiter, backendApiUrl, apiKey, logger) {
        try {
            // Check rate limit
            const canProceed = await rateLimiter.checkAndIncrement(phoneNumber);
            if (!canProceed) {
                const usage = await rateLimiter.getUsage(phoneNumber);
                await this.sendTextMessage(sock, chatId, 
                    `⚠️ *Daily Limit Reached*\n\n` +
                    `You've used ${usage.count}/10 analyses today.\n` +
                    `Limit resets at midnight.\n\n` +
                    `Upgrade for unlimited analyses! 🚀`
                );
                return;
            }

            // Send analyzing message
            await this.sendTextMessage(sock, chatId, '🔍 Analyzing your message... Please wait.');

            // Call backend API
            const formData = new FormData();
            formData.append('input_type', 'text');
            formData.append('content', text);

            const response = await axios.post(`${backendApiUrl}/analyze`, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'X-API-Key': apiKey
                },
                timeout: 60000
            });

            const report = response.data;

            // Format and send response
            await this.sendAnalysisResult(sock, chatId, report, logger);

        } catch (error) {
            logger.error('Text analysis error:', error);
            await this.sendTextMessage(sock, chatId, '❌ Analysis failed. Please try again.');
        }
    }

    // Analyze image content
    async analyzeImage(sock, chatId, phoneNumber, message, rateLimiter, backendApiUrl, apiKey, logger) {
        try {
            // Check rate limit
            const canProceed = await rateLimiter.checkAndIncrement(phoneNumber);
            if (!canProceed) {
                const usage = await rateLimiter.getUsage(phoneNumber);
                await this.sendTextMessage(sock, chatId, 
                    `⚠️ *Daily Limit Reached*\n\n` +
                    `You've used ${usage.count}/10 analyses today.\n` +
                    `Limit resets at midnight.\n\n` +
                    `Upgrade for unlimited analyses! 🚀`
                );
                return;
            }

            // Send analyzing message
            await this.sendTextMessage(sock, chatId, '🔍 Analyzing image... Please wait.');

            // Download image
            const buffer = await this.downloadMedia(sock, message);
            
            // Call backend API
            const formData = new FormData();
            formData.append('input_type', 'file');
            formData.append('file', buffer, {
                filename: 'image.jpg',
                contentType: 'image/jpeg'
            });

            const response = await axios.post(`${backendApiUrl}/analyze`, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'X-API-Key': apiKey
                },
                timeout: 120000
            });

            const report = response.data;

            // Format and send response
            await this.sendAnalysisResult(sock, chatId, report, logger);

        } catch (error) {
            logger.error('Image analysis error:', error);
            await this.sendTextMessage(sock, chatId, '❌ Image analysis failed. Please try again.');
        }
    }

    // Analyze video content (async)
    async analyzeVideo(sock, chatId, phoneNumber, message, rateLimiter, backendApiUrl, apiKey, logger) {
        try {
            // Check rate limit
            const canProceed = await rateLimiter.checkAndIncrement(phoneNumber);
            if (!canProceed) {
                const usage = await rateLimiter.getUsage(phoneNumber);
                await this.sendTextMessage(sock, chatId, 
                    `⚠️ *Daily Limit Reached*\n\n` +
                    `You've used ${usage.count}/10 analyses today.\n` +
                    `Limit resets at midnight.\n\n` +
                    `Upgrade for unlimited analyses! 🚀`
                );
                return;
            }

            // Send analyzing message
            await this.sendTextMessage(sock, chatId, '🎥 Video received! Analyzing... This may take 30-60 seconds.');

            // Download video
            const buffer = await this.downloadMedia(sock, message);
            
            // Call backend API
            const formData = new FormData();
            formData.append('input_type', 'file');
            formData.append('file', buffer, {
                filename: 'video.mp4',
                contentType: 'video/mp4'
            });

            const response = await axios.post(`${backendApiUrl}/analyze`, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'X-API-Key': apiKey
                },
                timeout: 180000
            });

            const result = response.data;

            // Check if it's async job or immediate result
            if (result.job_id) {
                // Async job - send job ID
                await this.sendTextMessage(sock, chatId, 
                    `⏳ *Video analysis in progress*\n\n` +
                    `Job ID: \`${result.job_id}\`\n\n` +
                    `This will take 30-60 seconds.\n` +
                    `Use this command to check status:\n` +
                    `\`status ${result.job_id}\`\n\n` +
                    `I'll notify you when it's ready! ⏰`
                );

                // Poll for completion
                await this.pollJobStatus(sock, chatId, result.job_id, backendApiUrl, logger);
            } else {
                // Immediate result
                await this.sendAnalysisResult(sock, chatId, result, logger);
            }

        } catch (error) {
            logger.error('Video analysis error:', error);
            await this.sendTextMessage(sock, chatId, '❌ Video analysis failed. Please ensure video is under 16MB.');
        }
    }

    // Analyze audio content (async)
    async analyzeAudio(sock, chatId, phoneNumber, message, rateLimiter, backendApiUrl, apiKey, logger) {
        try {
            // Check rate limit
            const canProceed = await rateLimiter.checkAndIncrement(phoneNumber);
            if (!canProceed) {
                const usage = await rateLimiter.getUsage(phoneNumber);
                await this.sendTextMessage(sock, chatId, 
                    `⚠️ *Daily Limit Reached*\n\n` +
                    `You've used ${usage.count}/10 analyses today.\n` +
                    `Limit resets at midnight.\n\n` +
                    `Upgrade for unlimited analyses! 🚀`
                );
                return;
            }

            // Send analyzing message
            await this.sendTextMessage(sock, chatId, '🎵 Audio received! Analyzing... This may take 20-40 seconds.');

            // Download audio
            const buffer = await this.downloadMedia(sock, message);
            
            // Call backend API
            const formData = new FormData();
            formData.append('input_type', 'file');
            formData.append('file', buffer, {
                filename: 'audio.mp3',
                contentType: 'audio/mpeg'
            });

            const response = await axios.post(`${backendApiUrl}/analyze`, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'X-API-Key': apiKey
                },
                timeout: 180000
            });

            const result = response.data;

            // Check if it's async job or immediate result
            if (result.job_id) {
                // Async job - send job ID
                await this.sendTextMessage(sock, chatId, 
                    `⏳ *Audio analysis in progress*\n\n` +
                    `Job ID: \`${result.job_id}\`\n\n` +
                    `This will take 20-40 seconds.\n` +
                    `Use this command to check status:\n` +
                    `\`status ${result.job_id}\`\n\n` +
                    `I'll notify you when it's ready! ⏰`
                );

                // Poll for completion
                await this.pollJobStatus(sock, chatId, result.job_id, backendApiUrl, logger);
            } else {
                // Immediate result
                await this.sendAnalysisResult(sock, chatId, result, logger);
            }

        } catch (error) {
            logger.error('Audio analysis error:', error);
            await this.sendTextMessage(sock, chatId, '❌ Audio analysis failed. Please ensure audio is under 16MB.');
        }
    }

    // Poll job status for async operations
    async pollJobStatus(sock, chatId, jobId, backendApiUrl, logger, maxAttempts = 60) {
        let attempts = 0;
        
        const checkStatus = async () => {
            try {
                attempts++;
                
                const response = await axios.get(`${backendApiUrl}/job/${jobId}`);
                const jobStatus = response.data;

                if (jobStatus.status === 'SUCCESS') {
                    // Job completed
                    logger.info(`Job ${jobId} completed successfully`);
                    await this.sendTextMessage(sock, chatId, '✅ Analysis complete! Here are the results:');
                    await this.sendAnalysisResult(sock, chatId, jobStatus.result, logger);
                } else if (jobStatus.status === 'FAILURE') {
                    // Job failed
                    logger.error(`Job ${jobId} failed:`, jobStatus.error);
                    await this.sendTextMessage(sock, chatId, `❌ Analysis failed: ${jobStatus.error || 'Unknown error'}`);
                } else if (attempts >= maxAttempts) {
                    // Timeout
                    await this.sendTextMessage(sock, chatId, 
                        `⏰ Analysis is taking longer than expected.\n\n` +
                        `Job ID: \`${jobId}\`\n\n` +
                        `Use \`status ${jobId}\` to check manually.`
                    );
                } else {
                    // Still processing, check again
                    setTimeout(checkStatus, 3000); // Check every 3 seconds
                }
            } catch (error) {
                logger.error('Job status check error:', error);
                if (attempts < maxAttempts) {
                    setTimeout(checkStatus, 3000);
                }
            }
        };

        // Start polling
        setTimeout(checkStatus, 3000);
    }

    // Send analysis result formatted with emojis
    async sendAnalysisResult(sock, chatId, report, logger) {
        try {
            const riskLevel = report.scam_assessment?.risk_level || 'low';
            const riskEmoji = RISK_EMOJIS[riskLevel] || '⚪';
            const confidence = report.origin_verdict?.confidence || 'low';
            const confidenceEmoji = CONFIDENCE_EMOJIS[confidence] || '❓';
            const classification = report.origin_verdict?.classification || 'Unknown';

            // Build formatted message
            let message = `━━━━━━━━━━━━━━━━━━\n`;
            message += `*🛡️ VERISURE ANALYSIS*\n`;
            message += `━━━━━━━━━━━━━━━━━━\n\n`;

            // Scam Risk
            message += `*${riskEmoji} SCAM RISK: ${riskLevel.toUpperCase()}*\n\n`;

            // Origin Classification
            message += `*📊 Content Origin*\n`;
            message += `${confidenceEmoji} ${classification}\n`;
            message += `Confidence: ${confidence}\n\n`;

            // Scam Patterns (top 5)
            const patterns = report.scam_assessment?.scam_patterns || [];
            if (patterns.length > 0 && patterns[0] !== 'No known scam patterns detected') {
                message += `*⚠️ Detected Patterns*\n`;
                patterns.slice(0, 5).forEach((pattern, idx) => {
                    message += `${idx + 1}. ${pattern}\n`;
                });
                message += `\n`;
            }

            // Behavioral Flags (top 3)
            const flags = report.scam_assessment?.behavioral_flags || [];
            if (flags.length > 0 && flags[0] !== 'No behavioral manipulation detected') {
                message += `*🚩 Behavioral Flags*\n`;
                flags.slice(0, 3).forEach((flag, idx) => {
                    message += `• ${flag}\n`;
                });
                message += `\n`;
            }

            // Recommendations
            const actions = report.recommendations?.actions || [];
            if (actions.length > 0) {
                message += `*💡 Recommendations*\n`;
                actions.slice(0, 3).forEach((action, idx) => {
                    message += `${idx + 1}. ${action}\n`;
                });
                message += `\n`;
            }

            message += `━━━━━━━━━━━━━━━━━━\n`;
            message += `Report ID: \`${report.report_id}\`\n`;
            message += `━━━━━━━━━━━━━━━━━━\n\n`;
            message += `💾 Type \`pdf ${report.report_id}\` for full report`;

            await this.sendTextMessage(sock, chatId, message);

        } catch (error) {
            logger.error('Result formatting error:', error);
            await this.sendTextMessage(sock, chatId, '✅ Analysis complete, but formatting failed. Please check the web app.');
        }
    }

    // Send help message
    async sendHelpMessage(sock, chatId) {
        const helpText = 
            `🤖 *VERISURE WHATSAPP BOT*\n\n` +
            `*How to use:*\n\n` +
            `📝 Send any text message\n` +
            `🖼️ Send images\n` +
            `🎥 Send videos\n` +
            `🎵 Send audio messages\n\n` +
            `*Commands:*\n\n` +
            `• \`help\` - Show this message\n` +
            `• \`status <job_id>\` - Check analysis status\n` +
            `• \`pdf <report_id>\` - Get PDF report\n\n` +
            `*Limits:*\n` +
            `Free: 10 analyses per day\n\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `Protected by VeriSure 🛡️`;

        await this.sendTextMessage(sock, chatId, helpText);
    }

    // Send status message
    async sendStatusMessage(sock, chatId, jobId, backendApiUrl, logger) {
        try {
            const response = await axios.get(`${backendApiUrl}/job/${jobId}`);
            const jobStatus = response.data;

            let statusText = `*⏳ Job Status*\n\n`;
            statusText += `Job ID: \`${jobId}\`\n`;
            statusText += `Status: ${jobStatus.status}\n`;
            
            if (jobStatus.progress) {
                statusText += `Progress: ${jobStatus.progress}%\n`;
            }

            if (jobStatus.status === 'SUCCESS') {
                statusText += `\n✅ Analysis complete!\n`;
                statusText += `Report ID: \`${jobStatus.result?.report_id || 'N/A'}\`\n`;
            } else if (jobStatus.status === 'FAILURE') {
                statusText += `\n❌ Analysis failed\n`;
                statusText += `Error: ${jobStatus.error || 'Unknown error'}\n`;
            } else {
                statusText += `\n⏳ Still processing... Check again in 10-20 seconds.`;
            }

            await this.sendTextMessage(sock, chatId, statusText);

        } catch (error) {
            logger.error('Status check error:', error);
            await this.sendTextMessage(sock, chatId, `❌ Could not find job: ${jobId}`);
        }
    }

    // Send PDF report
    async sendPdfReport(sock, chatId, reportId, backendApiUrl, logger) {
        try {
            await this.sendTextMessage(sock, chatId, '📄 Generating PDF report... Please wait.');

            // Download PDF from backend
            const response = await axios.get(`${backendApiUrl}/export/pdf/${reportId}`, {
                responseType: 'arraybuffer',
                timeout: 30000
            });

            if (response.status === 200) {
                const pdfBuffer = Buffer.from(response.data);
                
                // Check file size (WhatsApp limit is ~16MB)
                const fileSizeMB = pdfBuffer.length / (1024 * 1024);
                if (fileSizeMB > 16) {
                    await this.sendTextMessage(sock, chatId, 
                        `❌ PDF is too large (${fileSizeMB.toFixed(2)}MB).\n\n` +
                        `WhatsApp limit is 16MB.\n` +
                        `Please access the full report via the web app.`
                    );
                    return;
                }

                // Send PDF as document
                await sock.sendMessage(chatId, {
                    document: pdfBuffer,
                    mimetype: 'application/pdf',
                    fileName: `verisure_report_${reportId.substring(0, 8)}.pdf`,
                    caption: `📊 VeriSure Analysis Report\nReport ID: ${reportId}`
                });

                logger.info(`PDF report sent successfully: ${reportId}`);

            } else {
                await this.sendTextMessage(sock, chatId, '❌ Failed to generate PDF. Report may not exist.');
            }

        } catch (error) {
            logger.error('PDF generation error:', error);
            
            if (error.response?.status === 404) {
                await this.sendTextMessage(sock, chatId, `❌ Report not found: ${reportId}\n\nPlease check the report ID.`);
            } else {
                await this.sendTextMessage(sock, chatId, '❌ Failed to generate PDF. Please try again later.');
            }
        }
    }

    // Download media from WhatsApp message
    async downloadMedia(sock, message) {
        try {
            const buffer = await sock.downloadMediaMessage(message);
            return buffer;
        } catch (error) {
            throw new Error(`Failed to download media: ${error.message}`);
        }
    }

    // Send text message
    async sendTextMessage(sock, chatId, text) {
        try {
            await sock.sendMessage(chatId, { text });
        } catch (error) {
            throw new Error(`Failed to send message: ${error.message}`);
        }
    }
}

module.exports = new MessageHandler();
