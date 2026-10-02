// routes/syllabus.routes.js

const express = require('express');
const controller = require('../controllers/syllabusController');
const { protect, authorize } = require('../middleware/auth');
const { mediaUpload } = require('../middleware/noticeMediaUpload');

const router = express.Router();

// All syllabus routes require login
router.use(protect);

// Student/Admin can view syllabus
router.get('/', controller.list);
router.get('/:id', controller.getOne);

// Only admin can modify syllabus
router.post('/', authorize('admin'), mediaUpload, controller.create);
router.put('/:id', authorize('admin'), mediaUpload, controller.update);
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;
