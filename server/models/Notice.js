// models/Notice.js
const mongoose = require('mongoose');
const departmentPlugin = require('../plugins/departmentPlugin');

// STEP 2: fixed list so the admin form / student filter can show a dropdown.
const NOTICE_CATEGORIES = [
  'general',
  'academic',
  'exam',
  'event',
  'holiday',
  'scholarship',
  'placement',
  'administrative',
];

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    publishedAt: { type: Date, default: Date.now },

    // STEP 2: fields the admin dashboard needs -----------------------------
    category: { type: String, enum: NOTICE_CATEGORIES, default: 'general', lowercase: true, trim: true },
    semester: { type: String, enum: ['ALL', '1', '2', '3', '4', '5', '6'], default: 'ALL' },
    isImportant: { type: Boolean, default: false },
    image: {
      url: { type: String, trim: true },
      publicId: { type: String, trim: true },
      resourceType: { type: String, trim: true, default: 'image' },
      mimeType: { type: String, trim: true },
      size: { type: Number },
    },
    // null = never expires. Students only see notices whose expiry is
    // empty or still in the future.
    expiresAt: {
      type: Date,
      default: null,
      validate: {
        validator: function (value) {
          if (!value) return true;
          const start = this.publishedAt instanceof Date ? this.publishedAt : new Date();
          return value > start;
        },
        message: 'expiresAt must be later than the publish date',
      },
    },
    // Metadata of one optional uploaded file (the upload endpoint that fills
    // this in comes later; the schema is ready for it).
    attachment: {
      url: { type: String, trim: true },
      originalName: { type: String, trim: true },
      mimeType: { type: String, trim: true },
      size: { type: Number },
      publicId: { type: String, trim: true },
      resourceType: { type: String, trim: true, default: 'raw' },
    },
  },
  { timestamps: true, versionKey: false, toJSON: { virtuals: true, versionKey: false } }
);

noticeSchema.plugin(departmentPlugin); // adds + validates `department`
noticeSchema.index({ publishedAt: -1 });
noticeSchema.index({ expiresAt: 1 }); // STEP 2: speeds up "active notices" queries
noticeSchema.index({ department: 1, semester: 1, publishedAt: -1 });

noticeSchema.virtual('isExpired').get(function () {
  return Boolean(this.expiresAt && this.expiresAt <= new Date());
});

const Notice = mongoose.model('Notice', noticeSchema);
Notice.CATEGORIES = NOTICE_CATEGORIES;

module.exports = Notice;
