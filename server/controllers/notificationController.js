const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const notificationService = require('../services/notificationService');

const list = asyncHandler(async (req, res) => {
  const rawLimit = req.query.limit;
  const limit = rawLimit === undefined ? 20 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new ApiError(400, 'limit must be between 1 and 50.');
  }
  const data = await notificationService.getUserNotifications(req.user._id, limit);
  res.json({ success: true, data });
});

const unreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user._id);
  res.json({ success: true, data: { count } });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markNotificationRead(req.user._id, req.params.id);
  if (!notification) throw new ApiError(404, 'Notification not found.');
  res.json({ success: true, data: notification });
});

const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllNotificationsRead(req.user._id);
  res.json({ success: true, data: { modifiedCount: result.modifiedCount || 0 } });
});

module.exports = { list, unreadCount, markRead, markAllRead };
