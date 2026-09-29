const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protects routes — requires a valid JWT in Authorization header.
 */
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or account deactivated.' });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please log in again.' });
    }
    next(error);
  }
};

/**
 * Restricts a route to role === 'admin'. Must run after `protect`.
 */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
  }
  next();
};

/**
 * Enforces subscription limits before processing payroll.
 * Attaches row count from body/query for validation.
 */
const checkSubscriptionLimit = (getCount) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user.hasActiveSubscription()) {
        const isTrial = user.subscription.isTrial;
        return res.status(403).json({
          success: false,
          message: isTrial
            ? 'Your 7-day free trial has expired. Please upgrade to a paid plan with a card to continue processing payroll.'
            : 'Your subscription has expired. Please renew your plan with a card to continue.',
          code: isTrial ? 'TRIAL_EXPIRED' : 'SUBSCRIPTION_EXPIRED',
        });
      }
      // Count will be validated after file parsing in the controller
      // This middleware just confirms subscription is active
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validates employee count against subscription tier.
 * Call this AFTER parsing the uploaded file.
 */
const enforceEmployeeLimit = (req, res, employeeCount) => {
  const user = req.user;
  if (!user.canProcessEmployees(employeeCount)) {
    return {
      allowed: false,
      message: `Your ${user.subscription.plan} plan supports up to ${user.subscription.employeeLimit} employees. ` +
        `Your file contains ${employeeCount} employees. Please upgrade your plan.`,
      code: 'EMPLOYEE_LIMIT_EXCEEDED',
      currentPlan: user.subscription.plan,
      limit: user.subscription.employeeLimit,
      submitted: employeeCount,
    };
  }
  return { allowed: true };
};

module.exports = { protect, adminOnly, checkSubscriptionLimit, enforceEmployeeLimit };
