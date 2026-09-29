// middleware/auth.js
//
//   protect          -> the request must carry a valid JWT:
//                       Authorization: Bearer <token>
//   authorize(roles) -> the logged-in user must have one of the roles
//
// Typical use (order matters: protect first, then authorize):
//   router.post('/', protect, authorize('admin'), controller.create);

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/jwt');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    throw new ApiError(401, 'Authentication required. Please log in.');
  }

  // Throws JsonWebTokenError / TokenExpiredError for bad tokens; the central
  // error handler turns those into 401 responses.
  const decoded = verifyToken(token);

  const user = await User.findById(decoded.id).select('+tokenVersion');
  if (!user || !user.active) {
    throw new ApiError(401, 'The account for this token no longer exists or is disabled.');
  }

  if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
    throw new ApiError(401, 'This session is no longer valid. Please log in again.');
  }

  req.user = user;
  next();
});

function authorize(...roles) {
  function authorizeRoles(req, res, next) {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required. Please log in.'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }
    next();
  }
  authorizeRoles.allowedRoles = roles; // lets the test-suite audit which routes are admin-only
  return authorizeRoles;
}

module.exports = { protect, authorize };
