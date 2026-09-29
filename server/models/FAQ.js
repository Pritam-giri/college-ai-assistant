// models/FAQ.js
const mongoose = require('mongoose');
const departmentPlugin = require('../plugins/departmentPlugin');

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true },
    tags: [String],
  },
  { timestamps: true, versionKey: false }
);

faqSchema.plugin(departmentPlugin);
faqSchema.index({ question: 'text', tags: 'text' });

module.exports = mongoose.model('FAQ', faqSchema);
