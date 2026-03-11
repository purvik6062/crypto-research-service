import { chromium, BrowserContext, Page } from 'playwright';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { TokenExtractionError } from '../utils/errors';

export class TokenManager {
    private static instance: TokenManager;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private token: string | null = null;
    private isInitializing = false;

    private constructor() { }

    public static getInstance(): TokenManager {
        if (!TokenManager.instance) {
            TokenManager.instance = new TokenManager();
        }
        return TokenManager.instance;
    }

    public async initialize(): Promise<void> {
        if (this.isInitializing) return;
        this.isInitializing = true;

        try {
            logger.info('TokenManager: Initializing playwright...', {
                profilePath: config.PROFILE_PATH,
                headless: config.HEADLESS,
                browserChannel: config.BROWSER_CHANNEL,
            });

            this.context = await chromium.launchPersistentContext(config.PROFILE_PATH, {
                channel: config.BROWSER_CHANNEL,
                headless: config.HEADLESS,
                ignoreDefaultArgs: ['--enable-automation'],
                args: [
                    '--disable-blink-features=AutomationControlled',
                ],
                viewport: { width: 1280, height: 720 },
            });

            this.page = await this.context.newPage();

            await this.context.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => false,
                });
            });

            this.page.on('request', (request) => {
                const url = request.url();
                if (url.includes('api.asksurf.ai/muninn')) {
                    const headers = request.headers();
                    const authHeader = headers['authorization'];
                    if (authHeader && authHeader.startsWith('Bearer ')) {
                        const newToken = authHeader.replace('Bearer ', '');
                        if (this.token !== newToken) {
                            logger.info('TokenManager: Captured fresh Bearer token');
                            this.token = newToken;
                        }
                    }
                }
            });

            logger.info('TokenManager: Navigating to AskSurf...', { url: config.ASKSURF_CHAT_URL });
            await this.page.goto(config.ASKSURF_CHAT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Wait a bit for initial tokens to be captured
            await new Promise(r => setTimeout(r, 5000));

            if (!this.token) {
                logger.warn('TokenManager: No token captured on startup. Manual login might be required if HEADLESS=false.');
            }
        } catch (error) {
            logger.error('TokenManager: Initialization failed', { error });
            throw new TokenExtractionError('Failed to initialize Playwright context');
        } finally {
            this.isInitializing = false;
        }
    }

    public getToken(): string | null {
        return this.token;
    }

    public async refreshToken(): Promise<string> {
        if (!this.page) throw new TokenExtractionError('Browser not initialized');

        logger.info('TokenManager: Refreshing token by reloading page...');
        this.token = null; // Clear old token

        try {
            await this.page.reload({ waitUntil: 'networkidle' });

            // If reload didn't work, try navigating to a new chat
            if (!this.token) {
                logger.info('TokenManager: Reload didn\'t yield token, forcing navigation...');
                await this.page.goto(`${config.ASKSURF_CHAT_URL}/new`, { waitUntil: 'networkidle' });
            }

            if (!this.token) {
                throw new TokenExtractionError('Failed to capture token after refresh/reload');
            }

            return this.token;
        } catch (error) {
            logger.error('TokenManager: Refresh failed', { error });
            throw error;
        }
    }

    public isReady(): boolean {
        return !!this.token;
    }

    public async shutdown(): Promise<void> {
        if (this.context) {
            logger.info('TokenManager: Closing browser...');
            await this.context.close();
            this.context = null;
            this.page = null;
        }
    }
}

export const tokenManager = TokenManager.getInstance();
