const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const express = require('express');
const cors = require('cors');
const pino = require('pino');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const messageHandler = require('./handler');
const RateLimiter = require('./rate_limiter');

// Configuration
const BOT_PORT = process.env.BOT_PORT || 3001;
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8001/api';
const API_KEY = process.env.API_KEY;

// Logger
const logger = pino({ level: 'info' });

// Global state
let sock = null;
let qrCode = null;
let isConnected = false;
let connectionStatus = 'disconnected';
let rateLimiter = null;

// Express server for API
const app = express();
app.use(cors());
app.use(express.json());

// Initialize rate limiter
async function initRateLimiter() {
    rateLimiter = new RateLimiter();
    await rateLimiter.connect();
    logger.info('Rate limiter initialized');
}

// Start WhatsApp connection
async function startWhatsAppBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            getMessage: async (key) => {
                return { conversation: '' };
            }
        });

        // Handle connection updates
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                logger.info('QR Code generated');
                // Generate QR code as data URL
                qrCode = await QRCode.toDataURL(qr);
                connectionStatus = 'qr_ready';
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                logger.info('Connection closed. Reconnecting:', shouldReconnect);
                
                isConnected = false;
                connectionStatus = 'disconnected';
                qrCode = null;

                if (shouldReconnect) {
                    setTimeout(() => startWhatsAppBot(), 3000);
                }
            } else if (connection === 'open') {
                logger.info('✅ WhatsApp Bot connected successfully!');
                isConnected = true;
                connectionStatus = 'connected';
                qrCode = null;
            } else if (connection === 'connecting') {
                connectionStatus = 'connecting';
                logger.info('Connecting to WhatsApp...');
            }
        });

        // Save credentials on update
        sock.ev.on('creds.update', saveCreds);

        // Handle incoming messages
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;

            for (const message of messages) {
                // Ignore own messages
                if (message.key.fromMe) continue;

                try {
                    await messageHandler.handleMessage(sock, message, rateLimiter, BACKEND_API_URL, API_KEY, logger);
                } catch (error) {
                    logger.error('Message handling error:', error);
                }
            }
        });

        logger.info('WhatsApp bot initialization complete');

    } catch (error) {
        logger.error('Failed to start WhatsApp bot:', error);
        connectionStatus = 'error';
        setTimeout(() => startWhatsAppBot(), 5000);
    }
}

// API Routes

// Get bot status
app.get('/status', (req, res) => {
    res.json({
        connected: isConnected,
        status: connectionStatus,
        qr_code: qrCode,
        timestamp: new Date().toISOString()
    });
});

// Initialize bot (start connection)
app.post('/init', async (req, res) => {
    try {
        if (isConnected) {
            return res.json({ message: 'Bot already connected', connected: true });
        }

        if (connectionStatus === 'connecting' || connectionStatus === 'qr_ready') {
            return res.json({ message: 'Connection in progress', status: connectionStatus });
        }

        await startWhatsAppBot();
        res.json({ message: 'Bot initialization started', status: connectionStatus });
    } catch (error) {
        logger.error('Init error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Logout bot
app.post('/logout', async (req, res) => {
    try {
        if (sock) {
            await sock.logout();
            sock = null;
            isConnected = false;
            connectionStatus = 'disconnected';
            qrCode = null;

            // Clear auth files
            const authPath = path.join(__dirname, 'auth_info_baileys');
            if (fs.existsSync(authPath)) {
                fs.rmSync(authPath, { recursive: true, force: true });
            }

            logger.info('Bot logged out successfully');
            res.json({ message: 'Bot logged out successfully' });
        } else {
            res.json({ message: 'Bot not connected' });
        }
    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get usage stats for a phone number
app.get('/usage/:phoneNumber', async (req, res) => {
    try {
        const { phoneNumber } = req.params;
        if (!rateLimiter) {
            return res.status(503).json({ error: 'Rate limiter not initialized' });
        }
        const usage = await rateLimiter.getUsage(phoneNumber);
        res.json(usage);
    } catch (error) {
        logger.error('Usage check error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        bot_connected: isConnected,
        connection_status: connectionStatus,
        uptime: process.uptime()
    });
});

// Start Express server
app.listen(BOT_PORT, async () => {
    logger.info(`🚀 WhatsApp Bot API running on port ${BOT_PORT}`);
    
    // Initialize rate limiter
    await initRateLimiter();
    
    // Auto-start bot if credentials exist
    const authPath = path.join(__dirname, 'auth_info_baileys');
    if (fs.existsSync(authPath)) {
        logger.info('Found existing session, auto-connecting...');
        await startWhatsAppBot();
    } else {
        logger.info('No existing session found. Use POST /init to start.');
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...');
    if (sock) {
        await sock.end();
    }
    if (rateLimiter) {
        await rateLimiter.disconnect();
    }
    process.exit(0);
});

module.exports = { sock, logger };
