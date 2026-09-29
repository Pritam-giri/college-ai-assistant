// routes/faculty.routes.js

const express = require('express');
const controller = require('../controllers/facultyController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All faculty APIs require login
router.use(protect);

// Logged-in users
router.get('/', controller.list);
router.get('/:id', controller.getOne);

// Admin only
router.post('/', authorize('admin'), controller.create);
router.put('/:id', authorize('admin'), controller.update);
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;