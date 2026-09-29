const test = require('node:test');
const assert = require('node:assert/strict');
const Practical = require('../models/Practical');
const Assignment = require('../models/Assignment');

test('practical and assignment departments use the extensible department plugin', () => {
  for (const Model of [Practical, Assignment]) {
    const department = Model.schema.path('department');
    assert.equal(department.isRequired, true);
    assert.equal(department.options.enum, undefined);
    assert.ok(department.validators.some((validator) => validator.type === 'user defined'));
  }
});
