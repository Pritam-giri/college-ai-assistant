// utils/asyncHandler.js
//
// Express 4 does NOT catch errors thrown inside async route handlers:
// the request hangs (or the process crashes on newer Node versions).
// Wrapping a handler with asyncHandler() forwards any rejection to
// next(err), which lands in the central error middleware.
//
//   router.get('/', asyncHandler(async (req, res) => { ... }));

module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
};
