export class AppError extends Error {
    constructor(public message: string, public statusCode: number = 500, public code?: string) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class TokenExpiredError extends AppError {
    constructor(message: string = 'AskSurf session token expired') {
        super(message, 401, 'TOKEN_EXPIRED');
    }
}

export class TokenExtractionError extends AppError {
    constructor(message: string = 'Failed to extract token via Playwright') {
        super(message, 502, 'TOKEN_EXTRACTION_ERROR');
    }
}

export class SSEParseError extends AppError {
    constructor(message: string = 'Failed to parse SSE stream') {
        super(message, 502, 'SSE_PARSE_ERROR');
    }
}

export class AskSurfTimeoutError extends AppError {
    constructor(message: string = 'AskSurf response timed out') {
        super(message, 504, 'TIMEOUT');
    }
}

export class AskSurfAPIError extends AppError {
    constructor(message: string, statusCode: number = 502) {
        super(message, statusCode, 'ASKSURF_API_ERROR');
    }
}
