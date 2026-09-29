// utils/text.js
//
// Whole-word text matching helpers.
//
// WHY THIS EXISTS: the first version of the department detector used
// text.includes('ece'), which wrongly matched inside "r-ece-nt" and
// "n-ece-ssary", and text.includes('hod') matched "met-hod". Everything
// that needs to find a word/phrase in a student message should use
// these helpers so matches only happen on WHOLE words.

// Lowercase, turn "&" into "and", and replace every run of non
// letters/numbers with a single space. \p{L}/\p{M}/\p{N} keep non-English
// scripts (e.g. Hindi) intact instead of stripping them.
function normalizeText(input) {
  if (typeof input !== 'string') return '';
  return input
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim();
}

// Returns the position of `phrase` inside `text` as a whole-word /
// whole-phrase match, or -1. The padding spaces are what enforce the
// word boundaries: " cs " matches "cs ka timetable" but not "physics".
function indexOfPhrase(text, phrase) {
  const needle = normalizeText(phrase);
  if (!needle) return -1;
  return ` ${normalizeText(text)} `.indexOf(` ${needle} `);
}

function containsPhrase(text, phrase) {
  return indexOfPhrase(text, phrase) !== -1;
}

// Escape user input before putting it inside new RegExp(...).
function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { normalizeText, indexOfPhrase, containsPhrase, escapeRegex };
