const mongoose = require('mongoose');
const departmentPlugin = require('../plugins/departmentPlugin');

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    subjectCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    totalMarks: {
      type: Number,
      default: 100,
      min: 0,
    },
    attachmentUrl: {
      type: String,
      trim: true,
      default: '',
    },
    attachment: {
      url: { type: String, trim: true },
      publicId: { type: String, trim: true },
      resourceType: { type: String, trim: true, default: 'raw' },
      mimeType: { type: String, trim: true },
      originalName: { type: String, trim: true },
      size: { type: Number },
    },
    image: {
      url: { type: String, trim: true },
      publicId: { type: String, trim: true },
      resourceType: { type: String, trim: true },
      mimeType: { type: String, trim: true },
      fileName: { type: String, trim: true },
      size: { type: Number },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'published',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

assignmentSchema.plugin(departmentPlugin);

assignmentSchema.index({ department: 1, semester: 1, status: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
