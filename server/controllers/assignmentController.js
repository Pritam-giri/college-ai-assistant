const Assignment = require('../models/Assignment');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { escapeRegex } = require('../utils/text');
const { validateHttpUrl } = require('../utils/httpUrl');
const { notifyPublishedRecord } = require('../services/notificationService');

// GET /api/assignments
const listAssignments = asyncHandler(async (req, res) => {
  const isStudent = req.user.role === 'student';
  const filter = {};

  if (isStudent) {
    if (!req.user.department || !req.user.semester) {
      return res.json({
        success: true,
        count: 0,
        data: [],
      });
    }
    filter.department = { $in: [req.user.department.toUpperCase(), 'ALL'] };
    filter.semester = req.user.semester;
    filter.status = 'published';
  } else {
    // Admin or staff filtering
    if (req.query.department && req.query.department !== 'ALL') {
      filter.department = req.query.department.toUpperCase();
    }
    if (req.query.semester) {
      filter.semester = Number(req.query.semester);
    }
    if (req.query.status) {
      filter.status = req.query.status.toLowerCase();
    }
    if (req.query.search) {
      if (typeof req.query.search !== 'string' || req.query.search.length > 100) {
        throw new ApiError(400, 'search must be a string of at most 100 characters.');
      }
      const term = escapeRegex(req.query.search.trim());
      filter.$or = [
        { title: { $regex: term, $options: 'i' } },
        { subject: { $regex: term, $options: 'i' } },
        { subjectCode: { $regex: term, $options: 'i' } },
      ];
    }
  }

  const assignments = await Assignment.find(filter)
    .populate('createdBy', 'name')
    .sort({ dueDate: 1, createdAt: -1 });

  res.json({
    success: true,
    count: assignments.length,
    data: assignments,
  });
});

// GET /api/assignments/:id
const getAssignmentById = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id).populate('createdBy', 'name');

  if (!assignment) {
    throw new ApiError(404, 'Assignment not found.');
  }

  if (req.user.role === 'student') {
    const studentDept = req.user.department ? req.user.department.toUpperCase() : null;
    const matchesDept = assignment.department === 'ALL' || assignment.department === studentDept;
    const matchesSem = assignment.semester === req.user.semester;

    if (!matchesDept || !matchesSem || assignment.status !== 'published') {
      throw new ApiError(403, 'You do not have access to view this assignment.');
    }
  }

  res.json({
    success: true,
    data: assignment,
  });
});

// POST /api/assignments
const createAssignment = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    subject,
    subjectCode,
    department,
    semester,
    instructions,
    dueDate,
    totalMarks,
    attachmentUrl,
    status,
  } = req.body;

  validateHttpUrl(attachmentUrl, 'attachmentUrl');

  if (!title || !subject || !department || semester === undefined) {
    throw new ApiError(400, 'Title, subject, department, and semester are required.');
  }

  const semNumber = Number(semester);
  if (!Number.isInteger(semNumber) || semNumber < 1 || semNumber > 6) {
    throw new ApiError(400, 'Semester must be between 1 and 6.');
  }

  const deptUpper = department.toUpperCase();
  if (!['CSE', 'ELECTRONICS', 'ALL'].includes(deptUpper)) {
    throw new ApiError(400, 'Department must be CSE, ELECTRONICS, or ALL.');
  }

  const assignment = await Assignment.create({
    title: title.trim(),
    description: description ? description.trim() : '',
    subject: subject.trim(),
    subjectCode: subjectCode ? subjectCode.trim().toUpperCase() : '',
    department: deptUpper,
    semester: semNumber,
    instructions: instructions ? instructions.trim() : '',
    dueDate: dueDate ? new Date(dueDate) : null,
    totalMarks: totalMarks !== undefined ? Number(totalMarks) : 100,
    attachmentUrl: attachmentUrl ? attachmentUrl.trim() : '',
    status: status ? status.toLowerCase() : 'published',
    createdBy: req.user._id,
  });

  await notifyPublishedRecord(assignment, 'ASSIGNMENT', `${assignment.subject}${assignment.dueDate ? ` · Due ${assignment.dueDate.toLocaleDateString('en-IN')}` : ''}`);

  res.status(201).json({
    success: true,
    message: 'Assignment created successfully.',
    data: assignment,
  });
});

// PUT /api/assignments/:id
const updateAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);

  if (!assignment) {
    throw new ApiError(404, 'Assignment not found.');
  }

  const {
    title,
    description,
    subject,
    subjectCode,
    department,
    semester,
    instructions,
    dueDate,
    totalMarks,
    attachmentUrl,
    status,
  } = req.body;

  validateHttpUrl(attachmentUrl, 'attachmentUrl');

  if (title) assignment.title = title.trim();
  if (description !== undefined) assignment.description = description ? description.trim() : '';
  if (subject) assignment.subject = subject.trim();
  if (subjectCode !== undefined) assignment.subjectCode = subjectCode ? subjectCode.trim().toUpperCase() : '';
  if (department) {
    const deptUpper = department.toUpperCase();
    if (!['CSE', 'ELECTRONICS', 'ALL'].includes(deptUpper)) {
      throw new ApiError(400, 'Department must be CSE, ELECTRONICS, or ALL.');
    }
    assignment.department = deptUpper;
  }
  if (semester !== undefined) {
    const semNumber = Number(semester);
    if (!Number.isInteger(semNumber) || semNumber < 1 || semNumber > 6) {
      throw new ApiError(400, 'Semester must be between 1 and 6.');
    }
    assignment.semester = semNumber;
  }
  if (instructions !== undefined) assignment.instructions = instructions ? instructions.trim() : '';
  if (dueDate !== undefined) assignment.dueDate = dueDate ? new Date(dueDate) : null;
  if (totalMarks !== undefined) assignment.totalMarks = Number(totalMarks);
  if (attachmentUrl !== undefined) assignment.attachmentUrl = attachmentUrl ? attachmentUrl.trim() : '';
  if (status) assignment.status = status.toLowerCase();

  await assignment.save();

  await notifyPublishedRecord(assignment, 'ASSIGNMENT', `${assignment.subject}${assignment.dueDate ? ` · Due ${assignment.dueDate.toLocaleDateString('en-IN')}` : ''}`);

  res.json({
    success: true,
    message: 'Assignment updated successfully.',
    data: assignment,
  });
});

// DELETE /api/assignments/:id
const deleteAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);

  if (!assignment) {
    throw new ApiError(404, 'Assignment not found.');
  }

  await assignment.deleteOne();

  res.json({
    success: true,
    message: 'Assignment deleted successfully.',
  });
});

module.exports = {
  listAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
};
