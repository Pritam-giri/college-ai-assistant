const asyncHandler = require('../utils/asyncHandler');
const contentReadService = require('../services/contentReadService');

const unreadCounts = asyncHandler(async (req, res) => {
  const data = await contentReadService.getUnreadCounts(req.user);
  res.json({ success: true, data });
});

const markRead = asyncHandler(async (req, res) => {
  const data = await contentReadService.markRead(
    req.user,
    req.params.contentType,
    req.params.contentId
  );
  res.json({ success: true, data });
});

module.exports = { unreadCounts, markRead };
