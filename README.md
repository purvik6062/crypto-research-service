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
- Google Chrome installed locally

## Setup

1. **Clone and Install**:
   ```bash
   npm install
   ```

2. **Configure**:
   Copy `.env.example` to `.env` and fill in:
   - `API_KEY`: A secret key to protect your endpoint.
   - `HEADLESS=false` for the first manual login, then switch it back to `true` after the browser profile is saved.

3. **Start Redis**:
   ```bash
   docker compose up -d redis
   ```

   If you run `npm run dev` on your host machine, keep `REDIS_URL=redis://localhost:6379`.
   The `redis://redis:6379` hostname is only valid for the app container inside Docker Compose.

4. **First Login (Important)**:
   Set `HEADLESS=false` in `.env` and run:
   ```bash
   npm run dev
   ```
   A Chrome window will open. Log in to AskSurf manually. If you use Google sign-in, this must be the regular Chrome channel, not Playwright's bundled test browser. Once you see the "Captured fresh Bearer token" log, you can stop the service and set `HEADLESS=true`.

Each incoming question now creates a fresh AskSurf session automatically. You do not need to provide or manage a persistent AskSurf chat ID.

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

For deeper research requests, send `deepResearch: true`. That switches AskSurf to the `V2_THINKING` session type:

```bash
curl -X POST http://localhost:3000/asksurf/ask \
  -H "x-api-key: your-secret-api-key" \
  -H "Content-Type: application/json" \
  -d '{"question": "Compare the tokenomics, moat, and risks of the top DePIN protocols", "deepResearch": true}'
```

## Architecture

1. **Client** sends POST request.
2. **Express** validates key and enqueues a job.
3. **Worker** picks up job, gets token from **TokenManager**.
4. **Service** calls AskSurf SSE endpoint.
5. **SSE Parser** waits for the `FINAL` event and returns the text.
6. **Controller** returns the result to the client.
