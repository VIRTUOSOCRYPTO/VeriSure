const { MongoClient } = require('mongodb');
require('dotenv').config();

class RateLimiter {
    constructor() {
        this.client = null;
        this.db = null;
        this.collection = null;
        this.dailyLimit = 10;
    }

    async connect() {
        try {
            const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
            const dbName = process.env.DB_NAME || 'test_database';

            this.client = new MongoClient(mongoUrl);
            await this.client.connect();
            this.db = this.client.db(dbName);
            this.collection = this.db.collection('whatsapp_usage');

            // Create index for efficient queries
            await this.collection.createIndex({ phone_number: 1, date: 1 }, { unique: true });
            await this.collection.createIndex({ date: 1 }, { expireAfterSeconds: 86400 * 7 }); // Auto-delete after 7 days

            console.log('✅ Rate limiter connected to MongoDB');
        } catch (error) {
            console.error('❌ Rate limiter MongoDB connection error:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.close();
        }
    }

    // Get today's date string (YYYY-MM-DD)
    getTodayDate() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }

    // Check rate limit and increment if allowed
    async checkAndIncrement(phoneNumber) {
        try {
            const today = this.getTodayDate();

            // Try to increment count
            const result = await this.collection.findOneAndUpdate(
                {
                    phone_number: phoneNumber,
                    date: today
                },
                {
                    $inc: { count: 1 },
                    $setOnInsert: {
                        phone_number: phoneNumber,
                        date: today,
                        first_request: new Date()
                    },
                    $set: {
                        last_request: new Date()
                    }
                },
                {
                    upsert: true,
                    returnDocument: 'after'
                }
            );

            const currentCount = result.value?.count || result.count || 1;

            // Check if within limit
            if (currentCount <= this.dailyLimit) {
                console.log(`✅ Rate limit OK for ${phoneNumber}: ${currentCount}/${this.dailyLimit}`);
                return true;
            } else {
                // Revert the increment since we're over the limit
                await this.collection.updateOne(
                    { phone_number: phoneNumber, date: today },
                    { $inc: { count: -1 } }
                );
                console.log(`⚠️ Rate limit exceeded for ${phoneNumber}: ${currentCount}/${this.dailyLimit}`);
                return false;
            }
        } catch (error) {
            console.error('Rate limiter error:', error);
            // On error, allow the request (fail open)
            return true;
        }
    }

    // Get usage stats for a phone number
    async getUsage(phoneNumber) {
        try {
            const today = this.getTodayDate();
            const record = await this.collection.findOne({
                phone_number: phoneNumber,
                date: today
            });

            if (record) {
                return {
                    phone_number: phoneNumber,
                    date: today,
                    count: record.count || 0,
                    limit: this.dailyLimit,
                    remaining: Math.max(0, this.dailyLimit - (record.count || 0)),
                    resets_at: this.getNextMidnight()
                };
            } else {
                return {
                    phone_number: phoneNumber,
                    date: today,
                    count: 0,
                    limit: this.dailyLimit,
                    remaining: this.dailyLimit,
                    resets_at: this.getNextMidnight()
                };
            }
        } catch (error) {
            console.error('Usage check error:', error);
            return {
                phone_number: phoneNumber,
                count: 0,
                limit: this.dailyLimit,
                remaining: this.dailyLimit,
                error: error.message
            };
        }
    }

    // Get next midnight timestamp
    getNextMidnight() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.toISOString();
    }

    // Reset usage for a phone number (admin function)
    async resetUsage(phoneNumber) {
        try {
            const today = this.getTodayDate();
            await this.collection.deleteOne({
                phone_number: phoneNumber,
                date: today
            });
            return { success: true, message: 'Usage reset successfully' };
        } catch (error) {
            console.error('Reset error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all usage stats (admin function)
    async getAllUsage() {
        try {
            const today = this.getTodayDate();
            const records = await this.collection.find({ date: today }).toArray();
            return records;
        } catch (error) {
            console.error('Get all usage error:', error);
            return [];
        }
    }
}

module.exports = RateLimiter;
