// routes/assignment.routes.js

const express = require('express');
const controller = require('../controllers/assignmentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Student / Logged-in users (automatically scoped server-side for students)
router.get('/', controller.listAssignments);
router.get('/:id', controller.getAssignmentById);

// Admin only (or teacher if role present)
router.post('/', authorize('admin', 'teacher'), controller.createAssignment);
router.put('/:id', authorize('admin', 'teacher'), controller.updateAssignment);
router.delete('/:id', authorize('admin', 'teacher'), controller.deleteAssignment);

module.exports = router;
