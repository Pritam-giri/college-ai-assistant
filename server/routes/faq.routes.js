// routes/faq.routes.js

const express = require('express');
const controller = require('../controllers/faqController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All FAQ routes require login
router.use(protect);

// Student/Admin can view FAQs
router.get('/', controller.list);
router.get('/:id', controller.getOne);

// Only admin can modify FAQs
router.post('/', authorize('admin'), controller.create);
router.put('/:id', authorize('admin'), controller.update);
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;