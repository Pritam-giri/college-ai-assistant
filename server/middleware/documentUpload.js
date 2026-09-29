const multer = require('multer');
const path = require('node:path');
const ApiError = require('../utils/ApiError');

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_SIZE, files: 1, fields: 10, fieldSize: 1024 * 1024 },
  fileFilter(req, file, callback) {
    const extension = path.extname(file.originalname || '').toLowerCase();
    if (extension !== '.pdf' || file.mimetype !== 'application/pdf') {
      callback(new ApiError(400, 'Only PDF documents are accepted.'));
      return;
    }
    callback(null, true);
  },
}).single('file');

function documentUpload(req, res, next) {
  upload(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(413, 'PDF documents must be 10 MB or smaller.'));
      }
      return next(error);
    }
    if (!req.file) return next();

    import('file-type')
      .then(({ fileTypeFromBuffer }) => fileTypeFromBuffer(req.file.buffer))
      .then((detected) => {
        if (detected?.mime !== 'application/pdf') {
          throw new ApiError(400, 'The uploaded file is not a valid PDF.');
        }
        req.file.safeOriginalName = String(req.file.originalname || 'document.pdf')
          .replace(/[\\/\0]/g, '')
          .slice(0, 160);
        next();
      })
      .catch(next);
  });
}

module.exports = { documentUpload, MAX_DOCUMENT_SIZE };
