// routes/timetable.routes.js

const express = require('express');
const controller = require('../controllers/timetableController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All timetable routes require login
router.use(protect);

// Student/Admin can view timetable
router.get('/', controller.list);
router.get('/:id', controller.getOne);

// Only admin can modify timetable
router.post('/', authorize('admin'), controller.create);
router.put('/:id', authorize('admin'), controller.update);
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;