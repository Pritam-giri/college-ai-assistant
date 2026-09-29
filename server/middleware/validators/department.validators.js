// middleware/validators/department.validators.js
//
// Rules only DESCRIBE what is valid. The `validate` middleware (run after
// these) is what actually rejects the request.
//
// Note: custom validators below THROW to signal failure. (A custom validator
// that is async must throw/reject — returning false is not enough.)

const { body, param } = require('express-validator');
const departmentService = require('../../services/departmentService');

const departmentId = [param('id').isMongoId().withMessage('Invalid department id')];

const aliasesRule = body('aliases')
  .optional()
  .isArray()
  .withMessage('aliases must be an array of strings')
  .bail()
  .custom((aliases) => {
    if (aliases.length > 25) throw new Error('A department can have at most 25 aliases');
    const bad = departmentService.findInvalidAliases(aliases);
    if (bad.length) {
      throw new Error(`These aliases are too short or too common and would cause false matches: ${bad.join(', ')}`);
    }
    return true;
  });

const createDepartment = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('code is required')
    .bail()
    .toUpperCase()
    .matches(/^[A-Z0-9_]{2,20}$/)
    .withMessage('code must be 2-20 characters: letters, numbers or underscore')
    .bail()
    .custom((value) => {
      if (value === departmentService.ALL_CODE) throw new Error('"ALL" is reserved for college-wide content');
      return true;
    }),
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 100 }).withMessage('name is too long'),
  aliasesRule,
];

// `code` and `isAll` can never be changed after creation, so they are not
// even listed here (the controller ignores them).
const updateDepartment = [
  ...departmentId,
  body('name').optional().trim().notEmpty().withMessage('name cannot be empty').isLength({ max: 100 }),
  body('active').optional().isBoolean().withMessage('active must be true or false').toBoolean(),
  aliasesRule,
];

module.exports = { departmentId, createDepartment, updateDepartment };
