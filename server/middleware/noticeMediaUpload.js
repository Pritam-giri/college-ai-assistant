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
    const allowed = file.fieldname === 'image'
      ? imageTypes[extension] === file.mimetype
      : file.fieldname === 'attachment' && documentTypes[extension]?.includes(file.mimetype);
    if (!allowed) {
      callback(new ApiError(400, 'Unsupported notice media type. Use JPEG, PNG, WebP, PDF, DOCX, XLSX, or PPTX.'));
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
      throw new ApiError(413, 'Notice images must be 5 MB or smaller.');
    }
    const detected = await fileTypeFromBuffer(file.buffer);
    const isImage = file.fieldname === 'image';
    const expectedMime = isImage
      ? imageTypes[extension]
      : documentTypes[extension]?.[0];
    const isOfficeZip = ['.docx', '.xlsx', '.pptx'].includes(extension) && detected?.mime === 'application/zip';
    if (!detected || (!isOfficeZip && detected.mime !== expectedMime)) {
      throw new ApiError(400, 'The uploaded file content does not match its allowed file type.');
    }
    file.safeOriginalName = String(file.originalname || 'attachment')
      .replace(/[\\/\0]/g, '')
      .slice(0, 160);
  }
}

function noticeMediaUpload(req, res, next) {
  upload(req, res, (uploadError) => {
    if (uploadError) {
      if (uploadError instanceof multer.MulterError && uploadError.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(413, 'Notice attachments must be 10 MB or smaller.'));
      }
      return next(uploadError);
    }
    validateSignatures(req).then(() => next()).catch(next);
  });
}

module.exports = { noticeMediaUpload, IMAGE_LIMIT, ATTACHMENT_LIMIT };
