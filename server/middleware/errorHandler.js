// middleware/errorHandler.js
//
// ONE place that turns every error into a consistent JSON response:
//   { "success": false, "message": "...", "errors": [ ... optional ... ] }
//
// Must be registered LAST in app.js (after all routes).

const ApiError = require('../utils/ApiError');

// Handles requests to URLs that don't exist.
function notFound(req, res, next) {
  next(new ApiError(404, 'Route not found'));
}

// Express recognises an error handler by its 4 parameters — keep `next`
// in the signature even though it is unused.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errors = err.errors;

  const isProduction = process.env.NODE_ENV === 'production';

  if (err.name === 'ValidationError' && err.errors && !Array.isArray(err.errors)) {
    // Mongoose schema validation (e.g. required field missing)
    statusCode = 400;
    message = 'Validation failed';
    errors = isProduction ? undefined : Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    // e.g. /api/notices/not-a-valid-id
    statusCode = 400;
    message = isProduction ? 'Invalid request' : `Invalid value for "${err.path}"`;
  } else if (err.code === 11000) {
    // MongoDB duplicate key (unique index)
    statusCode = 409;
    const pairs = Object.entries(err.keyValue || {}).map(([k, v]) => `${k}=${v}`);
    message = isProduction
      ? 'A record with that value already exists.'
      : pairs.length ? `A record with the same value already exists (${pairs.join(', ')})` : 'Duplicate value';
    errors = undefined;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please log in again.';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON in request body';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body is too large';
  } else if (/buffering timed out/i.test(err.message || '')) {
    // Mongoose waits ~10s for a DB connection that never came.
    statusCode = 503;
    message = 'Database is not connected';
  }

  if (statusCode >= 500) {
    console.error('API request failed', {
      name: err.name || 'Error',
      statusCode,
      method: req.method,
      route: req.originalUrl || req.route?.path || 'unmatched',
      ...(isProduction ? {} : { message: err.message, stack: err.stack }),
    });
    if (isProduction) {
      message = err.isAIProviderError
        ? 'The AI service is temporarily unavailable. Please try again shortly.'
        : statusCode === 503 ? 'Service temporarily unavailable' : 'Internal server error';
      errors = undefined;
    }
  }

  const body = { success: false, message };
  if (err.requiresEmailVerification) body.requiresEmailVerification = true;
  if (errors && !isProduction) body.errors = errors;
  if (!isProduction && statusCode >= 500) body.stack = err.stack;

  res.status(statusCode).json(body);
}

module.exports = { notFound, errorHandler };
