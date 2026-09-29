// controllers/facultyController.js

const Faculty = require('../models/Faculty');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const FACULTY_FIELDS = [
  'name',
  'designation',
  'email',
  'phone',
  'isHOD',
  'office',
  'photo',
  'department',
];

function pickFacultyFields(payload) {
  const data = {};

  for (const field of FACULTY_FIELDS) {
    if (payload[field] !== undefined) {
      data[field] = payload[field];
    }
  }

  return data;
}

// GET /api/faculty
const list = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.department) {
    filter.department = req.query.department.toUpperCase();
  }

  if (req.query.isHOD !== undefined) {
    filter.isHOD = req.query.isHOD === 'true';
  }

  const faculty = await Faculty.find(filter).sort({
    isHOD: -1,
    name: 1,
  });

  res.json({
    success: true,
    count: faculty.length,
    data: faculty,
  });
});

// GET /api/faculty/:id
const getOne = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findById(req.params.id);

  if (!faculty) {
    throw new ApiError(404, 'Faculty member not found');
  }

  res.json({
    success: true,
    data: faculty,
  });
});

// POST /api/faculty
const create = asyncHandler(async (req, res) => {
  const faculty = await Faculty.create(
    pickFacultyFields(req.body)
  );

  res.status(201).json({
    success: true,
    data: faculty,
  });
});

// PUT /api/faculty/:id
const update = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findById(req.params.id);

  if (!faculty) {
    throw new ApiError(404, 'Faculty member not found');
  }

  faculty.set(pickFacultyFields(req.body));
  await faculty.save();

  res.json({
    success: true,
    data: faculty,
  });
});

// DELETE /api/faculty/:id
const remove = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findById(req.params.id);

  if (!faculty) {
    throw new ApiError(404, 'Faculty member not found');
  }

  await faculty.deleteOne();

  res.json({
    success: true,
    message: 'Faculty member deleted',
  });
});

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
};