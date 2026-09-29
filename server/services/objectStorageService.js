const { Readable } = require('node:stream');
const { randomUUID } = require('node:crypto');
const { v2: cloudinary } = require('cloudinary');

function getCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
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
  return new Promise((resolve, reject) => {
    const upload = provider.uploader.upload_stream({
      resource_type: resourceType,
      folder,
      public_id: publicId,
      overwrite: false,
      use_filename: false,
      unique_filename: false,
      ...(resourceType === 'raw' ? { flags: 'attachment' } : {}),
    }, (error, result) => {
      if (error || !result?.secure_url || !result?.public_id) {
        const failure = new Error('Notice media upload failed.');
        failure.status = 502;
        reject(failure);
        return;
      }
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

module.exports = { uploadNoticeImage, uploadNoticeAttachment, uploadCollegeDocument, deleteStoredMedia };
