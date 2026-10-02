// models/Faculty.js
const mongoose = require('mongoose');
const departmentPlugin = require('../plugins/departmentPlugin');

const facultySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    designation: { type: String, trim: true }, // e.g. "HOD", "Assistant Professor"
    qualification: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    isHOD: { type: Boolean, default: false },
    office: { type: String, trim: true }, // STEP 2: e.g. "Room 204, Main Block"
    photo: { type: String, trim: true }, // STEP 2: URL/path of the profile photo
  },
  { timestamps: true, versionKey: false }
);

facultySchema.plugin(departmentPlugin); // note: HOD lookups filter on isHOD + department

// STEP 2: at most ONE HOD per department. The index only applies to
// documents where isHOD is true, so any number of normal faculty are fine.
facultySchema.index(
  { department: 1, isHOD: 1 },
  { unique: true, partialFilterExpression: { isHOD: true } }
);
// A faculty member's department should never be "ALL" in practice (every
// department has its own HOD), but that's a data-entry rule, not a schema
// one — leaving it open keeps this model reusable for college-wide roles too.

module.exports = mongoose.model('Faculty', facultySchema);
