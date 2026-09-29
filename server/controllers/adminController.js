// controllers/adminController.js
//
// Admin-only endpoints that don't fit into existing resource controllers.
//   GET   /api/admin/dashboard          → aggregate counts for every model
//   GET   /api/admin/students           → list students with filters
//   GET   /api/admin/students/:id       → single student detail
//   PATCH /api/admin/students/:id/status → activate / deactivate a student

const User = require('../models/User');
const Department = require('../models/Department');
const Faculty = require('../models/Faculty');
const Notice = require('../models/Notice');
const Timetable = require('../models/Timetable');
const Syllabus = require('../models/Syllabus');
const Document = require('../models/Document');
const FAQ = require('../models/FAQ');
const KnowledgeBase = require('../models/KnowledgeBase');
const Practical = require('../models/Practical');
const Assignment = require('../models/Assignment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex } = require('../utils/text');

// Fields that must NEVER be returned for any user
const SENSITIVE_FIELDS = [
  '-password',
  '-verificationOtpHash',
  '-verificationOtpExpiresAt',
  '-verificationOtpAttempts',
  '-verificationOtpLastSentAt',
  '-resetOtpHash',
  '-resetOtpExpiresAt',
  '-resetOtpAttempts',
  '-resetOtpLastSentAt',
  '-__v',
].join(' ');

// GET /api/admin/dashboard
const dashboard = asyncHandler(async (req, res) => {
  const [
    totalStudents,
    totalFaculty,
    totalNotices,
    totalTimetables,
    totalSyllabus,
    totalDocuments,
    totalFaqs,
    totalKnowledge,
    totalDepartments,
    totalPracticals,
    totalAssignments,
    totalUsers,
    recentNotices,
    recentStudents,
    recentDocuments,
  ] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Faculty.countDocuments(),
    Notice.countDocuments(),
    Timetable.countDocuments(),
    Syllabus.countDocuments(),
    Document.countDocuments(),
    FAQ.countDocuments(),
    KnowledgeBase.countDocuments(),
    Department.countDocuments({ active: true }),
    Practical.countDocuments(),
    Assignment.countDocuments(),
    User.countDocuments({}),
    Notice.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title department category createdAt')
      .lean(),
    User.find({ role: 'student' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email department createdAt')
      .lean(),
    Document.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title department category originalName createdAt uploadedBy')
      .populate('uploadedBy', 'name')
      .lean(),
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        totalStudents,
        totalUsers,
        totalFaculty,
        totalNotices,
        totalTimetables,
        totalSyllabus,
        totalDocuments,
        totalFaqs,
        totalKnowledge,
        totalDepartments,
        totalPracticals,
        totalAssignments,
      },
      recentActivity: {
        notices: recentNotices,
        students: recentStudents,
        documents: recentDocuments,
      },
    },
  });
});

// GET /api/admin/students
// ?department=CSE &semester=3 &active=true &search=john &page=1 &limit=20
const listStudents = asyncHandler(async (req, res) => {
  const filter = { role: 'student' };

  if (req.query.department) {
    filter.department = req.query.department.toUpperCase();
  }

  if (req.query.semester) {
    const semester = Number(req.query.semester);
    if (!Number.isInteger(semester) || semester < 1 || semester > 6) {
      throw new ApiError(400, 'semester must be an integer between 1 and 6.');
    }
    filter.semester = semester;
  }

  if (req.query.active !== undefined) {
    if (!['true', 'false'].includes(req.query.active)) {
      throw new ApiError(400, 'active must be true or false.');
    }
    filter.active = req.query.active === 'true';
  }

  if (req.query.search) {
    if (typeof req.query.search !== 'string' || req.query.search.length > 100) {
      throw new ApiError(400, 'search must be a string of at most 100 characters.');
    }
    const term = escapeRegex(req.query.search.trim());
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
      { rollNumber: { $regex: term, $options: 'i' } },
    ];
  }

  const requestedPage = req.query.page === undefined ? 1 : Number(req.query.page);
  if (!Number.isSafeInteger(requestedPage) || requestedPage < 1 || requestedPage > 10000) {
    throw new ApiError(400, 'page must be an integer between 1 and 10000.');
  }
  const page = requestedPage;
  const requestedLimit = req.query.limit === undefined ? 20 : Number(req.query.limit);
  if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1) {
    throw new ApiError(400, 'limit must be a positive integer.');
  }
  const limit = Math.min(100, requestedLimit);
  const skip = (page - 1) * limit;

  const [students, total] = await Promise.all([
    User.find(filter)
      .select(SENSITIVE_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: students.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: students,
  });
});

// GET /api/admin/students/:id
const getStudent = asyncHandler(async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: 'student' })
    .select(SENSITIVE_FIELDS)
    .lean();

  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  res.json({ success: true, data: student });
});

// PATCH /api/admin/students/:id/status
// Body: { active: true|false }
const updateStudentStatus = asyncHandler(async (req, res) => {
  const { active } = req.body;

  if (typeof active !== 'boolean') {
    throw new ApiError(400, 'active must be a boolean');
  }

  const student = await User.findById(req.params.id).select(SENSITIVE_FIELDS);

  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  if (student.role !== 'student') {
    throw new ApiError(400, 'Can only change status of student accounts');
  }

  student.active = active;
  await student.save();

  res.json({
    success: true,
    message: `Student ${active ? 'activated' : 'deactivated'} successfully`,
    data: student,
  });
});

module.exports = { dashboard, listStudents, getStudent, updateStudentStatus };
