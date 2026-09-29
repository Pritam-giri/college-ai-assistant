// routes/admin.routes.js
//
// Admin-only endpoints for dashboard stats and student management.
// Every route here requires protect + authorize('admin').

const express = require('express');
const controller = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(protect, authorize('admin'));

// Dashboard
router.get('/dashboard', controller.dashboard);

// Student management
router.get('/students', controller.listStudents);
router.get('/students/:id', controller.getStudent);
router.patch('/students/:id/status', controller.updateStudentStatus);

module.exports = router;
