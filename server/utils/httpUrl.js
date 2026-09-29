const ApiError = require('./ApiError');

function validateHttpUrl(value, field = 'URL', maxLength = 2048) {
  if (value === undefined || value === null || value === '') return value;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new ApiError(400, `${field} must be a URL of at most ${maxLength} characters.`);
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new ApiError(400, `${field} must be an absolute HTTP or HTTPS URL.`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new ApiError(400, `${field} must use HTTP or HTTPS and cannot contain URL credentials.`);
  }
  return value.trim();
}

module.exports = { validateHttpUrl };
