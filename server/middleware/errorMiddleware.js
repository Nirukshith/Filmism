const { AppError } = require('../utils/errors');

/**
 * Global Express error handling middleware.
 * Normalizes different error types (Mongoose, JWT, Axios, AppError, etc.) into a uniform, safe payload.
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.name = err.name;
  error.statusCode = err.statusCode || res.statusCode;

  // If status is 200 or unset, default to 500
  if (!error.statusCode || error.statusCode === 200) {
    error.statusCode = 500;
  }

  // 1. Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    error = {
      statusCode: 400,
      message: `Invalid identifier format for parameter '${err.path}'.`,
      isOperational: true,
    };
  }

  // 2. Mongoose Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = {
      statusCode: 409,
      message: `An account or record with that ${field} already exists.`,
      isOperational: true,
    };
  }

  // 3. Zod Schema Validation Error
  if (err.name === 'ZodError' || Array.isArray(err.issues)) {
    const errorMessages = (err.issues || []).map((issue) => {
      const fieldPath = issue.path.join('.');
      return fieldPath ? `${fieldPath}: ${issue.message}` : issue.message;
    });
    error = {
      statusCode: 400,
      message: errorMessages.length > 0 ? errorMessages.join(', ') : 'Validation failed for submitted data.',
      details: errorMessages,
      isOperational: true,
    };
  }

  // 4. Mongoose Schema Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((val) => val.message);
    error = {
      statusCode: 400,
      message: errors.length > 0 ? errors.join('. ') : 'Validation failed for submitted data.',
      details: errors,
      isOperational: true,
    };
  }

  // 4. JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      statusCode: 401,
      message: 'Invalid authorization token. Please log in again.',
      isOperational: true,
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      statusCode: 401,
      message: 'Your login session has expired. Please log in again.',
      isOperational: true,
    };
  }

  // 5. Malformed JSON Body Error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = {
      statusCode: 400,
      message: 'Malformed JSON payload in request body.',
      isOperational: true,
    };
  }

  // 6. Upstream / Axios Network & Timeout Errors
  if (err.isTimeout || err.code === 'ECONNABORTED') {
    error = {
      statusCode: 504,
      message: err.message || 'Upstream service timed out. Please try again.',
      isOperational: true,
    };
  } else if (err.isNetworkError || err.code === 'ENOTFOUND' || err.code === 'ECONNRESET') {
    error = {
      statusCode: 503,
      message: 'External service is temporarily unreachable. Please try again later.',
      isOperational: true,
    };
  }

  const isOperational = err.isOperational || error.isOperational || false;
  const statusCode = error.statusCode;

  // Log non-operational (unexpected server bugs) or 500s with full stack trace for developer debugging
  if (!isOperational || statusCode >= 500) {
    console.error(`[SERVER ERROR] ${req.method} ${req.originalUrl}:`, err);
  }

  // In production, do not leak unknown programmer error messages
  const clientMessage = isOperational
    ? error.message
    : (process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred on the server. Please try again later.'
        : error.message || 'Internal server error');

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV !== 'production' && !isOperational && { stack: err.stack }),
  });
};

/**
 * 404 handler for unmatched API routes.
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};