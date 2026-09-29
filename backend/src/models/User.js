const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const subscriptionSchema = new mongoose.Schema({
  plan: {
    type: String,
    enum: ['starter', 'business', 'pro', 'enterprise'],
    default: 'starter',
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active',
  },
  employeeLimit: {
    type: Number,
    default: 20,
  },
  isTrial: {
    type: Boolean,
    default: true,
  },
  trialEndsAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  lastPayment: {
    amount: Number,
    currency: { type: String, default: 'USD' },
    paidAt: Date,
    cardLast4: String,
    cardBrand: String,
    transactionId: String,
  },
  stripeCustomerId: String,
  stripeSubscriptionId: String,
}, { _id: false });

const userSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  role: {
    type: String,
    enum: ['admin', 'hr_manager'],
    // Default is hr_manager — admin must be explicitly assigned and is unique across the DB.
    default: 'hr_manager',
  },
  subscription: {
    type: subscriptionSchema,
    default: () => ({}),
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: Date,
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if subscription is active
userSchema.methods.hasActiveSubscription = function () {
  if (this.subscription.status !== 'active') return false;
  if (this.subscription.expiresAt && new Date() > this.subscription.expiresAt) {
    return false;
  }
  return true;
};

// Check trial status & days remaining
userSchema.methods.getTrialInfo = function () {
  const isTrial = !!this.subscription.isTrial;
  const expiresAt = this.subscription.expiresAt;
  const isExpired = expiresAt ? new Date() > new Date(expiresAt) : false;
  let daysRemaining = null;
  if (expiresAt) {
    const diff = new Date(expiresAt).getTime() - Date.now();
    daysRemaining = diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
  }
  return { isTrial, isExpired, daysRemaining, expiresAt };
};

// Check employee limit
userSchema.methods.canProcessEmployees = function (count) {
  if (this.subscription.plan === 'enterprise') return true;
  return count <= this.subscription.employeeLimit;
};

userSchema.index({ 'subscription.plan': 1 });

module.exports = mongoose.model('User', userSchema);
