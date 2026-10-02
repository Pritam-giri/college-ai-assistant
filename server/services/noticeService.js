// services/noticeService.js
//
// Who sees which notices — kept out of the controller so the rules are
// easy to read and to test.
//
//  PUBLIC:  active notices, narrowed to a department when requested.
//  STUDENT: department notices + college-wide (ALL) notices, and only
//           notices that have not expired.
//  ADMIN:   everything by default (expired ones included, so they can be
//           edited/deleted); can narrow by department / status / category.

const departmentService = require('./departmentService');
const { escapeRegex } = require('../utils/text');

// Query-string values can be arrays or objects (?a[b]=c). Only accept strings.
const str = (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

// "Not expired" = no expiry date at all, OR an expiry date in the future.
function activeFilter(now = new Date()) {
  return {
    $and: [
      { $or: [{ publishedAt: null }, { publishedAt: { $lte: now } }] },
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
    ],
  };
}

/**
 * @param {object} user   req.user (needs .role and .department)
 * @param {object} query  req.query (department, category, search, status)
 * @returns a MongoDB filter
 */
function buildNoticeFilter(user, query = {}, now = new Date()) {
  const isAdmin = user && user.role === 'admin';
  const isPublic = !user;
  const department = str(query.department);
  const category = str(query.category);
  const search = str(query.search);
  const status = str(query.status);

  const and = [];

  // 1) department scope
  if (isAdmin) {
    if (department) and.push(departmentService.buildExactFilter(department));
  } else if (isPublic) {
    // Public pages can be crawled without exposing expired notices. The
    // department filter includes college-wide notices relevant to that department.
    if (department) and.push(departmentService.buildVisibilityFilter(department));
  } else {
    // A student may pick a department in the UI; default to their own.
    and.push(departmentService.buildVisibilityFilter(department || user.department));
    const semesters = [null, 'ALL'];
    if (user.semester) semesters.push(String(user.semester), Number(user.semester));
    and.push({ semester: { $in: semesters } });
  }

  // 2) category
  if (category) and.push({ category: category.toLowerCase() });

  // 3) text search (escaped so user input can't act as a regex)
  if (search) {
    const rx = new RegExp(escapeRegex(search.slice(0, 100)), 'i');
    and.push({ $or: [{ title: rx }, { body: rx }] });
  }

  // 4) active / expired. Students ALWAYS get active only.
  const effectiveStatus = isAdmin ? status || 'all' : 'active';
  if (effectiveStatus === 'active') and.push(activeFilter(now));
  else if (effectiveStatus === 'expired') and.push({ expiresAt: { $lte: now } });

  return and.length ? { $and: and } : {};
}

module.exports = { buildNoticeFilter, activeFilter };
