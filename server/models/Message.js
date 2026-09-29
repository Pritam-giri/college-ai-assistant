const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    department: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'ALL',
    },
    sources: [{
      title: { type: String, trim: true },
      category: { type: String, trim: true },
      department: { type: String, trim: true, uppercase: true },
      url: { type: String, trim: true },
      uploadedAt: { type: Date },
    }],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

messageSchema.index({
  conversation: 1,
  createdAt: 1,
});

module.exports = mongoose.model(
  'Message',
  messageSchema
);
