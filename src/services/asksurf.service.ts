import { config } from '../config/config';
import { logger } from '../utils/logger';
import { TokenExpiredError, AskSurfAPIError } from '../utils/errors';
import { parseSSEStream } from '../utils/sse.parser';
import { nanoid } from 'nanoid';

export class AskSurfService {
    public async ask(question: string, token: string): Promise<string> {
        const requestId = nanoid();
        const url = `${config.ASKSURF_API_BASE}/sessions/${config.ASKSURF_CHAT_ID}/sse?session_type=V2&platform=WEB&lang=en`;

        logger.info('AskSurfService: Sending request...', { requestId, chatId: config.ASKSURF_CHAT_ID });

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                },
                body: JSON.stringify({
                    request_id: requestId,
                    type: 'chat_request',
                    messages: [
                        {
                            role: 'user',
                            content: [{ type: 'text', text: question }],
                        },
                    ],
                }),
            });

            if (response.status === 401) {
                throw new TokenExpiredError();
            }

            if (!response.ok) {
                const errorText = await response.text();
                logger.error('AskSurfService: API error response', { status: response.status, body: errorText });
                throw new AskSurfAPIError(`AskSurf API returned status ${response.status}`, response.status);
            }

            if (!response.body) {
                throw new AskSurfAPIError('Empty response body from AskSurf API');
            }

            // ReadableStream<Uint8Array> cast for parseSSEStream
            const body = response.body as any as ReadableStream<Uint8Array>;
            const answer = await parseSSEStream(body, config.QUEUE_TIMEOUT_MS);

            logger.info('AskSurfService: Request successful', { requestId });
            return answer;
        } catch (error: any) {
            if (error instanceof TokenExpiredError || error instanceof AskSurfAPIError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            logger.error('AskSurfService: Unexpected request failure', { requestId, error: errorMessage, stack: errorStack });
            throw new AskSurfAPIError(`Network error or unexpected response: ${errorMessage}`);
        }
    }
}

export const asksurfService = new AskSurfService();
