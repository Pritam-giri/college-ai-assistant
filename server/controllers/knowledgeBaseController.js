// controllers/knowledgeBaseController.js

const KnowledgeBase = require('../models/KnowledgeBase');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const KNOWLEDGE_FIELDS = [
  'title',
  'content',
  'keywords',
  'department',
];

function pickKnowledgeFields(payload) {
  const data = {};

  for (const field of KNOWLEDGE_FIELDS) {
    if (payload[field] !== undefined) {
      data[field] = payload[field];
    }
  }

  return data;
}

// GET /api/knowledge
const list = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.department) {
    filter.department = req.query.department.toUpperCase();
  }

  if (req.query.search) {
    filter.$text = {
      $search: req.query.search,
    };
  }

  const knowledge = await KnowledgeBase.find(filter)
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: knowledge.length,
    data: knowledge,
  });
});

// GET /api/knowledge/:id
const getOne = asyncHandler(async (req, res) => {
  const knowledge = await KnowledgeBase.findById(req.params.id);

  if (!knowledge) {
    throw new ApiError(404, 'Knowledge entry not found');
  }

  res.json({
    success: true,
    data: knowledge,
  });
});

// POST /api/knowledge
const create = asyncHandler(async (req, res) => {
  const knowledge = await KnowledgeBase.create(
    pickKnowledgeFields(req.body)
  );

  res.status(201).json({
    success: true,
    data: knowledge,
  });
});

// PUT /api/knowledge/:id
const update = asyncHandler(async (req, res) => {
  const knowledge = await KnowledgeBase.findById(req.params.id);

  if (!knowledge) {
    throw new ApiError(404, 'Knowledge entry not found');
  }

  knowledge.set(pickKnowledgeFields(req.body));
  await knowledge.save();

  res.json({
    success: true,
    data: knowledge,
  });
});

// DELETE /api/knowledge/:id
const remove = asyncHandler(async (req, res) => {
  const knowledge = await KnowledgeBase.findById(req.params.id);

  if (!knowledge) {
    throw new ApiError(404, 'Knowledge entry not found');
  }

  await knowledge.deleteOne();

  res.json({
    success: true,
    message: 'Knowledge entry deleted',
  });
});

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
};