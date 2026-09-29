const mongoose = require('mongoose');

const knowledgeChunkSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true,
  },
  title: { type: String, required: true, trim: true },
  category: { type: String, trim: true },
  department: { type: String, required: true, uppercase: true, trim: true, index: true },
  fileUrl: { type: String, required: true },
  uploadedAt: { type: Date },
  chunkIndex: { type: Number, required: true },
  content: { type: String, required: true },
  embedding: { type: [Number], required: true, select: false },
}, { timestamps: true, versionKey: false });

knowledgeChunkSchema.index({ document: 1, chunkIndex: 1 }, { unique: true });
knowledgeChunkSchema.index({ department: 1, category: 1 });

module.exports = mongoose.model('KnowledgeChunk', knowledgeChunkSchema);
