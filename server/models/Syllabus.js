// models/Syllabus.js
const mongoose = require('mongoose');
const departmentPlugin = require('../plugins/departmentPlugin');

const syllabusSchema = new mongoose.Schema(
  {
    semester: { type: Number, required: true, min: 1, max: 6 },
    subjectCode: { type: String, trim: true },
    subjectName: { type: String, required: true, trim: true },
    fileUrl: { type: String }, // link to uploaded syllabus PDF, if any
    image: {
      url: { type: String, trim: true },
      publicId: { type: String, trim: true },
      resourceType: { type: String, trim: true },
      mimeType: { type: String, trim: true },
      fileName: { type: String, trim: true },
      size: { type: Number },
    },
    topics: [String],
  },
  { timestamps: true, versionKey: false }
);

syllabusSchema.plugin(departmentPlugin);
syllabusSchema.index({ department: 1, semester: 1 });

module.exports = mongoose.model('Syllabus', syllabusSchema);
