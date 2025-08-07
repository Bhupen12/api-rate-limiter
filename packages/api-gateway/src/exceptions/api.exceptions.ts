export class ApiException extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

export class ValidationException extends ApiException {
  constructor(message: string) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

export class RateLimitException extends ApiException {
  constructor(message: string, _retryAfter?: number) {
    super(429, message, 'RATE_LIMIT_EXCEEDED');
  }
}
