// controllers/timetableController.js

const Timetable = require('../models/Timetable');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const TIMETABLE_FIELDS = [
  'department',
  'semester',
  'day',
  'slots',
];

function pickTimetableFields(payload) {
  const data = {};

  for (const field of TIMETABLE_FIELDS) {
    if (payload[field] !== undefined) {
      data[field] = payload[field];
    }
  }

  return data;
}

// GET /api/timetable
const list = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.department) {
    filter.department = req.query.department.toUpperCase();
  }

  if (req.query.semester) {
    filter.semester = Number(req.query.semester);
  }

  if (req.query.day) {
    filter.day = req.query.day.toUpperCase();
  }

  const timetables = await Timetable.find(filter)
    .populate('slots.faculty', 'name designation department')
    .sort({ semester: 1, day: 1 });

  res.json({
    success: true,
    count: timetables.length,
    data: timetables,
  });
});

// GET /api/timetable/:id
const getOne = asyncHandler(async (req, res) => {
  const timetable = await Timetable.findById(req.params.id)
    .populate('slots.faculty', 'name designation department');

  if (!timetable) {
    throw new ApiError(404, 'Timetable not found');
  }

  res.json({
    success: true,
    data: timetable,
  });
});

// POST /api/timetable
const create = asyncHandler(async (req, res) => {
  const timetable = await Timetable.create(
    pickTimetableFields(req.body)
  );

  const populated = await Timetable.findById(timetable._id)
    .populate('slots.faculty', 'name designation department');

  res.status(201).json({
    success: true,
    data: populated,
  });
});

// PUT /api/timetable/:id
const update = asyncHandler(async (req, res) => {
  const timetable = await Timetable.findById(req.params.id);

  if (!timetable) {
    throw new ApiError(404, 'Timetable not found');
  }

  timetable.set(pickTimetableFields(req.body));
  await timetable.save();

  const populated = await Timetable.findById(timetable._id)
    .populate('slots.faculty', 'name designation department');

  res.json({
    success: true,
    data: populated,
  });
});

// DELETE /api/timetable/:id
const remove = asyncHandler(async (req, res) => {
  const timetable = await Timetable.findById(req.params.id);

  if (!timetable) {
    throw new ApiError(404, 'Timetable not found');
  }

  await timetable.deleteOne();

  res.json({
    success: true,
    message: 'Timetable deleted',
  });
});

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
};
