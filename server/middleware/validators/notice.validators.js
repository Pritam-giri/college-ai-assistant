// middleware/validators/notice.validators.js
//
// Custom validators THROW to signal failure (async ones must throw/reject).

const { body, param, query } = require('express-validator');
const Notice = require('../../models/Notice');
const departmentService = require('../../services/departmentService');
const { validateHttpUrl } = require('../../utils/httpUrl');

const STATUSES = ['active', 'expired', 'all'];

const noticeId = [param('id').isMongoId().withMessage('Invalid notice id')];

const departmentExists = async (value) => {
  if (!(await departmentService.isValidDepartment(value))) {
    throw new Error(`"${value}" is not a valid department`);
  }
  return true;
};

// '' / null / missing are allowed (= "no expiry"); anything else must be a date.
const nullableDate = (value) => {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error('expiresAt must be a valid date');
  if (Number.isNaN(Date.parse(value))) throw new Error('expiresAt must be a valid date');
  return true;
};

const attachmentRule = (value) => {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('attachment must be an object');
  if (typeof value.url !== 'string' || !value.url.trim() || value.url.length > 500) {
    throw new Error('attachment.url is required (max 500 characters)');
  }
  try {
    validateHttpUrl(value.url, 'attachment.url', 500);
  } catch (error) {
    throw new Error(error.message);
  }
  return true;
};

const semesterRule = (value) => {
  if (value === undefined || value === null || value === '' || value === 'ALL') return true;
  if (!['1', '2', '3', '4', '5', '6'].includes(String(value))) throw new Error('semester must be ALL or between 1 and 6');
  return true;
};

// `partial` = true for updates (PUT): every field is optional.
function noticeFields({ partial }) {
  const field = (chain) => (partial ? chain.optional() : chain);

  return [
    field(body('title'))
      .trim()
      .notEmpty()
      .withMessage('title is required')
      .isLength({ max: 200 })
      .withMessage('title must be at most 200 characters'),
    field(body('body'))
      .trim()
      .notEmpty()
      .withMessage('body is required')
      .isLength({ max: 10000 })
      .withMessage('body must be at most 10000 characters'),
    field(body('department'))
      .trim()
      .notEmpty()
      .withMessage('department is required')
      .bail()
      .toUpperCase()
      .custom(departmentExists),
    body('category')
      .optional()
      .trim()
      .toLowerCase()
      .isIn(Notice.CATEGORIES)
      .withMessage(`category must be one of: ${Notice.CATEGORIES.join(', ')}`),
    body('expiresAt').custom(nullableDate),
    body('publishedAt').custom(nullableDate),
    body('semester').custom(semesterRule),
    body('isImportant').optional().isBoolean().withMessage('isImportant must be a boolean'),
    body('attachment').custom(attachmentRule),
    body('attachmentUrl').optional({ nullable: true }).isString().isLength({ max: 500 }).custom((value) => {
      if (!value) return true;
      try { validateHttpUrl(value, 'attachmentUrl', 500); } catch (error) { throw new Error(error.message); }
      return true;
    }),
    body('removeImage').optional().isBoolean(),
    body('removeAttachment').optional().isBoolean(),
  ];
}

const createNotice = noticeFields({ partial: false });
const updateNotice = [...noticeId, ...noticeFields({ partial: true })];

const listNotices = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('category')
    .optional()
    .custom((value) => {
      if (typeof value !== 'string' || !Notice.CATEGORIES.includes(value.toLowerCase())) {
        throw new Error(`category must be one of: ${Notice.CATEGORIES.join(', ')}`);
      }
      return true;
    }),
  query('status')
    .optional()
    .custom((value) => {
      if (!STATUSES.includes(value)) throw new Error(`status must be one of: ${STATUSES.join(', ')}`);
      return true;
    }),
  query('department')
    .optional()
    .custom(async (value) => {
      // an empty ?department= means "no filter"
      if (value === '') return true;
      return departmentExists(value);
    }),
];

module.exports = { noticeId, createNotice, updateNotice, listNotices };
