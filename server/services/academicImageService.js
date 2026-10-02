const objectStorage = require('./objectStorageService');

function uploadedImage(req) {
  return req.files?.image?.[0] || null;
}

function uploadedAttachment(req) {
  return req.files?.attachment?.[0] || null;
}

function imageMetadata(image, file) {
  return image
    ? { ...image, fileName: file.safeOriginalName || file.originalname || '' }
    : undefined;
}

function attachmentMetadata(media, file) {
  return media
    ? { ...media, originalName: file.safeOriginalName || file.originalname || '' }
    : undefined;
}

async function cleanup(image) {
  if (!image?.publicId) return;
  try {
    await objectStorage.deleteStoredMedia(image);
  } catch (error) {
    console.error('[Academic media] Cloudinary cleanup failed', {
      message: error.message,
      publicIdPresent: true,
    });
  }
}

async function createWithImage(Model, data, file, category) {
  let image;
  if (file) {
    image = imageMetadata(await objectStorage.uploadAcademicImage(file, category), file);
  }

  try {
    return await Model.create({ ...data, ...(image ? { image } : {}) });
  } catch (error) {
    await cleanup(image);
    throw error;
  }
}

async function updateWithImage(record, data, file, removeImage, category) {
  let image;
  if (file) {
    image = imageMetadata(await objectStorage.uploadAcademicImage(file, category), file);
  }

  const previousImage = record.image?.publicId ? record.image.toObject?.() || record.image : null;
  record.set(data);
  if (image) record.image = image;
  else if (removeImage) record.image = undefined;

  try {
    await record.save();
  } catch (error) {
    await cleanup(image);
    throw error;
  }

  if ((image || removeImage) && previousImage?.publicId) await cleanup(previousImage);
  return record;
}

async function createWithMedia(Model, data, imageFile, attachmentFile, category) {
  let image;
  let attachment;
  try {
    if (imageFile) image = imageMetadata(await objectStorage.uploadAcademicImage(imageFile, category), imageFile);
    if (attachmentFile) attachment = attachmentMetadata(await objectStorage.uploadAcademicAttachment(attachmentFile, category), attachmentFile);
    return await Model.create({
      ...data,
      ...(image ? { image } : {}),
      ...(attachment ? { attachment, attachmentUrl: attachment.url } : {}),
    });
  } catch (error) {
    await Promise.all([cleanup(image), cleanup(attachment)]);
    throw error;
  }
}

async function updateWithMedia(record, data, imageFile, removeImage, attachmentFile, category) {
  let image;
  let attachment;
  try {
    if (imageFile) image = imageMetadata(await objectStorage.uploadAcademicImage(imageFile, category), imageFile);
    if (attachmentFile) attachment = attachmentMetadata(await objectStorage.uploadAcademicAttachment(attachmentFile, category), attachmentFile);
  } catch (error) {
    await Promise.all([cleanup(image), cleanup(attachment)]);
    throw error;
  }

  const previousImage = record.image?.publicId ? record.image.toObject?.() || record.image : null;
  const previousAttachment = record.attachment?.publicId ? record.attachment.toObject?.() || record.attachment : null;
  const previousAttachmentUrl = record.attachmentUrl;
  record.set(data);
  if (image) record.image = image;
  else if (removeImage) record.image = undefined;
  if (attachment) {
    record.attachment = attachment;
    record.attachmentUrl = attachment.url;
  } else if (Object.hasOwn(data, 'attachmentUrl') && data.attachmentUrl !== previousAttachmentUrl) {
    record.attachment = undefined;
  }

  try {
    await record.save();
  } catch (error) {
    await Promise.all([cleanup(image), cleanup(attachment)]);
    throw error;
  }

  const cleanupTasks = [];
  if ((image || removeImage) && previousImage?.publicId) cleanupTasks.push(cleanup(previousImage));
  if ((attachment || record.attachmentUrl !== previousAttachmentUrl) && previousAttachment?.publicId) cleanupTasks.push(cleanup(previousAttachment));
  await Promise.all(cleanupTasks);
  return record;
}

async function cleanupAcademicMedia(record) {
  await Promise.all([cleanup(record?.image), cleanup(record?.attachment)]);
}

module.exports = { uploadedImage, uploadedAttachment, createWithImage, updateWithImage, createWithMedia, updateWithMedia, cleanupAcademicMedia };
