const express = require('express');
const router = express.Router();
const {
  uploadAndProcess,
  getPayrollRecords,
  getPayrollRecord,
  deletePayrollRecord,
  getDashboardStats,
} = require('../controllers/payroll.controller');
const { protect, checkSubscriptionLimit } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

router.use(protect);

router.get('/dashboard/stats', getDashboardStats);
router.post('/upload', checkSubscriptionLimit(), upload.single('payrollFile'), uploadAndProcess);
router.get('/', getPayrollRecords);
router.get('/:id', getPayrollRecord);
router.delete('/:id', deletePayrollRecord);

module.exports = router;
