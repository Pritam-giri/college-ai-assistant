// controllers/faqController.js

const FAQ = require('../models/FAQ');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const FAQ_FIELDS = [
  'question',
  'answer',
  'tags',
  'department',
];

function pickFAQFields(payload) {
  const data = {};

  for (const field of FAQ_FIELDS) {
    if (payload[field] !== undefined) {
      data[field] = payload[field];
    }
  }

  return data;
}

// GET /api/faqs
const list = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.department) {
    filter.department = req.query.department.toUpperCase();
  }

  if (req.query.tag) {
    filter.tags = req.query.tag;
  }

  if (req.query.search) {
    filter.$text = {
      $search: req.query.search,
    };
  }

  const faqs = await FAQ.find(filter)
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: faqs.length,
    data: faqs,
  });
});

// GET /api/faqs/:id
const getOne = asyncHandler(async (req, res) => {
  const faq = await FAQ.findById(req.params.id);

  if (!faq) {
    throw new ApiError(404, 'FAQ not found');
  }

  res.json({
    success: true,
    data: faq,
  });
});

// POST /api/faqs
const create = asyncHandler(async (req, res) => {
  const faq = await FAQ.create(
    pickFAQFields(req.body)
  );

  res.status(201).json({
    success: true,
    data: faq,
  });
});

// PUT /api/faqs/:id
const update = asyncHandler(async (req, res) => {
  const faq = await FAQ.findById(req.params.id);

  if (!faq) {
    throw new ApiError(404, 'FAQ not found');
  }

  faq.set(pickFAQFields(req.body));
  await faq.save();

  res.json({
    success: true,
    data: faq,
  });
});

// DELETE /api/faqs/:id
const remove = asyncHandler(async (req, res) => {
  const faq = await FAQ.findById(req.params.id);

  if (!faq) {
    throw new ApiError(404, 'FAQ not found');
  }

  await faq.deleteOne();

  res.json({
    success: true,
    message: 'FAQ deleted',
  });
});

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
};