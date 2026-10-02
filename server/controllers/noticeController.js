// controllers/noticeController.js
//
// Thin controller: the "who sees what" rules live in services/noticeService.js.

const Notice = require('../models/Notice');
require('../models/User'); // registers the User model so .populate('postedBy') works
const noticeService = require('../services/noticeService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination } = require('../utils/pagination');

// Only these fields may be set from the request body. This stops a client
// from sending e.g. `postedBy` or `_id` and overwriting things it shouldn't.
const NOTICE_FIELDS = ['title', 'body', 'department', 'category', 'expiresAt', 'publishedAt', 'semester', 'isImportant', 'attachment'];
const objectStorage = require('../services/objectStorageService');
const { notifyPublishedRecord } = require('../services/notificationService');

function pickNoticeFields(payload) {
  const data = {};
  for (const field of NOTICE_FIELDS) {
    if (payload[field] !== undefined) data[field] = payload[field];
  }
  if (data.expiresAt === '') data.expiresAt = null; // '' means "never expires"
  if (data.semester === '' || data.semester === undefined) data.semester = 'ALL';
  if (data.isImportant !== undefined) data.isImportant = data.isImportant === true || data.isImportant === 'true';
  if ('attachment' in data) {
    const a = data.attachment;
    data.attachment =
      a && typeof a === 'object'
        ? { url: a.url, originalName: a.originalName, mimeType: a.mimeType, size: a.size }
        : undefined; // null / '' removes the attachment
  }
  return data;
}

function uploadedFile(files, field) {
  return files?.[field]?.[0] || null;
}

function cleanupMedia(media) {
  return Promise.all((media || []).map((item) => objectStorage.deleteStoredMedia(item).catch(() => {})));
}

async function notifyPublishedNotice(notice) {
  await notifyPublishedRecord(notice, 'NOTICE', notice.body);
}

// GET /api/notices   (any logged-in user)
// ?department=CSE &category=exam &search=fee &status=active|expired|all &page=1 &limit=20
const list = asyncHandler(async (req, res) => {
  const filter = noticeService.buildNoticeFilter(req.user, req.query);
  const { page, limit, skip } = getPagination(req.query);

  const [notices, total] = await Promise.all([
    Notice.find(filter)
      .sort({ publishedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate('postedBy', 'name'),
    Notice.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: notices.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: notices,
  });
});

// GET /api/notices/categories   (any logged-in user)
const categories = asyncHandler(async (req, res) => {
  res.json({ success: true, data: Notice.CATEGORIES });
});

// GET /api/notices/:id   (any logged-in user)
const getOne = asyncHandler(async (req, res) => {
  const visibilityFilter = noticeService.buildNoticeFilter(req.user, req.query);
  const notice = await Notice.findOne({
    $and: [{ _id: req.params.id }, visibilityFilter],
  }).populate('postedBy', 'name');
  // Apply the same department and expiry rules to ID lookups as list queries.
  if (!notice) {
    throw new ApiError(404, 'Notice not found');
  }
  res.json({ success: true, data: notice });
});

// POST /api/notices   (admin)
const create = asyncHandler(async (req, res) => {
  const uploaded = [];
  const imageFile = uploadedFile(req.files, 'image');
  const attachmentFile = uploadedFile(req.files, 'attachment');
  if (attachmentFile && req.body.attachmentUrl) throw new ApiError(400, 'Choose an attachment upload or a link, not both.');

  let image;
  let attachment;
  try {
    if (imageFile) {
      if (process.env.NODE_ENV !== 'production') console.info('[Notice create] Uploading notice image', { fileName: imageFile.safeOriginalName, mimeType: imageFile.mimetype, size: imageFile.size });
      image = await objectStorage.uploadNoticeImage(imageFile);
      uploaded.push(image);
    }
    if (attachmentFile) {
      if (process.env.NODE_ENV !== 'production') console.info('[Notice create] Uploading notice attachment', { fileName: attachmentFile.safeOriginalName, mimeType: attachmentFile.mimetype, size: attachmentFile.size });
      attachment = {
        ...(await objectStorage.uploadNoticeAttachment(attachmentFile)),
        originalName: attachmentFile.safeOriginalName,
      };
      uploaded.push(attachment);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('[Notice create] Media storage stage failed', { stage: 'cloudinary', name: error.name || 'Error', message: error.message, stack: error.stack });
    await cleanupMedia(uploaded);
    throw error;
  }

  const data = pickNoticeFields(req.body);
  if (req.body.attachmentUrl) {
    data.attachment = {
      url: req.body.attachmentUrl.trim(),
      originalName: req.body.attachmentName ? String(req.body.attachmentName).slice(0, 160) : 'Attachment',
      mimeType: '',
    };
  }
  if (image) data.image = image;
  if (attachment) data.attachment = attachment;

  let notice;
  try {
    notice = await Notice.create({ ...data, postedBy: req.user._id });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('[Notice create] MongoDB Notice creation failed after media upload', {
      name: error.name || 'Error',
      message: error.message,
      code: error.code || null,
      stack: error.stack,
      imageMetadataPresent: Boolean(image?.url && image?.publicId),
      attachmentMetadataPresent: Boolean(attachment?.url && attachment?.publicId),
    });
    await cleanupMedia(uploaded);
    throw error;
  }
  if (process.env.NODE_ENV !== 'production') console.info('[Notice create] MongoDB Notice saved', {
    noticeId: String(notice._id),
    imageUrlPresent: Boolean(notice.image?.url),
    imagePublicIdPresent: Boolean(notice.image?.publicId),
    imageMimeType: notice.image?.mimeType || null,
    attachmentUrlPresent: Boolean(notice.attachment?.url),
    attachmentPublicIdPresent: Boolean(notice.attachment?.publicId),
  });
  await notifyPublishedNotice(notice);
  res.status(201).json({ success: true, data: notice });
});

// PUT /api/notices/:id   (admin)
const update = asyncHandler(async (req, res) => {
  const notice = await Notice.findById(req.params.id);
  if (!notice) throw new ApiError(404, 'Notice not found');

  const imageFile = uploadedFile(req.files, 'image');
  const attachmentFile = uploadedFile(req.files, 'attachment');
  if (attachmentFile && req.body.attachmentUrl) throw new ApiError(400, 'Choose an attachment upload or a link, not both.');

  const previousMedia = [];
  const uploaded = [];
  let image;
  let attachment;
  try {
    if (imageFile) {
      image = await objectStorage.uploadNoticeImage(imageFile);
      uploaded.push(image);
    }
    if (attachmentFile) {
      attachment = {
        ...(await objectStorage.uploadNoticeAttachment(attachmentFile)),
        originalName: attachmentFile.safeOriginalName,
      };
      uploaded.push(attachment);
    }
  } catch (error) {
    await cleanupMedia(uploaded);
    throw error;
  }

  const updateData = pickNoticeFields(req.body);
  if (req.body.attachmentUrl !== undefined) {
    updateData.attachment = req.body.attachmentUrl
      ? { url: req.body.attachmentUrl.trim(), originalName: req.body.attachmentName ? String(req.body.attachmentName).slice(0, 160) : 'Attachment', mimeType: '' }
      : undefined;
  }
  if (req.body.removeImage === 'true' && notice.image?.publicId) previousMedia.push(notice.image);
  if (req.body.removeImage === 'true' || image) updateData.image = image;
  if (req.body.removeAttachment === 'true' && notice.attachment?.publicId) previousMedia.push(notice.attachment);
  if (req.body.removeAttachment === 'true') updateData.attachment = undefined;
  if (image) {
    if (notice.image?.publicId) previousMedia.push(notice.image);
    updateData.image = image;
  }
  if (attachment) {
    if (notice.attachment?.publicId) previousMedia.push(notice.attachment);
    updateData.attachment = attachment;
  }

  notice.set(updateData);
  try {
    await notice.save();
  } catch (error) {
    await cleanupMedia(uploaded);
    throw error;
  }
  await cleanupMedia(previousMedia);
  await notifyPublishedNotice(notice);

  res.json({ success: true, data: notice });
});

// DELETE /api/notices/:id   (admin)
const remove = asyncHandler(async (req, res) => {
  const notice = await Notice.findById(req.params.id);
  if (!notice) throw new ApiError(404, 'Notice not found');

  await notice.deleteOne();
  await cleanupMedia([notice.image, notice.attachment].filter((media) => media?.publicId));
  res.json({ success: true, message: 'Notice deleted' });
});

module.exports = { list, categories, getOne, create, update, remove };
