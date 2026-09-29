// utils/ApiError.js
//
// An error that carries an HTTP status code. Throw it anywhere in a
// controller/middleware and the central error handler turns it into a
// clean JSON response:
//
//   throw new ApiError(404, 'Notice not found');
//   throw new ApiError(400, 'Validation failed', [{ field: 'title', message: 'Title is required' }]);

class ApiError extends Error {
  constructor(statusCode, message, errors) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    if (errors) this.errors = errors; // optional per-field details
    Error.captureStackTrace?.(this, this.constructor);
  }
}

module.exports = ApiError;
