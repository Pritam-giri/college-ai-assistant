// routes/document.routes.js

const express = require('express');
const controller = require('../controllers/documentController');
const { protect, authorize } = require('../middleware/auth');
const { documentUpload } = require('../middleware/documentUpload');

const router = express.Router();

// All document routes require login
router.use(protect);

// Student/Admin can view documents
router.get('/', controller.list);
router.get('/:id', controller.getOne);

// Only admin can modify documents
router.post('/', authorize('admin'), documentUpload, controller.create);
router.put('/:id', authorize('admin'), documentUpload, controller.update);
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;
