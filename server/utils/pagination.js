// utils/pagination.js
//
// Turns ?page=2&limit=20 into safe numbers plus a Mongo skip value.

function getPagination(query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

module.exports = { getPagination };
