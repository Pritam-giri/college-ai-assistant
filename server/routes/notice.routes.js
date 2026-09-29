// routes/notice.routes.js
//
// Example of how EVERY department-aware resource is wired.
// Apply the same pattern to Faculty, Timetable, Syllabus, Document, FAQ.
//
//   GET    /api/notices              public (active notices only unless admin)
//   GET    /api/notices/categories   public
//   GET    /api/notices/:id          public (visibility rules still apply)
//   POST   /api/notices              admin
//   PUT    /api/notices/:id          admin
//   DELETE /api/notices/:id          admin

const express = require('express');
const controller = require('../controllers/noticeController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const rules = require('../middleware/validators/notice.validators');
const { noticeMediaUpload } = require('../middleware/noticeMediaUpload');

const router = express.Router();

router.get('/categories', controller.categories); // must be above '/:id'
router.get('/', rules.listNotices, validate, controller.list);
router.get('/:id', rules.noticeId, validate, controller.getOne);

router.post('/', protect, authorize('admin'), noticeMediaUpload, rules.createNotice, validate, controller.create);
router.put('/:id', protect, authorize('admin'), noticeMediaUpload, rules.updateNotice, validate, controller.update);
router.delete('/:id', protect, authorize('admin'), rules.noticeId, validate, controller.remove);

module.exports = router;
