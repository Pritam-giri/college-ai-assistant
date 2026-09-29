// seed/departmentData.js
//
// The initial departments, kept in a plain data file so both the seed
// script and the tests can use them.
//
// ALIASES are the ways students actually type a department (English and
// Hinglish). They used to be hard-coded inside departmentDetector.js;
// now they live in the database on each Department document, so adding a
// department later never needs a code change.

const INITIAL_DEPARTMENTS = [
  {
    code: 'CSE',
    name: 'Computer Science & Engineering',
    isAll: false,
    aliases: [
      'cse',
      'cs',
      'computer science',
      'computer science and engineering',
      'cs branch',
      'cs dept',
      'cs department',
    ],
  },
  {
    code: 'ELECTRONICS',
    name: 'Electronics',
    isAll: false,
    aliases: ['electronics', 'ece', 'electronic', 'electronics dept', 'electronics department'],
  },
  { code: 'ALL', name: 'All Departments', isAll: true, aliases: [] },
];

module.exports = { INITIAL_DEPARTMENTS };
