const User = require('../models/User');
const SubscriptionHistory = require('../models/Subscription');
const PayrollRecord = require('../models/PayrollRecord');
const mongoose = require('mongoose');
const { SUBSCRIPTION_TIERS } = require('../config/subscription.config');

const ROLES = ['admin', 'hr_manager'];
const SUB_STATUSES = ['active', 'inactive', 'expired'];
const PLANS = ['starter', 'business', 'pro', 'enterprise'];
const PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'];

/** Shape a raw User document into the admin-facing company/account payload. */
const shapeCompany = (c) => {
  const sub = c.subscription || {};
  const now = new Date();
  const trialEndsAt = sub.trialEndsAt ? new Date(sub.trialEndsAt) : null;
  const expiresAt = sub.expiresAt ? new Date(sub.expiresAt) : null;

  let trialDaysRemaining = null;
  if (sub.isTrial && trialEndsAt) {
    trialDaysRemaining = Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)));
  }

  return {
    _id: c._id,
    companyName: c.companyName,
    email: c.email, // unique identifier
    role: c.role,
    isActive: c.isActive,
    createdAt: c.createdAt,
    lastLogin: c.lastLogin,
    subscription: {
      plan: sub.plan || 'starter',
      status: sub.status || 'trial',
      employeeLimit: sub.employeeLimit ?? 20,
      isTrial: sub.isTrial ?? true,
      trialEndsAt: trialEndsAt,
      trialDaysRemaining,
      expiresAt: expiresAt,
      lastPayment: sub.lastPayment || null,
    },
  };
};

/**
 * GET /api/admin/companies
 * Returns all registered companies with plan info.
 */
const getAllCompanies = async (req, res) => {
  try {
    const companies = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    const data = companies.map(shapeCompany);

    res.json({
      success: true,
      count: data.length,
      companies: data,
    });
  } catch (err) {
    console.error('[admin] getAllCompanies error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching companies.' });
  }
};

/**
 * GET /api/admin/companies/:id
 * Returns a single company's full profile.
 */
const getCompanyById = async (req, res) => {
  try {
    const company = await User.findById(req.params.id).select('-password').lean();
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    res.json({ success: true, company: shapeCompany(company) });
  } catch (err) {
    console.error('[admin] getCompanyById error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/**
 * GET /api/admin/users
 * Same collection as companies — used by the user-management screen.
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: users.length,
      users: users.map(shapeCompany),
    });
  } catch (err) {
    console.error('[admin] getAllUsers error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching users.' });
  }
};

/**
 * PATCH /api/admin/users/:id
 * Update account state: activate/deactivate, role, company name.
 * Enforces the single-admin invariant (see utils/adminGuard.js).
 */
const updateUser = async (req, res) => {
  try {
    const { isActive, role, companyName } = req.body;
    const targetId = req.params.id;
    const isSelf = String(req.user._id) === String(targetId);

    if (isSelf) {
      return res.status(400).json({
        success: false,
        message: 'You cannot modify your own account from the admin panel.',
      });
    }

    const user = await User.findById(targetId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updates = {};

    if (typeof isActive === 'boolean') updates.isActive = isActive;

    if (role !== undefined) {
      if (!ROLES.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role.' });
      }
      updates.role = role;
      // Promoting to admin demotes any other admin so only one exists.
      if (role === 'admin') {
        await User.updateMany(
          { _id: { $ne: user._id }, role: 'admin' },
          { $set: { role: 'hr_manager' } }
        );
      }
      // Never allow demoting the last remaining admin.
      if (role !== 'admin' && user.role === 'admin') {
        const otherAdmins = await User.countDocuments({ role: 'admin', _id: { $ne: user._id } });
        if (otherAdmins === 0) {
          return res.status(409).json({
            success: false,
            message: 'Cannot demote the only administrator. Promote another user first.',
          });
        }
      }
    }

    if (companyName !== undefined) {
      const name = String(companyName).trim();
      if (!name) {
        return res.status(400).json({ success: false, message: 'Company name cannot be empty.' });
      }
      if (name.length > 100) {
        return res.status(400).json({ success: false, message: 'Company name cannot exceed 100 characters.' });
      }
      updates.companyName = name;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update.' });
    }

    const updated = await User.findByIdAndUpdate(targetId, { $set: updates }, { new: true })
      .select('-password')
      .lean();

    res.json({
      success: true,
      message: 'User updated.',
      user: shapeCompany(updated),
    });
  } catch (err) {
    console.error('[admin] updateUser error:', err);
    res.status(500).json({ success: false, message: 'Server error updating user.' });
  }
};

/**
 * DELETE /api/admin/users/:id
 * Permanently removes a user together with their payroll + payment history.
 */
const deleteUser = async (req, res) => {
  try {
    const targetId = req.params.id;

    if (String(req.user._id) === String(targetId)) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const user = await User.findById(targetId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(409).json({ success: false, message: 'Administrator accounts cannot be deleted.' });
    }

    await Promise.all([
      PayrollRecord.deleteMany({ company: user._id }),
      SubscriptionHistory.deleteMany({ company: user._id }),
      User.deleteOne({ _id: user._id }),
    ]);

    res.json({
      success: true,
      message: `Account ${user.email} and all associated data were deleted.`,
    });
  } catch (err) {
    console.error('[admin] deleteUser error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting user.' });
  }
};

/**
 * PATCH /api/admin/companies/:id/subscription
 * Direct subscription override: plan, status, employee limit, expiry, trial.
 */
const updateCompanySubscription = async (req, res) => {
  try {
    const { plan, status, employeeLimit, expiresAt, isTrial, trialEndsAt, extendDays } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    if (plan !== undefined) {
      if (!PLANS.includes(plan)) {
        return res.status(400).json({ success: false, message: 'Invalid plan.' });
      }
      user.subscription.plan = plan;
      // Default the limit to the tier limit unless one was supplied explicitly.
      if (employeeLimit === undefined) {
        user.subscription.employeeLimit = SUBSCRIPTION_TIERS[plan].employeeLimit;
      }
    }

    if (status !== undefined) {
      if (!SUB_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid subscription status.' });
      }
      user.subscription.status = status;
    }

    if (employeeLimit !== undefined) {
      const limit = Number(employeeLimit);
      if (!Number.isFinite(limit) || limit < 1) {
        return res.status(400).json({ success: false, message: 'Employee limit must be a positive number.' });
      }
      user.subscription.employeeLimit = Math.floor(limit);
    }

    if (isTrial !== undefined) {
      user.subscription.isTrial = !!isTrial;
    }

    if (expiresAt !== undefined) {
      if (expiresAt === null || expiresAt === '') {
        user.subscription.expiresAt = null;
      } else {
        const parsed = new Date(expiresAt);
        if (isNaN(parsed.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid expiry date.' });
        }
        user.subscription.expiresAt = parsed;
      }
    }

    if (trialEndsAt !== undefined) {
      if (trialEndsAt === null || trialEndsAt === '') {
        user.subscription.trialEndsAt = null;
      } else {
        const parsed = new Date(trialEndsAt);
        if (isNaN(parsed.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid trial end date.' });
        }
        user.subscription.trialEndsAt = parsed;
      }
    }

    if (extendDays !== undefined) {
      const days = Number(extendDays);
      if (!Number.isFinite(days) || days < 1 || days > 365) {
        return res.status(400).json({ success: false, message: 'Extension must be between 1 and 365 days.' });
      }
      const base =
        (user.subscription.isTrial && user.subscription.trialEndsAt ? new Date(user.subscription.trialEndsAt) : null) ||
        (user.subscription.expiresAt ? new Date(user.subscription.expiresAt) : new Date()) ||
        new Date();
      const target = new Date(Math.max(base.getTime(), Date.now()) + days * 24 * 60 * 60 * 1000);
      if (user.subscription.isTrial) {
        user.subscription.trialEndsAt = target;
      } else {
        user.subscription.expiresAt = target;
        user.subscription.status = 'active';
      }
    }

    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Subscription updated.',
      company: shapeCompany(user.toObject()),
    });
  } catch (err) {
    console.error('[admin] updateCompanySubscription error:', err);
    res.status(500).json({ success: false, message: 'Server error updating subscription.' });
  }
};

/**
 * GET /api/admin/payments
 * Global payment history across every company.
 */
const getAllPayments = async (req, res) => {
  try {
    const { status, plan, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status && status !== 'all' && PAYMENT_STATUSES.includes(status)) filter.status = status;
    if (plan && plan !== 'all' && PLANS.includes(plan)) filter.toPlan = plan;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const [items, total] = await Promise.all([
      SubscriptionHistory.find(filter)
        .populate('company', 'companyName email subscription.plan')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      SubscriptionHistory.countDocuments(filter),
    ]);

    const [revenueAgg, statusCounts] = await Promise.all([
      SubscriptionHistory.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      SubscriptionHistory.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    res.json({
      success: true,
      payments: items,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.max(1, Math.ceil(total / limitNum)),
      },
      stats: {
        totalRevenue: revenueAgg[0]?.total || 0,
        completedCount: revenueAgg[0]?.count || 0,
        byStatus: statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      },
    });
  } catch (err) {
    console.error('[admin] getAllPayments error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching payments.' });
  }
};

/**
 * PATCH /api/admin/payments/:id
 * Update payment status / notes (refund, mark failed, etc.).
 */
const updatePayment = async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (status !== undefined && !PAYMENT_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid payment status.' });
    }

    const payment = await SubscriptionHistory.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found.' });
    }

    if (status !== undefined) payment.status = status;
    if (notes !== undefined) payment.notes = String(notes);

    await payment.save();

    const populated = await SubscriptionHistory.findById(payment._id)
      .populate('company', 'companyName email subscription.plan')
      .lean();

    res.json({ success: true, message: 'Payment updated.', payment: populated });
  } catch (err) {
    console.error('[admin] updatePayment error:', err);
    res.status(500).json({ success: false, message: 'Server error updating payment.' });
  }
};

/**
 * GET /api/admin/stats
 * Aggregates for the admin dashboard (accounts, plans, revenue, activity).
 */
const getStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLast30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOf6Months = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      totalAccounts,
      activeAccounts,
      disabledAccounts,
      trialAccounts,
      expiredAccounts,
      adminCount,
      payrollBatches,
      payrollAgg,
      planAgg,
      revenueAgg,
      monthRevenueAgg,
      monthlyRevenue,
      recentPayments,
      recentSignups,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ 'subscription.status': 'active', 'subscription.isTrial': false }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ 'subscription.isTrial': true }),
      User.countDocuments({ 'subscription.status': 'expired' }),
      User.countDocuments({ role: 'admin' }),
      PayrollRecord.countDocuments({}),
      PayrollRecord.aggregate([
        {
          $group: {
            _id: null,
            batches: { $sum: 1 },
            employees: { $sum: '$summary.totalEmployees' },
            netPayout: { $sum: '$summary.totalNetPayout' },
            lateDeductions: { $sum: '$summary.totalLateDeductions' },
            absenceDeductions: { $sum: '$summary.totalAbsenceDeductions' },
            overtimeBonus: { $sum: '$summary.totalOvertimeBonus' },
            primes: { $sum: '$summary.totalPrimes' },
            rowsWithErrors: { $sum: '$summary.rowsWithErrors' },
          },
        },
      ]),
      User.aggregate([{ $group: { _id: '$subscription.plan', count: { $sum: 1 } } }]),
      SubscriptionHistory.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      SubscriptionHistory.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      SubscriptionHistory.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startOf6Months } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      SubscriptionHistory.find({})
        .populate('company', 'companyName email')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      User.find({})
        .select('companyName email role subscription createdAt lastLogin isActive')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
    ]);

    const signupsLast30 = await User.countDocuments({ createdAt: { $gte: startOfLast30 } });

    // Build a continuous 6-month revenue series (fill empty months with 0)
    const revenueByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = { year: d.getFullYear(), month: d.getMonth() + 1 };
      const found = monthlyRevenue.find((m) => m._id.year === key.year && m._id.month === key.month);
      revenueByMonth.push({
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        year: key.year,
        month: key.month,
        total: found ? found.total : 0,
      });
    }

    const plans = planAgg.reduce((acc, p) => ({ ...acc, [p._id || 'starter']: p.count }), {});

    res.json({
      success: true,
      stats: {
        accounts: {
          total: totalAccounts,
          activePaid: activeAccounts,
          onTrial: trialAccounts,
          expired: expiredAccounts,
          disabled: disabledAccounts,
          admins: adminCount,
          newLast30Days: signupsLast30,
        },
        revenue: {
          total: revenueAgg[0]?.total || 0,
          completedCount: revenueAgg[0]?.count || 0,
          thisMonth: monthRevenueAgg[0]?.total || 0,
          thisMonthCount: monthRevenueAgg[0]?.count || 0,
          byMonth: revenueByMonth,
        },
        plans: {
          starter: plans.starter || 0,
          business: plans.business || 0,
          pro: plans.pro || 0,
          enterprise: plans.enterprise || 0,
        },
        payrollBatches,
        payroll: {
          batches: payrollAgg[0]?.batches || 0,
          employees: payrollAgg[0]?.employees || 0,
          netPayout: payrollAgg[0]?.netPayout || 0,
          lateDeductions: payrollAgg[0]?.lateDeductions || 0,
          absenceDeductions: payrollAgg[0]?.absenceDeductions || 0,
          deductions: (payrollAgg[0]?.lateDeductions || 0) + (payrollAgg[0]?.absenceDeductions || 0),
          overtimeBonus: payrollAgg[0]?.overtimeBonus || 0,
          primes: payrollAgg[0]?.primes || 0,
          rowsWithErrors: payrollAgg[0]?.rowsWithErrors || 0,
        },
        recentPayments,
        recentSignups: recentSignups.map((u) => ({
          _id: u._id,
          companyName: u.companyName,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          plan: u.subscription?.plan || 'starter',
          status: u.subscription?.status || 'active',
          isTrial: u.subscription?.isTrial ?? true,
          createdAt: u.createdAt,
          lastLogin: u.lastLogin,
        })),
      },
    });
  } catch (err) {
    console.error('[admin] getStats error:', err);
    res.status(500).json({ success: false, message: 'Server error computing admin stats.' });
  }
};

/** Shape a payroll record for the admin list (no employee rows). */
const shapePayroll = (r) => ({
  _id: r._id,
  company: r.company
    ? { _id: r.company._id, companyName: r.company.companyName, email: r.company.email }
    : null,
  period: r.period,
  fileName: r.fileName,
  originalFileName: r.originalFileName,
  status: r.status,
  summary: r.summary,
  employeeCount: Array.isArray(r.employees) ? r.employees.length : 0,
  processingErrors: r.processingErrors || [],
  createdAt: r.createdAt,
});

/**
 * GET /api/admin/payroll
 * Every payroll batch across every company.
 */
const getAllPayroll = async (req, res) => {
  try {
    const { page = 1, limit = 10, company, year, status } = req.query;
    const filter = {};
    if (company && mongoose.isValidObjectId(String(company))) filter.company = company;
    if (year) filter['period.year'] = Number(year);
    if (status && ['processing', 'completed', 'failed'].includes(status)) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    const [records, total] = await Promise.all([
      PayrollRecord.find(filter)
        .populate('company', 'companyName email')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      PayrollRecord.countDocuments(filter),
    ]);

    res.json({
      success: true,
      records: records.map(shapePayroll),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.max(1, Math.ceil(total / limitNum)),
      },
    });
  } catch (err) {
    console.error('[admin] getAllPayroll error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching payroll records.' });
  }
};

/**
 * GET /api/admin/payroll/:id
 * Full batch including employee rows.
 */
const getPayrollById = async (req, res) => {
  try {
    const record = await PayrollRecord.findById(req.params.id)
      .populate('company', 'companyName email')
      .lean();
    if (!record) {
      return res.status(404).json({ success: false, message: 'Payroll record not found.' });
    }
    res.json({ success: true, record });
  } catch (err) {
    console.error('[admin] getPayrollById error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/**
 * DELETE /api/admin/payroll/:id
 * Removes a payroll batch from any company.
 */
const deletePayroll = async (req, res) => {
  try {
    const record = await PayrollRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Payroll record not found.' });
    }
    await record.deleteOne();
    res.json({ success: true, message: 'Payroll record deleted.' });
  } catch (err) {
    console.error('[admin] deletePayroll error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting payroll record.' });
  }
};

module.exports = {
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
};
