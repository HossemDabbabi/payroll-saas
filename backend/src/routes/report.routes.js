const express = require('express');
const router = express.Router();
const { downloadExcel, downloadPayslipPDF } = require('../controllers/report.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/:payrollId/excel', downloadExcel);
router.get('/:payrollId/payslip/:matricule', downloadPayslipPDF);

module.exports = router;
