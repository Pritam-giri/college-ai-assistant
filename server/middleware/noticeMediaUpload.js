const multer = require('multer');
const path = require('node:path');
const ApiError = require('../utils/ApiError');

const IMAGE_LIMIT = 5 * 1024 * 1024;
const ATTACHMENT_LIMIT = 10 * 1024 * 1024;
const imageTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
const documentTypes = {
  '.pdf': ['application/pdf'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ATTACHMENT_LIMIT, files: 2, fields: 20, fieldSize: 1024 * 1024 },
  fileFilter(req, file, callback) {
    const extension = path.extname(file.originalname || '').toLowerCase();
    if (process.env.NODE_ENV !== 'production') console.info('[Media upload] Incoming multipart file', {
      route: `${req.baseUrl || ''}${req.path || ''}`,
      fieldName: file.fieldname,
      fileName: path.basename(file.originalname || 'unnamed').slice(0, 160),
      mimeType: file.mimetype || null,
      extension,
    });
    // Browsers can send an empty or generic MIME type for a valid file. Use
    // the field and extension to select the validation path, then verify the
    // actual bytes below before accepting or storing it.
    const allowed = file.fieldname === 'image'
      ? Object.hasOwn(imageTypes, extension)
      : file.fieldname === 'attachment' && (
        Object.hasOwn(imageTypes, extension) || Object.hasOwn(documentTypes, extension)
      );
    if (!allowed) {
      callback(new ApiError(400, 'Unsupported upload type. Use JPEG, PNG, WebP, PDF, DOCX, XLSX, or PPTX.'));
      return;
    }
    callback(null, true);
  },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'attachment', maxCount: 1 },
]);

async function validateSignatures(req) {
  const files = [ ...(req.files?.image || []), ...(req.files?.attachment || []) ];
  if (!files.length) return;

  const { fileTypeFromBuffer } = await import('file-type');
  for (const file of files) {
    const extension = path.extname(file.originalname || '').toLowerCase();
    if (file.fieldname === 'image' && file.size > IMAGE_LIMIT) {
      throw new ApiError(413, 'Images must be 5 MB or smaller.');
    }
    const detected = await fileTypeFromBuffer(file.buffer);
    const isImage = file.fieldname === 'image';
    const expectedMime = imageTypes[extension] || documentTypes[extension]?.[0];
    const isOfficeZip = ['.docx', '.xlsx', '.pptx'].includes(extension) && detected?.mime === 'application/zip';
    if (!detected || (!isOfficeZip && detected.mime !== expectedMime)) {
      throw new ApiError(400, 'The uploaded file content does not match its allowed file type.');
    }
    // Store a canonical MIME derived from the validated file content/allowed
    // extension instead of preserving a missing or incorrect browser value.
    file.mimetype = expectedMime;
    file.safeOriginalName = String(file.originalname || 'attachment')
      .replace(/[\\/\0]/g, '')
      .slice(0, 160);
  }
}

function noticeMediaUpload(req, res, next) {
  upload(req, res, (uploadError) => {
    if (uploadError) {
      if (process.env.NODE_ENV !== 'production') console.error('[Media upload] Multer rejected request', {
        route: `${req.baseUrl || ''}${req.path || ''}`,
        name: uploadError.name || 'Error',
        message: uploadError.message,
        code: uploadError.code || null,
      });
      if (uploadError instanceof multer.MulterError && uploadError.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(413, 'Uploaded files must be 10 MB or smaller.'));
      }
      return next(uploadError);
    }
    const files = [ ...(req.files?.image || []), ...(req.files?.attachment || []) ];
    if (process.env.NODE_ENV !== 'production') console.info('[Media upload] Multer received files', {
      route: `${req.baseUrl || ''}${req.path || ''}`,
      files: files.map((file) => ({
        fieldName: file.fieldname,
        fileName: file.safeOriginalName || path.basename(file.originalname || 'unnamed').slice(0, 160),
        mimeType: file.mimetype || null,
        size: file.size,
      })),
    });
    validateSignatures(req)
      .then(() => next())
      .catch((error) => {
        if (process.env.NODE_ENV !== 'production') console.error('[Media upload] File signature validation failed', {
          route: `${req.baseUrl || ''}${req.path || ''}`,
          name: error.name || 'Error',
          message: error.message,
          files: files.map((file) => ({ fieldName: file.fieldname, fileName: file.safeOriginalName || file.originalname, mimeType: file.mimetype, size: file.size })),
        });
        next(error);
      });
  });
}

module.exports = { noticeMediaUpload, mediaUpload: noticeMediaUpload, IMAGE_LIMIT, ATTACHMENT_LIMIT };
