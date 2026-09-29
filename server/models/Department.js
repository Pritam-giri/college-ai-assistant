// models/Department.js
//
// Departments are DATA, not hard-coded logic. Adding a new department
// (e.g. "Mechanical") later is just an insert into this collection —
// no schema or code changes required anywhere else in the app.

const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    // Short unique code used everywhere else in the system as the
    // foreign-key-like reference, e.g. "CSE", "ELECTRONICS".
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    // Human-readable name for UI display.
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Marks the single special "applies to every department" value.
    // Exactly one document should have isAll: true (seeded as "ALL").
    isAll: {
      type: Boolean,
      default: false,
    },
    // Soft-disable a department instead of deleting it, so historical
    // records referencing it don't break.
    active: {
      type: Boolean,
      default: true,
    },
    // STEP 2: other names students use for this department ("cs", "ece",
    // Hinglish, ...). The chatbot's department detector reads these, so
    // adding a department needs NO code change at all.
    aliases: {
      type: [{ type: String, lowercase: true, trim: true }],
      default: [],
    },
  },
  { timestamps: true, versionKey: false }
);

// STEP 2: guarantee there is never more than one "ALL" department.
departmentSchema.index({ isAll: 1 }, { unique: true, partialFilterExpression: { isAll: true } });

module.exports = mongoose.model('Department', departmentSchema);
