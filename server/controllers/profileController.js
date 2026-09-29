const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, 'User profile not found.');
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const {
    name,
    rollNumber,
    department,
    semester,
  } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, 'User profile not found.');
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      throw new ApiError(400, 'Name cannot be empty.');
    }

    user.name = name.trim();
  }

  if (rollNumber !== undefined) {
    user.rollNumber =
      rollNumber === null
        ? null
        : String(rollNumber).trim();
  }

  if (department !== undefined) {
    user.department =
      department === null
        ? null
        : String(department).trim().toUpperCase();
  }

  if (semester !== undefined) {
    if (
      semester !== null &&
      (
        !Number.isInteger(Number(semester)) ||
        Number(semester) < 1 ||
        Number(semester) > 6
      )
    ) {
      throw new ApiError(
        400,
        'Semester must be between 1 and 6.'
      );
    }

    user.semester =
      semester === null ? null : Number(semester);
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    data: user,
  });
});

module.exports = {
  getProfile,
  updateProfile,
};
