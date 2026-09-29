// plugins/departmentPlugin.js
//
// Attach to ANY mongoose schema that needs department scoping
// (Notice, Faculty, Timetable, Syllabus, Document, FAQ, KnowledgeBase, ...).
//
// Usage:
//   const departmentPlugin = require('../plugins/departmentPlugin');
//   noticeSchema.plugin(departmentPlugin);                     // department required
//   userSchema.plugin(departmentPlugin, { required: false });  // department optional
//
// This keeps the department field, its validation, and its query
// helpers defined in ONE place instead of copy-pasted into every model.

const departmentService = require('../services/departmentService');

function departmentPlugin(schema, options = {}) {
  // STEP 2: `required` option (default true = original behaviour) so the
  // User model can have an optional department (admins may not belong to one).
  const { required = true } = options;

  schema.add({
    department: {
      type: String,
      required,
      uppercase: true,
      trim: true,
    },
  });

  // Validate against the live Department collection, not a hard-coded
  // enum, so new departments work immediately without a code change.
  schema.path('department').validate(async function (value) {
    if (!value) return !required; // empty is only acceptable when optional
    return departmentService.isValidDepartment(value);
  }, (props) => `"${props.value}" is not a recognized department code`);

  // STEP 2 (bug fix): validators normally run on save()/create() only.
  // Without this, an edit done through findOneAndUpdate/updateOne could
  // store an invalid department. This forces validation on those too.
  schema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function () {
    this.setOptions({ runValidators: true });
  });

  schema.index({ department: 1 });
}

module.exports = departmentPlugin;
