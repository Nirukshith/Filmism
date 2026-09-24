/**
 * Custom application error hierarchy for consistent, safe API responses.
 */

class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true; // Marks trusted operational errors vs unknown programmer/system bugs
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad request', details = null) {
    super(message, 400, details);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Not authorized to access this resource', details = null) {
    super(message, 401, details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access', details = null) {
    super(message, 403, details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details = null) {
    super(message, 404, details);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict with existing resource', details = null) {
    super(message, 409, details);
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests. Please try again later.', details = null) {
    super(message, 429, details);
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable. Please try again shortly.', details = null) {
    super(message, 503, details);
  }
}

class GatewayTimeoutError extends AppError {
  constructor(message = 'Gateway timeout. Upstream service took too long to respond.', details = null) {
    super(message, 504, details);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  ServiceUnavailableError,
  GatewayTimeoutError,
};
