const express = require('express');
const { param } = require('express-validator');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const controller = require('../controllers/notificationController');
const contentReadController = require('../controllers/contentReadController');

const router = express.Router();
router.use(protect);

router.get('/unread-count', controller.unreadCount);
router.get('/unread-counts', contentReadController.unreadCounts);
router.post('/:contentType/:contentId/read', [
  param('contentType').isIn(['notice', 'assignment', 'practical']).withMessage('Invalid content type'),
  param('contentId').isMongoId().withMessage('Invalid content id'),
], validate, contentReadController.markRead);
router.get('/', controller.list);
router.put('/read-all', controller.markAllRead);
router.put('/:id/read', [param('id').isMongoId().withMessage('Invalid notification id')], validate, controller.markRead);

module.exports = router;
