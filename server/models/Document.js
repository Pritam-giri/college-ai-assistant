// models/Document.js
const mongoose = require('mongoose');
const departmentPlugin = require('../plugins/departmentPlugin');

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true }, // e.g. "circular", "form", "result"
    fileUrl: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // STEP 2: file metadata, filled in by the upload endpoint (added later)
    description: { type: String, trim: true },
    originalName: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    size: { type: Number }, // bytes
    storagePublicId: { type: String, trim: true, select: false },
    storageResourceType: { type: String, trim: true, default: 'raw', select: false },
    indexingStatus: {
      type: String,
      enum: ['not_indexed', 'pending', 'ready', 'failed'],
      default: 'not_indexed',
      index: true,
    },
    indexedChunkCount: { type: Number, default: 0, min: 0 },
    indexedAt: { type: Date },
    indexingMessage: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true, versionKey: false }
);

documentSchema.plugin(departmentPlugin);

module.exports = mongoose.model('Document', documentSchema);
