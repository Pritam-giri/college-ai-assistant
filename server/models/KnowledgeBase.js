// models/KnowledgeBase.js
const mongoose = require('mongoose');
const departmentPlugin = require('../plugins/departmentPlugin');

const knowledgeBaseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    keywords: [String], // used for lightweight retrieval matching
  },
  { timestamps: true, versionKey: false }
);

knowledgeBaseSchema.plugin(departmentPlugin);
knowledgeBaseSchema.index({ title: 'text', content: 'text', keywords: 'text' });

module.exports = mongoose.model('KnowledgeBase', knowledgeBaseSchema);
