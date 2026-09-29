// controllers/syllabusController.js

const Syllabus = require('../models/Syllabus');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { validateHttpUrl } = require('../utils/httpUrl');

const SYLLABUS_FIELDS = [
  'department',
  'semester',
  'subjectCode',
  'subjectName',
  'fileUrl',
  'topics',
];

function pickSyllabusFields(payload) {
  const data = {};

  for (const field of SYLLABUS_FIELDS) {
    if (payload[field] !== undefined) {
      data[field] = payload[field];
    }
  }

  return data;
}

// GET /api/syllabus
const list = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.department) {
    filter.department = req.query.department.toUpperCase();
  }

  if (req.query.semester) {
    filter.semester = Number(req.query.semester);
  }

  const syllabus = await Syllabus.find(filter)
    .sort({ semester: 1, subjectCode: 1, subjectName: 1 });

  res.json({
    success: true,
    count: syllabus.length,
    data: syllabus,
  });
});

// GET /api/syllabus/:id
const getOne = asyncHandler(async (req, res) => {
  const syllabus = await Syllabus.findById(req.params.id);

  if (!syllabus) {
    throw new ApiError(404, 'Syllabus not found');
  }

  res.json({
    success: true,
    data: syllabus,
  });
});

// POST /api/syllabus
const create = asyncHandler(async (req, res) => {
  const data = pickSyllabusFields(req.body);
  if (data.fileUrl !== undefined) data.fileUrl = validateHttpUrl(data.fileUrl, 'fileUrl');
  const syllabus = await Syllabus.create(data);

  res.status(201).json({
    success: true,
    data: syllabus,
  });
});

// PUT /api/syllabus/:id
const update = asyncHandler(async (req, res) => {
  const syllabus = await Syllabus.findById(req.params.id);

  if (!syllabus) {
    throw new ApiError(404, 'Syllabus not found');
  }

  const data = pickSyllabusFields(req.body);
  if (data.fileUrl !== undefined) data.fileUrl = validateHttpUrl(data.fileUrl, 'fileUrl');
  syllabus.set(data);
  await syllabus.save();

  res.json({
    success: true,
    data: syllabus,
  });
});

// DELETE /api/syllabus/:id
const remove = asyncHandler(async (req, res) => {
  const syllabus = await Syllabus.findById(req.params.id);

  if (!syllabus) {
    throw new ApiError(404, 'Syllabus not found');
  }

  await syllabus.deleteOne();

  res.json({
    success: true,
    message: 'Syllabus deleted',
  });
});

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
};
