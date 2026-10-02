const mongoose = require('mongoose');

const contentReadSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  contentType: {
    type: String,
    enum: ['notice', 'assignment', 'practical'],
    required: true,
  },
  readAt: { type: Date, default: Date.now, required: true },
}, { timestamps: true, versionKey: false });

contentReadSchema.index(
  { userId: 1, contentType: 1, contentId: 1 },
  { unique: true }
);

module.exports = mongoose.model('ContentRead', contentReadSchema);
