// controllers/documentController.js

const Document = require('../models/Document');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { validateHttpUrl } = require('../utils/httpUrl');
const objectStorage = require('../services/objectStorageService');
const documentIndex = require('../services/documentIndexService');

const DOCUMENT_FIELDS = [
  'title',
  'category',
  'fileUrl',
  'description',
  'originalName',
  'mimeType',
  'size',
  'department',
];

async function indexUploadedDocument(document, fileBuffer) {
  document.indexingStatus = 'pending';
  document.indexedChunkCount = 0;
  document.indexedAt = undefined;
  document.indexingMessage = undefined;
  await document.save();

  try {
    document.indexedChunkCount = await documentIndex.indexUploadedPdf(document, fileBuffer);
    document.indexingStatus = 'ready';
    document.indexedAt = new Date();
  } catch (error) {
    document.indexingStatus = 'failed';
    document.indexedChunkCount = 0;
    document.indexingMessage = error?.message?.includes('No selectable text')
      ? 'No selectable text found. Scanned PDFs need OCR before indexing.'
      : error?.isAIProviderError
      ? 'Gemini embeddings are unavailable. Check GEMINI_API_KEY and retry by uploading the PDF again.'
      : error?.message?.includes('too long')
      ? 'This PDF is too long to index. Split it into smaller documents.'
      : 'PDF indexing failed. Check the PDF and Gemini settings, then upload it again.';
    await documentIndex.removeDocumentChunks(document._id).catch(() => {});
    console.error('Document indexing failed', { name: error?.name || 'Error' });
  }
  await document.save();
}

function validateDocumentFields(data, { creating = false } = {}) {
  if (creating && (typeof data.title !== 'string' || typeof data.fileUrl !== 'string')) {
    throw new ApiError(400, 'title and fileUrl are required strings.');
  }
  if (data.title !== undefined && (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 200)) {
    throw new ApiError(400, 'title must be a non-empty string of at most 200 characters.');
  }
  if (data.fileUrl !== undefined) {
    data.fileUrl = validateHttpUrl(data.fileUrl, 'fileUrl');
  }
  for (const [field, maxLength] of [['category', 100], ['description', 5000], ['originalName', 255], ['mimeType', 100]]) {
    if (data[field] !== undefined && (typeof data[field] !== 'string' || data[field].length > maxLength)) {
      throw new ApiError(400, `${field} must be a string of at most ${maxLength} characters.`);
    }
  }
  if (data.size !== undefined && (!Number.isSafeInteger(data.size) || data.size < 0)) {
    throw new ApiError(400, 'size must be a non-negative safe integer.');
  }
}

function pickDocumentFields(payload) {
  const data = {};

  for (const field of DOCUMENT_FIELDS) {
    if (payload[field] !== undefined) {
      data[field] = payload[field];
    }
  }

  return data;
}

// GET /api/documents
const list = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.department) {
    filter.department = req.query.department.toUpperCase();
  }

  if (req.query.category) {
    filter.category = req.query.category;
  }

  const documents = await Document.find(filter)
    .populate('uploadedBy', 'name')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: documents.length,
    data: documents,
  });
});

// GET /api/documents/:id
const getOne = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id)
    .populate('uploadedBy', 'name');

  if (!document) {
    throw new ApiError(404, 'Document not found');
  }

  res.json({
    success: true,
    data: document,
  });
});

// POST /api/documents
const create = asyncHandler(async (req, res) => {
  const data = pickDocumentFields(req.body);
  let stored = null;
  try {
    if (req.file) {
      stored = await objectStorage.uploadCollegeDocument(req.file);
      Object.assign(data, {
        fileUrl: stored.url,
        originalName: req.file.safeOriginalName,
        mimeType: stored.mimeType,
        size: stored.size,
        storagePublicId: stored.publicId,
        storageResourceType: stored.resourceType,
      });
    }
    validateDocumentFields(data, { creating: true });
  } catch (error) {
    if (stored) await objectStorage.deleteStoredMedia(stored).catch(() => {});
    throw error;
  }

  // Automatically record the logged-in admin as uploader
  data.uploadedBy = req.user._id;

  let document;
  try {
    document = await Document.create(data);
  } catch (error) {
    if (stored) await objectStorage.deleteStoredMedia(stored).catch(() => {});
    throw error;
  }

  if (req.file) await indexUploadedDocument(document, req.file.buffer);

  const populated = await Document.findById(document._id)
    .populate('uploadedBy', 'name');

  res.status(201).json({
    success: true,
    data: populated,
  });
});

// PUT /api/documents/:id
const update = asyncHandler(async (req, res) => {
  const fields = pickDocumentFields(req.body);
  const document = await Document.findById(req.params.id).select('+storagePublicId +storageResourceType');

  if (!document) {
    throw new ApiError(404, 'Document not found');
  }

  let stored = null;
  const previousMedia = document.storagePublicId
    ? { publicId: document.storagePublicId, resourceType: document.storageResourceType, mimeType: document.mimeType }
    : null;
  let shouldRemovePreviousMedia = false;
  let shouldRemoveChunks = false;
  try {
    if (req.file) {
      stored = await objectStorage.uploadCollegeDocument(req.file);
      Object.assign(fields, {
        fileUrl: stored.url,
        originalName: req.file.safeOriginalName,
        mimeType: stored.mimeType,
        size: stored.size,
      });
      document.storagePublicId = stored.publicId;
      document.storageResourceType = stored.resourceType;
      shouldRemovePreviousMedia = Boolean(previousMedia);
    } else if (fields.fileUrl !== undefined && fields.fileUrl !== document.fileUrl) {
      shouldRemoveChunks = true;
      document.indexingStatus = 'not_indexed';
      document.indexedChunkCount = 0;
      document.indexedAt = undefined;
      document.indexingMessage = undefined;
      if (previousMedia) {
        document.storagePublicId = undefined;
        document.storageResourceType = undefined;
        shouldRemovePreviousMedia = true;
      }
    }
    validateDocumentFields(fields);
    document.set(fields);
    await document.save();
  } catch (error) {
    if (stored) await objectStorage.deleteStoredMedia(stored).catch(() => {});
    throw error;
  }
  if (shouldRemoveChunks) await documentIndex.removeDocumentChunks(document._id);
  if (req.file) {
    await indexUploadedDocument(document, req.file.buffer);
  } else if (document.indexingStatus === 'ready') {
    await documentIndex.syncDocumentMetadata(document);
  }
  if (shouldRemovePreviousMedia && previousMedia) await objectStorage.deleteStoredMedia(previousMedia).catch(() => {});

  const populated = await Document.findById(document._id)
    .populate('uploadedBy', 'name');

  res.json({
    success: true,
    data: populated,
  });
});

// DELETE /api/documents/:id
const remove = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id).select('+storagePublicId +storageResourceType');

  if (!document) {
    throw new ApiError(404, 'Document not found');
  }

  await documentIndex.removeDocumentChunks(document._id);
  await document.deleteOne();
  if (document.storagePublicId) {
    await objectStorage.deleteStoredMedia({
      publicId: document.storagePublicId,
      resourceType: document.storageResourceType,
      mimeType: document.mimeType,
    }).catch(() => {});
  }

  res.json({
    success: true,
    message: 'Document deleted',
  });
});

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
};
