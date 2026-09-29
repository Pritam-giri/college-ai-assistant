const express = require('express');
const { chat } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Chat requires login
router.use(protect);

const chatIpLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30 });
const chatUserLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 8,
  keyGenerator: (req) => req.user?._id?.toString() || 'unknown-user',
});

// POST /api/chat
router.post('/', chatIpLimiter, chatUserLimiter, chat);

module.exports = router;
