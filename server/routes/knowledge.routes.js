// routes/knowledge.routes.js

const express = require('express');
const controller = require('../controllers/knowledgeBaseController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All knowledge routes require login
router.use(protect);

// Student/Admin can view knowledge
router.get('/', controller.list);
router.get('/:id', controller.getOne);

// Only admin can modify knowledge
router.post('/', authorize('admin'), controller.create);
router.put('/:id', authorize('admin'), controller.update);
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;