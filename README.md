# Research SSE Adapter Service

A Node.js TypeScript service that bridges a REST API to AskSurf's internal SSE chat endpoint. It uses Playwright for lightweight Bearer token extraction and BullMQ for managed concurrency.

## Features

- **SSE Stream Parsing**: Automatically extracts the final answer from AskSurf's event stream.
- **Token Management**: Intercepts and caches auth tokens from a persistent browser session.
- **Concurrency Control**: Uses BullMQ (Redis) to handle multiple requests smoothly.
- **Typed Config**: Secure environment variable handling.
- **Structured Logging**: JSON logs via Winston.

## Prerequisites

- Node.js 18+
- Docker (for Redis)
- Playwright browsers installed (`npx playwright install chromium`)

## Setup

1. **Clone and Install**:
   ```bash
   npm install
   npx playwright install chromium
   ```

2. **Configure**:
   Copy `.env.example` to `.env` and fill in:
   - `API_KEY`: A secret key to protect your endpoint.
   - `ASKSURF_CHAT_ID`: The UUID found in the URL of an existing AskSurf chat (e.g., `https://asksurf.ai/chat/{CHAT_ID}`).

3. **Start Redis**:
   ```bash
   docker-compose up -d
   ```

4. **First Login (Important)**:
   Set `HEADLESS=false` in `.env` and run:
   ```bash
   npm run dev
   ```
   A browser window will open. Log in to AskSurf manually. Once you see the "Captured fresh Bearer token" log, you can stop the service and set `HEADLESS=true`.

## API Usage

### Health Check
```bash
curl http://localhost:3000/asksurf/health
```

### Ask a Question
```bash
curl -X POST http://localhost:3000/asksurf/ask \
  -H "x-api-key: your-secret-api-key" \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the capital of France?"}'
```

Returns:
```json
{
  "answer": "The capital of France is Paris."
}
```

## Architecture

1. **Client** sends POST request.
2. **Express** validates key and enqueues a job.
3. **Worker** picks up job, gets token from **TokenManager**.
4. **Service** calls AskSurf SSE endpoint.
5. **SSE Parser** waits for the `FINAL` event and returns the text.
6. **Controller** returns the result to the client.
