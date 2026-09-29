// middleware/validate.js
//
// Put this AFTER a list of express-validator rules and BEFORE the controller.
// If any rule failed, the request stops here with a 400 and a list of
// { field, message } problems; otherwise the controller runs.
//
//   router.post('/', createRules, validate, controller.create);

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

module.exports = function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((e) => ({
    field: e.path || e.param,
    message: e.msg,
  }));
  next(new ApiError(400, 'Validation failed', errors));
};
