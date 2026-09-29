const express = require('express');
const router = express.Router();
const {
  getAllCompanies,
  getCompanyById,
  getAllUsers,
  updateUser,
  deleteUser,
  updateCompanySubscription,
  getAllPayments,
  updatePayment,
  getStats,
  getAllPayroll,
  getPayrollById,
  deletePayroll,
} = require('../controllers/admin.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

// All admin routes require a valid JWT + role === 'admin'
router.use(protect);
router.use(adminOnly);

// Dashboard
router.get('/stats', getStats);

// User management
router.get('/users', getAllUsers);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Account / company management
router.get('/companies', getAllCompanies);
router.get('/companies/:id', getCompanyById);
router.patch('/companies/:id/subscription', updateCompanySubscription);

// Payment management
router.get('/payments', getAllPayments);
router.patch('/payments/:id', updatePayment);

// Payroll management (all companies)
router.get('/payroll', getAllPayroll);
router.get('/payroll/:id', getPayrollById);
router.delete('/payroll/:id', deletePayroll);

module.exports = router;
