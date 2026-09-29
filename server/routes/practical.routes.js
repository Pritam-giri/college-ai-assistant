// routes/practical.routes.js

const express = require('express');
const controller = require('../controllers/practicalController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Student / Logged-in users (automatically scoped server-side for students)
router.get('/', controller.listPracticals);
router.get('/:id', controller.getPracticalById);

// Admin only (or teacher if role present)
router.post('/', authorize('admin', 'teacher'), controller.createPractical);
router.put('/:id', authorize('admin', 'teacher'), controller.updatePractical);
router.delete('/:id', authorize('admin', 'teacher'), controller.deletePractical);

module.exports = router;
