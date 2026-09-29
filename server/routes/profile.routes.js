const express = require('express');

const {
  getProfile,
  updateProfile,
} = require('../controllers/profileController');

const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getProfile);
router.put('/', updateProfile);

module.exports = router;