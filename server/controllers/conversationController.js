const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

const createConversation = asyncHandler(async (req, res) => {
  const { title, department } = req.body;

  const conversation = await Conversation.create({
    user: req.user._id,
    title: title?.trim() || "New Chat",
    department:
      department?.trim()?.toUpperCase() || "ALL",
  });

  res.status(201).json({
    success: true,
    data: conversation,
  });
});

const getConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    user: req.user._id,
  })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .select(
      "_id title department lastMessageAt createdAt updatedAt"
    );

  res.status(200).json({
    success: true,
    count: conversations.length,
    data: conversations,
  });
});

const getConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).select('_id title department lastMessageAt createdAt updatedAt');

  if (!conversation) {
    throw new ApiError(
      404,
      "Conversation not found."
    );
  }

  const messages = await Message.find({
    conversation: conversation._id,
  }).select('_id role content department createdAt').sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    data: {
      conversation,
      messages,
    },
  });
});

const updateConversation = asyncHandler(
  async (req, res) => {
    const { title } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim()
    ) {
      throw new ApiError(
        400,
        "Conversation title is required."
      );
    }

    if (title.trim().length > 100) {
      throw new ApiError(
        400,
        "Conversation title cannot exceed 100 characters."
      );
    }

    const conversation =
      await Conversation.findOneAndUpdate(
        {
          _id: req.params.id,
          user: req.user._id,
        },
        {
          $set: {
            title: title.trim(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!conversation) {
      throw new ApiError(
        404,
        "Conversation not found."
      );
    }

    res.status(200).json({
      success: true,
      data: conversation,
    });
  }
);

const deleteConversation = asyncHandler(
  async (req, res) => {
    const conversation =
      await Conversation.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

    if (!conversation) {
      throw new ApiError(
        404,
        "Conversation not found."
      );
    }

    await Message.deleteMany({
      conversation: conversation._id,
    });

    await conversation.deleteOne();

    res.status(200).json({
      success: true,
      message:
        "Conversation deleted successfully.",
    });
  }
);

module.exports = {
  createConversation,
  getConversations,
  getConversation,
  updateConversation,
  deleteConversation,
};
