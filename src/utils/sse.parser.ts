import { SSEParseError } from './errors';
import { logger } from './logger';

export async function parseSSEStream(
    body: ReadableStream<Uint8Array>,
    timeoutMs: number
): Promise<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SSE_TIMEOUT')), timeoutMs)
    );

    try {
        const result = await Promise.race([
            (async () => {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    accumulated += chunk;

                    const lines = accumulated.split('\n');
                    accumulated = lines.pop() || '';

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine || !trimmedLine.startsWith('data:')) continue;

                        const dataContent = trimmedLine.replace(/^data:\s*/, '');
                        if (dataContent === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(dataContent);
                            const eventType = parsed.data?.event_data?.type;

                            if (eventType === 'FINAL') {
                                const aiText = parsed.data.event_data.ai_text;
                                logger.info('SSE Parser: Found FINAL event', { message_id: parsed.message_id });
                                return aiText;
                            } else {
                                // Heartbeat for long-running streams
                                if (parsed.id && parseInt(parsed.id) % 10 === 0) {
                                    logger.info('SSE Parser: Still reading stream...', { event_id: parsed.id, type: eventType || parsed.type });
                                }
                                logger.debug('SSE Parser: Received event', { type: eventType || parsed.type });
                            }
                        } catch (err) {
                            logger.error('SSE Parser: Failed to parse JSON line', { line: trimmedLine, error: err });
                        }
                    }
                }
                throw new SSEParseError('Stream ended without FINAL event');
            })(),
            timeoutPromise,
        ]);

        return result;
    } catch (error: any) {
        if (error.message === 'SSE_TIMEOUT') {
            throw new Error('AskSurf response timed out');
        }
        throw error;
    } finally {
        reader.releaseLock();
    }
}
