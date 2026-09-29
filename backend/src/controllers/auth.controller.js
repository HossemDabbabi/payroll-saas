const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { SUBSCRIPTION_TIERS } = require('../config/subscription.config');
const { assertNoAdmin } = require('../utils/adminGuard');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { companyName, email, password, role } = req.body;

    if (!companyName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Company name, email, and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    /* ── Role validation ────────────────────────────────────────────────────
     * The public registration endpoint ALWAYS creates an 'hr_manager'.
     * If the caller explicitly requests 'admin', we check the DB first.
     * This prevents privilege escalation: even if a client forges role='admin',
     * the guard will reject it if an admin already exists.
     * ──────────────────────────────────────────────────────────────────────── */
    let assignedRole = 'hr_manager'; // safe default — matches the schema default

    if (role === 'admin') {
      // Will throw a 409 error (caught below) if an admin already exists
      await assertNoAdmin();
      assignedRole = 'admin';
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const trialDays = 7;
    const trialExpiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    const user = await User.create({
      companyName,
      email,
      password,
      role: assignedRole,
      subscription: {
        plan: 'starter',
        status: 'active',
        employeeLimit: SUBSCRIPTION_TIERS.starter.employeeLimit,
        isTrial: true,
        trialEndsAt: trialExpiresAt,
        expiresAt: trialExpiresAt,
      },
    });

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Account created successfully. Your 7-day free trial is now active.',
      token,
      user: {
        id: user._id,
        companyName: user.companyName,
        email: user.email,
        role: user.role,
        subscription: user.subscription,
        trialInfo: user.getTrialInfo(),
      },
    });
  } catch (error) {
    // Forward 409 from assertNoAdmin() to the global error handler
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact support.' });
    }
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    const token = generateToken(user._id);
    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        companyName: user.companyName,
        email: user.email,
        role: user.role,
        subscription: user.subscription,
        trialInfo: user.getTrialInfo(),
        isSubscriptionActive: user.hasActiveSubscription(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    // Auto-migrate starter accounts without expiresAt to 7-day trial from createdAt
    if (user.subscription.plan === 'starter' && !user.subscription.expiresAt) {
      const trialEnds = new Date(new Date(user.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000);
      user.subscription.isTrial = true;
      user.subscription.trialEndsAt = trialEnds;
      user.subscription.expiresAt = trialEnds;
      await user.save({ validateBeforeSave: false });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        companyName: user.companyName,
        email: user.email,
        role: user.role,
        subscription: user.subscription,
        trialInfo: user.getTrialInfo(),
        isSubscriptionActive: user.hasActiveSubscription(),
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }
    const user = await User.findById(req.user.id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, changePassword };
