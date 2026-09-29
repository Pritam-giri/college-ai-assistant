const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['NOTICE', 'ASSIGNMENT', 'PRACTICAL', 'ANNOUNCEMENT'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  message: { type: String, trim: true, maxlength: 400, default: '' },
  referenceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  referenceType: { type: String, enum: ['NOTICE', 'ASSIGNMENT', 'PRACTICAL', 'ANNOUNCEMENT'], required: true },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index(
  { recipient: 1, referenceType: 1, referenceId: 1 },
  { unique: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
