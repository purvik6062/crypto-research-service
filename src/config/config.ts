import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    API_KEY: process.env.API_KEY || '',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    HEADLESS: process.env.HEADLESS !== 'false',
    BROWSER_CHANNEL: process.env.BROWSER_CHANNEL || 'chrome',
    ASKSURF_CHAT_URL: process.env.ASKSURF_CHAT_URL || 'https://asksurf.ai/chat',
    ASKSURF_API_BASE: process.env.ASKSURF_API_BASE || 'https://api.asksurf.ai/muninn/v4/chat',
    QUEUE_CONCURRENCY: parseInt(process.env.QUEUE_CONCURRENCY || '3', 10),
    QUEUE_TIMEOUT_MS: parseInt(process.env.QUEUE_TIMEOUT_MS || '60000', 10),
    PROFILE_PATH: process.env.PROFILE_PATH || path.join(process.cwd(), 'session', 'asksurf-profile'),
};

if (!config.API_KEY) {
    console.warn('WARNING: API_KEY is not set in .env');
}
