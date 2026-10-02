const { Readable } = require('node:stream');
const { randomUUID } = require('node:crypto');
const { v2: cloudinary } = require('cloudinary');

function redactCloudinaryText(value) {
  let text = String(value ?? '');
  for (const secret of [process.env.CLOUDINARY_API_SECRET, process.env.CLOUDINARY_API_KEY]) {
    if (secret) text = text.split(secret).join('[REDACTED]');
  }
  return text
    .replace(/(api[_-]?secret|api[_-]?key|signature)\s*[:=]\s*[^\s,}"']+/gi, '$1=[REDACTED]')
    .replace(/(authorization:\s*basic)\s+[^\s]+/gi, '$1 [REDACTED]');
}

function getCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (process.env.NODE_ENV !== 'production') {
    console.info('[Media upload] Cloudinary configuration', {
      cloudNameConfigured: Boolean(cloudName),
      apiKeyConfigured: Boolean(apiKey),
      apiSecretConfigured: Boolean(apiSecret),
    });
  }
  if (!cloudName || !apiKey || !apiSecret) {
    const error = new Error('Cloudinary media storage is not configured.');
    error.status = 503;
    throw error;
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return cloudinary;
}

function uploadBuffer(file, { resourceType, folder, extension }) {
  const provider = getCloudinary();
  const publicId = `${randomUUID()}${resourceType === 'raw' ? extension : ''}`;
  if (process.env.NODE_ENV !== 'production') console.info('[Media upload] Sending file to Cloudinary', {
    resourceType,
    folder,
    fieldName: file.fieldname,
    fileName: file.safeOriginalName || file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  });
  return new Promise((resolve, reject) => {
    const upload = provider.uploader.upload_stream({
      resource_type: resourceType,
      folder,
      public_id: publicId,
      overwrite: false,
      use_filename: false,
      unique_filename: false,
    }, (error, result) => {
      if (error || !result?.secure_url || !result?.public_id) {
        const cloudinaryMessage = redactCloudinaryText(error?.message || 'Cloudinary returned no secure URL or public ID.');
        if (process.env.NODE_ENV !== 'production') console.error('[Media upload] Cloudinary upload failed', {
          name: error?.name || 'CloudinaryError',
          message: cloudinaryMessage,
          httpCode: error?.http_code || error?.httpCode || null,
          code: error?.code || null,
          stack: redactCloudinaryText(error?.stack || ''),
        });
        const failure = new Error(`Cloudinary upload failed: ${cloudinaryMessage}`, { cause: error });
        failure.statusCode = 502;
        failure.isNoticeMediaError = true;
        reject(failure);
        return;
      }
      if (process.env.NODE_ENV !== 'production') console.info('[Media upload] Cloudinary upload succeeded', {
        secureUrlPresent: Boolean(result.secure_url),
        publicIdPresent: Boolean(result.public_id),
        resourceType: result.resource_type || resourceType,
        format: result.format || null,
      });
      resolve({
        url: result.secure_url,
        publicId: result.public_id,
        resourceType,
        mimeType: file.mimetype,
        size: file.size,
      });
    });
    Readable.from(file.buffer).pipe(upload);
  });
}

function uploadNoticeImage(file) {
  return uploadBuffer(file, {
    resourceType: 'image',
    folder: 'college-ai-assistant/notices/images',
    extension: '',
  });
}

function uploadAcademicImage(file, contentType) {
  const folders = {
    practical: 'practicals',
    assignment: 'assignments',
    syllabus: 'syllabus',
  };
  const folderName = folders[contentType];
  if (!folderName) throw new Error('Unsupported academic image category.');
  return uploadBuffer(file, {
    resourceType: 'image',
    folder: `college-ai-assistant/${folderName}/images`,
    extension: '',
  });
}

function uploadAcademicAttachment(file, contentType) {
  const folders = {
    practical: 'practicals',
    assignment: 'assignments',
  };
  const folderName = folders[contentType];
  if (!folderName) throw new Error('Unsupported academic attachment category.');
  const isImage = String(file.mimetype || '').startsWith('image/');
  const extension = isImage ? '' : `.${String(file.safeOriginalName || file.originalname || '').split('.').pop().toLowerCase()}`;
  return uploadBuffer(file, {
    resourceType: isImage ? 'image' : 'raw',
    folder: `college-ai-assistant/${folderName}/attachments`,
    extension,
  });
}

function uploadNoticeAttachment(file) {
  const extension = `.${String(file.originalname || '').split('.').pop().toLowerCase()}`;
  return uploadBuffer(file, {
    resourceType: 'raw',
    folder: 'college-ai-assistant/notices/attachments',
    extension,
  });
}

function uploadCollegeDocument(file) {
  return uploadBuffer(file, {
    resourceType: 'raw',
    folder: 'college-ai-assistant/documents',
    extension: '.pdf',
  });
}

async function deleteStoredMedia(media) {
  if (!media?.publicId) return;
  const provider = getCloudinary();
  const resourceType = media.resourceType || (media.mimeType?.startsWith('image/') ? 'image' : 'raw');
  await provider.uploader.destroy(media.publicId, { resource_type: resourceType, invalidate: true });
}

module.exports = { uploadNoticeImage, uploadAcademicImage, uploadAcademicAttachment, uploadNoticeAttachment, uploadCollegeDocument, deleteStoredMedia };
