// services/departmentService.js
//
// Single place that knows how to work with departments. Nothing else
// in the app should special-case "CSE" or "Electronics" by name —
// everything goes through here so a 3rd, 4th, 5th department just works.

const Department = require('../models/Department');
const { normalizeText } = require('../utils/text');

const ALL_CODE = 'ALL';

// Small in-memory cache so every notice/faculty/timetable lookup doesn't
// re-hit the DB. Cleared on writes to Department (see invalidateCache).
let cache = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 60 * 1000;

async function loadActiveDepartments() {
  const now = Date.now();
  if (cache && now - cacheLoadedAt < CACHE_TTL_MS) return cache;

  const docs = await Department.find({ active: true }).lean();
  cache = docs;
  cacheLoadedAt = now;
  return cache;
}

function invalidateCache() {
  cache = null;
}

async function getActiveDepartments() {
  return loadActiveDepartments();
}

// STEP 2: admin screens also need INACTIVE departments (to re-activate them).
async function getAllDepartments() {
  return Department.find({}).sort({ isAll: 1, code: 1 }).lean();
}

async function isValidDepartment(code) {
  if (typeof code !== 'string' || !code.trim()) return false; // STEP 2: non-strings are simply invalid
  const departments = await loadActiveDepartments();
  return departments.some((d) => d.code === code.trim().toUpperCase());
}

/**
 * Builds the mongo filter for "content visible to this department".
 * A student in CSE should see CSE-tagged content AND college-wide
 * (ALL) content. Pass null/undefined for a college-wide-only search.
 */
function buildVisibilityFilter(departmentCode) {
  if (!departmentCode) {
    return { department: ALL_CODE };
  }
  return { department: { $in: [String(departmentCode).toUpperCase(), ALL_CODE] } };
}

/**
 * STEP 2: filter for ADMIN listings. Unlike buildVisibilityFilter this does
 * NOT add ALL: no code -> everything, "CSE" -> only CSE-tagged records.
 */
function buildExactFilter(departmentCode) {
  if (!departmentCode) return {};
  return { department: String(departmentCode).toUpperCase() };
}

// ---- alias helpers (aliases now live on the Department document) ----

// Words that would cause false matches if used as a department alias
// (an alias "me" would fire on "show me the notices").
const AMBIGUOUS_ALIASES = new Set([
  'a', 'an', 'the', 'is', 'it', 'in', 'to', 'of', 'me', 'my', 'we', 'us', 'or', 'and',
  'all', 'ka', 'ki', 'ke', 'hai', 'hain', 'kya', 'kab', 'yes', 'no',
]);

// Returns the aliases that are too short / too common to be safe. Used by
// request validation so the admin gets a clear error instead of silent
// false matches later.
function findInvalidAliases(aliases) {
  if (!Array.isArray(aliases)) return [];
  return aliases
    .map((a) => normalizeText(String(a)))
    .filter((n) => n.length < 2 || AMBIGUOUS_ALIASES.has(n));
}

// Normalizes and removes empty / duplicate / unsafe aliases.
function cleanAliases(aliases) {
  if (!Array.isArray(aliases)) return [];
  const bad = new Set(findInvalidAliases(aliases));
  const out = [];
  for (const a of aliases) {
    const n = normalizeText(String(a));
    if (n && !bad.has(n) && !out.includes(n)) out.push(n);
  }
  return out;
}

module.exports = {
  ALL_CODE,
  getActiveDepartments,
  getAllDepartments,
  isValidDepartment,
  buildVisibilityFilter,
  buildExactFilter,
  findInvalidAliases,
  cleanAliases,
  invalidateCache,
};
