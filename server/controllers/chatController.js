// controllers/chatController.js

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const { handleMessage } = require('../chatbot/chatbotService');

const chat = asyncHandler(async (req, res) => {
  const { message, conversationId } = req.body;

  if (
    !message ||
    typeof message !== 'string' ||
    !message.trim()
  ) {
    throw new ApiError(400, 'Message is required.');
  }
  if (message.length > 4000) {
    throw new ApiError(400, 'Message cannot exceed 4000 characters.');
  }
  if (conversationId !== undefined && (typeof conversationId !== 'string' || !/^[a-f\d]{24}$/i.test(conversationId))) {
    throw new ApiError(400, 'conversationId must be a valid identifier.');
  }

  // ------------------------------------------------------------
  // Get logged-in student's profile
  // ------------------------------------------------------------

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, 'User profile not found.');
  }

  // ------------------------------------------------------------
  // Find existing conversation
  // ------------------------------------------------------------

  let conversation;

  if (conversationId) {
    conversation = await Conversation.findOne({
      _id: conversationId,
      user: req.user._id,
    });

    if (!conversation) {
      throw new ApiError(404, 'Conversation not found.');
    }
  }

  // ------------------------------------------------------------
  // Create conversation automatically if needed
  // ------------------------------------------------------------

  if (!conversation) {
    conversation = await Conversation.create({
      user: req.user._id,
      title: message.trim().slice(0, 60),
      department: user.department || 'ALL',
    });
  }

  // ------------------------------------------------------------
  // Save user message
  // ------------------------------------------------------------

  await Message.create({
    conversation: conversation._id,
    role: 'user',
    content: message.trim(),
    department: user.department || 'ALL',
  });

  // ------------------------------------------------------------
  // Student context
  // ------------------------------------------------------------

  const studentContext = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    rollNumber: user.rollNumber || null,
    department: user.department || null,
    semester: user.semester || null,
  };

  // ------------------------------------------------------------
  // Fetch recent conversation history (last 6 messages) for context
  // ------------------------------------------------------------

  const recentHistory = await Message.find({
    conversation: conversation._id,
  })
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();

  const conversationHistory = recentHistory.reverse();

  // ------------------------------------------------------------
  // Generate chatbot response
  // ------------------------------------------------------------

  let result;
  try {
    result = await handleMessage(
      message.trim(),
      studentContext,
      conversationHistory
    );
  } catch (error) {
    if (!error?.isGeminiError && !error?.isAIProviderError) throw error;

    if (error.isTemporaryGeminiError) {
      result = {
        reply: 'AI service is temporarily busy. Please try again in a moment.',
        department: user.department || 'ALL',
      };
    } else {
      const isProduction = process.env.NODE_ENV === 'production';
      const providerName = error.isAIProviderError ? 'xAI/Grok' : 'AI provider';
      const apiError = new ApiError(
        502,
        isProduction
          ? 'The AI service is temporarily unavailable. Please try again shortly.'
          : `${providerName} request failed: ${error.message || 'Unknown provider error.'}`
      );
      apiError.isAIProviderError = true;
      throw apiError;
    }
  }

  // ------------------------------------------------------------
  // Save assistant message
  // ------------------------------------------------------------

  const assistantMessage = await Message.create({
    conversation: conversation._id,
    role: 'assistant',
    content: result.reply,
    sources: result.sources || [],
    department:
      result.department ||
      user.department ||
      'ALL',
  });

  // ------------------------------------------------------------
  // Update conversation
  // ------------------------------------------------------------

  conversation.lastMessageAt = new Date();

  if (
    !conversation.title ||
    conversation.title === 'New Chat'
  ) {
    conversation.title = message.trim().slice(0, 60);
  }

  if (
    result.department &&
    result.department !== 'ALL'
  ) {
    conversation.department = result.department;
  }

  await conversation.save();

  // ------------------------------------------------------------
  // Response
  // ------------------------------------------------------------

  res.status(200).json({
    success: true,
    data: {
      reply: result.reply,
      answer: result.reply,
      department:
        result.department ||
        user.department ||
        'ALL',
      conversationId: conversation._id,
      message: {
        _id: assistantMessage._id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        department: assistantMessage.department,
        createdAt: assistantMessage.createdAt,
        sources: assistantMessage.sources,
      },
      sources: assistantMessage.sources,
    },
  });
});

module.exports = {
  chat,
};
