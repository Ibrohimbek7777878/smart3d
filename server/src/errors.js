/* ═══════════════════ CUSTOM ERRORS ═══════════════════ */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

export class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class AuthError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'AUTH_ERROR');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT');
  }
}

export class TimeoutError extends AppError {
  constructor(message = 'Operation timeout') {
    super(message, 504, 'TIMEOUT');
  }
}

export class CircuitOpenError extends AppError {
  constructor(message = 'Service unavailable') {
    super(message, 503, 'CIRCUIT_OPEN');
  }
}
