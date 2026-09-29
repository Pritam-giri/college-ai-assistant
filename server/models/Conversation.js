const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    title: {
      type: String,
      trim: true,
      default: 'New Chat',
    },

    department: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'ALL',
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

conversationSchema.index({
  user: 1,
  lastMessageAt: -1,
});

module.exports = mongoose.model(
  'Conversation',
  conversationSchema
);
