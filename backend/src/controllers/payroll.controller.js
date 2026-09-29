const fs = require('fs');
const path = require('path');
const PayrollRecord = require('../models/PayrollRecord');
const { parseAndCalculatePayroll } = require('../services/payroll.service');
const { enforceEmployeeLimit } = require('../middleware/auth.middleware');

// POST /api/payroll/upload
const uploadAndProcess = async (req, res, next) => {
  let filePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    filePath = req.file.path;
    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Payroll month and year are required.' });
    }
    const parsedMonth = parseInt(month);
    const parsedYear = parseInt(year);
    if (parsedMonth < 1 || parsedMonth > 12 || parsedYear < 2000 || parsedYear > 2100) {
      return res.status(400).json({ success: false, message: 'Invalid month or year.' });
    }

    // Parse the file and calculate payroll
    const { employees, summary, parseErrors } = parseAndCalculatePayroll(filePath);

    // Enforce subscription employee limit
    const limitCheck = enforceEmployeeLimit(req, res, employees.length);
    if (!limitCheck.allowed) {
      return res.status(403).json({ success: false, ...limitCheck });
    }

    // Check for duplicate record (same company, month, year)
    const existing = await PayrollRecord.findOne({
      company: req.user._id,
      'period.month': parsedMonth,
      'period.year': parsedYear,
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A payroll record for ${parsedMonth}/${parsedYear} already exists. Delete it first or use a different period.`,
        existingId: existing._id,
      });
    }

    // Save to database
    const record = await PayrollRecord.create({
      company: req.user._id,
      period: { month: parsedMonth, year: parsedYear },
      fileName: req.file.filename,
      originalFileName: req.file.originalname,
      employees,
      summary,
      status: 'completed',
      processingErrors: parseErrors.map((e) => `Row ${e.row}: ${e.errors.join('; ')}`),
    });

    res.status(201).json({
      success: true,
      message: `Payroll processed successfully for ${parsedMonth}/${parsedYear}.`,
      data: {
        id: record._id,
        period: record.period,
        summary: record.summary,
        parseErrors,
        totalRowsWithWarnings: parseErrors.length,
      },
    });
  } catch (error) {
    // Clean up the uploaded file on error
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    if (error.message.includes('Missing required columns') || error.message.includes('empty')) {
      return res.status(422).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// GET /api/payroll
const getPayrollRecords = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, year } = req.query;
    const query = { company: req.user._id };
    if (year) query['period.year'] = parseInt(year);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      PayrollRecord.find(query)
        .select('-employees -processingErrors')
        .sort({ 'period.year': -1, 'period.month': -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PayrollRecord.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: records,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/payroll/:id
const getPayrollRecord = async (req, res, next) => {
  try {
    const record = await PayrollRecord.findOne({ _id: req.params.id, company: req.user._id });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Payroll record not found.' });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/payroll/:id
const deletePayrollRecord = async (req, res, next) => {
  try {
    const record = await PayrollRecord.findOneAndDelete({ _id: req.params.id, company: req.user._id });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Payroll record not found.' });
    }
    // Clean up uploaded file
    const filePath = path.join(__dirname, '../../uploads', record.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true, message: 'Payroll record deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// GET /api/payroll/dashboard/stats
const getDashboardStats = async (req, res, next) => {
  try {
    const currentYear = new Date().getFullYear();
    const records = await PayrollRecord.find({
      company: req.user._id,
      'period.year': currentYear,
      status: 'completed',
    }).select('period summary').sort({ 'period.month': 1 });

    const monthlyData = records.map((r) => ({
      month: r.period.month,
      year: r.period.year,
      totalNetPayout: r.summary.totalNetPayout,
      totalEmployees: r.summary.totalEmployees,
      totalLateDeductions: r.summary.totalLateDeductions,
      totalAbsenceDeductions: r.summary.totalAbsenceDeductions,
      totalOvertimeBonus: r.summary.totalOvertimeBonus,
    }));

    const aggregated = records.reduce((acc, r) => {
      acc.totalPayout += r.summary.totalNetPayout;
      acc.totalDeductions += r.summary.totalLateDeductions + r.summary.totalAbsenceDeductions;
      acc.totalOvertimeBonus += r.summary.totalOvertimeBonus;
      return acc;
    }, { totalPayout: 0, totalDeductions: 0, totalOvertimeBonus: 0 });

    res.json({
      success: true,
      data: {
        year: currentYear,
        monthlyData,
        totals: {
          totalPayout: parseFloat(aggregated.totalPayout.toFixed(2)),
          totalDeductions: parseFloat(aggregated.totalDeductions.toFixed(2)),
          totalOvertimeBonus: parseFloat(aggregated.totalOvertimeBonus.toFixed(2)),
        },
        subscription: req.user.subscription,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadAndProcess, getPayrollRecords, getPayrollRecord, deletePayrollRecord, getDashboardStats };
