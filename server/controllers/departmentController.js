// controllers/departmentController.js
//
// Response shape used across the whole API:
//   success -> { success: true, data: ..., (count / pagination info) }
//   failure -> { success: false, message: '...', errors?: [...] }  (see errorHandler)

const Department = require('../models/Department');
const departmentService = require('../services/departmentService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/departments  (public)
// Active departments only — powers every "Department: [ ]" dropdown.
const list = asyncHandler(async (req, res) => {
  const departments = await departmentService.getActiveDepartments();
  res.json({ success: true, count: departments.length, data: departments });
});

// GET /api/departments/all  (admin)
// Includes inactive departments so an admin can re-activate them.
const listAll = asyncHandler(async (req, res) => {
  const departments = await departmentService.getAllDepartments();
  res.json({ success: true, count: departments.length, data: departments });
});

// POST /api/departments  (admin)
// This is how you go from 2 departments to 3+ with zero code changes:
//   { "code": "MECHANICAL", "name": "Mechanical Engineering", "aliases": ["mech"] }
const create = asyncHandler(async (req, res) => {
  const { code, name, aliases } = req.body;

  // Only these fields are accepted. `isAll` can never be set from the API,
  // so nobody can create a second "ALL" department.
  const department = await Department.create({
    code,
    name,
    aliases: departmentService.cleanAliases(aliases),
  });

  departmentService.invalidateCache();
  res.status(201).json({ success: true, data: department });
});

// PUT /api/departments/:id  (admin)
// Can change name, aliases and active. The code is permanent because every
// other record refers to the department by its code.
const update = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) throw new ApiError(404, 'Department not found');

  const { name, aliases, active } = req.body;

  if (department.isAll && active === false) {
    throw new ApiError(400, 'The "ALL" department cannot be deactivated');
  }

  if (name !== undefined) department.name = name;
  if (aliases !== undefined) department.aliases = departmentService.cleanAliases(aliases);
  if (active !== undefined) department.active = active;

  await department.save();
  departmentService.invalidateCache();
  res.json({ success: true, data: department });
});

module.exports = { list, listAll, create, update };
