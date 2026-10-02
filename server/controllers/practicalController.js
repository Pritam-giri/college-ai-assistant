const Practical = require('../models/Practical');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { escapeRegex } = require('../utils/text');
const { validateHttpUrl } = require('../utils/httpUrl');
const { notifyPublishedRecord } = require('../services/notificationService');
const { uploadedImage, uploadedAttachment, createWithMedia, updateWithMedia, cleanupAcademicMedia } = require('../services/academicImageService');

// GET /api/practicals
const listPracticals = asyncHandler(async (req, res) => {
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

  const practicals = await Practical.find(filter)
    .populate('createdBy', 'name')
    .sort({ dueDate: 1, createdAt: -1 });

  res.json({
    success: true,
    count: practicals.length,
    data: practicals,
  });
});

// GET /api/practicals/:id
const getPracticalById = asyncHandler(async (req, res) => {
  const practical = await Practical.findById(req.params.id).populate('createdBy', 'name');

  if (!practical) {
    throw new ApiError(404, 'Practical not found.');
  }

  if (req.user.role === 'student') {
    const studentDept = req.user.department ? req.user.department.toUpperCase() : null;
    const matchesDept = practical.department === 'ALL' || practical.department === studentDept;
    const matchesSem = practical.semester === req.user.semester;

    if (!matchesDept || !matchesSem || practical.status !== 'published') {
      throw new ApiError(403, 'You do not have access to view this practical.');
    }
  }

  res.json({
    success: true,
    data: practical,
  });
});

// POST /api/practicals
const createPractical = asyncHandler(async (req, res) => {
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
  const attachmentFile = uploadedAttachment(req);
  if (attachmentFile && String(attachmentUrl || '').trim()) throw new ApiError(400, 'Choose an attachment upload or a URL, not both.');

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

  const practical = await createWithMedia(Practical, {
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
  }, uploadedImage(req), attachmentFile, 'practical');

  await notifyPublishedRecord(practical, 'PRACTICAL', `${practical.subject}${practical.dueDate ? ` · Due ${practical.dueDate.toLocaleDateString('en-IN')}` : ''}`);

  res.status(201).json({
    success: true,
    message: 'Practical created successfully.',
    data: practical,
  });
});

// PUT /api/practicals/:id
const updatePractical = asyncHandler(async (req, res) => {
  const practical = await Practical.findById(req.params.id);

  if (!practical) {
    throw new ApiError(404, 'Practical not found.');
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
  const attachmentFile = uploadedAttachment(req);
  if (attachmentFile && String(attachmentUrl || '').trim()) throw new ApiError(400, 'Choose an attachment upload or a URL, not both.');

  validateHttpUrl(attachmentUrl, 'attachmentUrl');

  if (title) practical.title = title.trim();
  if (description !== undefined) practical.description = description ? description.trim() : '';
  if (subject) practical.subject = subject.trim();
  if (subjectCode !== undefined) practical.subjectCode = subjectCode ? subjectCode.trim().toUpperCase() : '';
  if (department) {
    const deptUpper = department.toUpperCase();
    if (!['CSE', 'ELECTRONICS', 'ALL'].includes(deptUpper)) {
      throw new ApiError(400, 'Department must be CSE, ELECTRONICS, or ALL.');
    }
    practical.department = deptUpper;
  }
  if (semester !== undefined) {
    const semNumber = Number(semester);
    if (!Number.isInteger(semNumber) || semNumber < 1 || semNumber > 6) {
      throw new ApiError(400, 'Semester must be between 1 and 6.');
    }
    practical.semester = semNumber;
  }
  if (instructions !== undefined) practical.instructions = instructions ? instructions.trim() : '';
  if (dueDate !== undefined) practical.dueDate = dueDate ? new Date(dueDate) : null;
  if (totalMarks !== undefined) practical.totalMarks = Number(totalMarks);
  const attachmentData = attachmentUrl !== undefined ? { attachmentUrl: attachmentUrl ? attachmentUrl.trim() : '' } : {};
  if (status) practical.status = status.toLowerCase();

  await updateWithMedia(
    practical,
    attachmentData,
    uploadedImage(req),
    req.body.removeImage === 'true',
    attachmentFile,
    'practical'
  );

  await notifyPublishedRecord(practical, 'PRACTICAL', `${practical.subject}${practical.dueDate ? ` · Due ${practical.dueDate.toLocaleDateString('en-IN')}` : ''}`);

  res.json({
    success: true,
    message: 'Practical updated successfully.',
    data: practical,
  });
});

// DELETE /api/practicals/:id
const deletePractical = asyncHandler(async (req, res) => {
  const practical = await Practical.findById(req.params.id);

  if (!practical) {
    throw new ApiError(404, 'Practical not found.');
  }

  await practical.deleteOne();
  await cleanupAcademicMedia(practical);

  res.json({
    success: true,
    message: 'Practical deleted successfully.',
  });
});

module.exports = {
  listPracticals,
  getPracticalById,
  createPractical,
  updatePractical,
  deletePractical,
};
