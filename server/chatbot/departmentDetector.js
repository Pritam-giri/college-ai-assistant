// chatbot/departmentDetector.js
//
// Figures out which department a student's message is about, so the
// chatbot can scope its search correctly. Returns a department CODE
// (matching Department.code in the DB) or null if the query seems
// college-wide / department-agnostic.
//
// IMPORTANT: this does NOT hard-code "only CSE or Electronics can ever
// exist". Everything it knows comes from the active Department documents
// in the database: their aliases, their names, and (for codes of 3+
// letters) their codes.
//
// STEP 2 FIXES (all confirmed by running the original code):
//  - Matching is now on WHOLE WORDS. Before, "ece" matched inside
//    "recent"/"necessary" and wrongly returned ELECTRONICS.
//  - "cs" is now a proper alias for CSE (it lives in the DB seed data).
//  - Very short codes (e.g. a future "ME") are no longer matched
//    automatically — they would fire on "show me" / "time". Give such a
//    department explicit aliases instead ("mechanical", "mech").
//  - Messages naming two departments are handled by detectDepartments().
//  - Aliases moved from a code constant into Department.aliases.

const departmentService = require('../services/departmentService');
const { indexOfPhrase } = require('../utils/text');

// Phrases that signal "college-wide", used to short-circuit detection
// even if a department word also appears (e.g. "college ka notice").
const COLLEGE_WIDE_HINTS = [
  'college ka',
  'college wide',
  'whole college',
  'general notice',
  'all department',
  'all departments',
];

// A department code is auto-matched only if it has at least this many letters.
const MIN_CODE_LENGTH_FOR_AUTO_MATCH = 3;

// Every phrase that should point at this department.
function phrasesFor(department) {
  const phrases = new Set(department.aliases || []);
  phrases.add(department.name);
  if (department.code.length >= MIN_CODE_LENGTH_FOR_AUTO_MATCH) phrases.add(department.code);
  return [...phrases];
}

/**
 * All departments mentioned in the message, in the order they appear.
 * Returns [] for a college-wide / department-agnostic message.
 * @param {string} message
 * @returns {Promise<string[]>} department codes
 */
async function detectDepartments(message) {
  if (typeof message !== 'string' || !message.trim()) return [];

  if (COLLEGE_WIDE_HINTS.some((hint) => indexOfPhrase(message, hint) !== -1)) {
    return [];
  }

  const departments = await departmentService.getActiveDepartments();
  const found = [];

  for (const dept of departments) {
    if (dept.isAll) continue;

    // earliest position at which any phrase for this department appears
    let firstPosition = -1;
    for (const phrase of phrasesFor(dept)) {
      const position = indexOfPhrase(message, phrase);
      if (position !== -1 && (firstPosition === -1 || position < firstPosition)) {
        firstPosition = position;
      }
    }
    if (firstPosition !== -1) found.push({ code: dept.code, position: firstPosition });
  }

  return found.sort((a, b) => a.position - b.position).map((f) => f.code);
}

/**
 * Backwards-compatible single-department version: the FIRST department
 * mentioned, or null. (When a message names several departments the chatbot
 * should use detectDepartments() instead.)
 * @param {string} message - the raw student query
 * @returns {Promise<string|null>} department code, or null for college-wide
 */
async function detectDepartment(message) {
  const codes = await detectDepartments(message);
  return codes[0] || null; // no department mentioned -> treat as college-wide search
}

module.exports = { detectDepartment, detectDepartments, COLLEGE_WIDE_HINTS };
