// routes/department.routes.js
//
// GET  /api/departments        -> public: active departments (dropdowns, signup form)
// GET  /api/departments/all    -> admin:  including inactive ones
// POST /api/departments        -> admin:  add a new department (future scalability:
//                                 this is how you go from 2 departments to 3+
//                                 with zero code changes)
// PUT  /api/departments/:id    -> admin:  rename / edit aliases / (de)activate
//
// Routes stay THIN: they only list which middleware runs, in order.
// The real work happens in controllers/departmentController.js.

const express = require('express');
const controller = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const rules = require('../middleware/validators/department.validators');

const router = express.Router();

router.get('/', controller.list);
router.get('/all', protect, authorize('admin'), controller.listAll); // must be above '/:id' routes

router.post('/', protect, authorize('admin'), rules.createDepartment, validate, controller.create);
router.put('/:id', protect, authorize('admin'), rules.updateDepartment, validate, controller.update);

module.exports = router;
