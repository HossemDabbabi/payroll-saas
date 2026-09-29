const User = require('../models/User');
const SubscriptionHistory = require('../models/Subscription');
const { SUBSCRIPTION_TIERS } = require('../config/subscription.config');

// Helper: Detect card brand from number prefix
const detectCardBrand = (number) => {
  const clean = String(number).replace(/[\s-]/g, '');
  if (/^4/.test(clean)) return 'Visa';
  if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'Mastercard';
  if (/^3[47]/.test(clean)) return 'American Express';
  if (/^6(?:011|5)/.test(clean)) return 'Discover';
  return 'Credit Card';
};

// GET /api/subscriptions/plans
const getPlans = async (req, res) => {
  res.json({ success: true, data: SUBSCRIPTION_TIERS });
};

// GET /api/subscriptions/current
const getCurrentSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const tierInfo = SUBSCRIPTION_TIERS[user.subscription.plan];
    const trialInfo = user.getTrialInfo ? user.getTrialInfo() : null;

    // Fetch payment history
    const history = await SubscriptionHistory.find({ company: user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        ...user.subscription.toObject(),
        tierInfo,
        trialInfo,
        isActive: user.hasActiveSubscription(),
        history,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/subscriptions/upgrade
const upgradePlan = async (req, res, next) => {
  try {
    const { plan, cardDetails } = req.body;
    const validPlans = ['starter', 'business', 'pro', 'enterprise'];

    if (!plan || !validPlans.includes(plan)) {
      return res.status(400).json({ success: false, message: 'Invalid subscription plan.' });
    }

    const tierInfo = SUBSCRIPTION_TIERS[plan];
    const user = await User.findById(req.user.id);
    const fromPlan = user.subscription.plan;

    // Paid plans (business, pro, enterprise) REQUIRE card payment
    if (plan !== 'starter') {
      if (!cardDetails) {
        return res.status(400).json({
          success: false,
          message: 'Payment with card is required to upgrade to paid plans.',
          code: 'CARD_REQUIRED',
        });
      }

      const { cardHolder, cardNumber, cardExpiry, cardCvc } = cardDetails;

      if (!cardHolder || !cardHolder.trim()) {
        return res.status(400).json({ success: false, message: 'Cardholder name is required.' });
      }

      const cleanNumber = String(cardNumber || '').replace(/[\s-]/g, '');
      if (!/^\d{13,19}$/.test(cleanNumber)) {
        return res.status(400).json({ success: false, message: 'Invalid card number. Must be between 13 and 19 digits.' });
      }

      if (!cardExpiry || !/^(0[1-9]|1[0-2])\/?([0-9]{2}|[0-9]{4})$/.test(cardExpiry.trim())) {
        return res.status(400).json({ success: false, message: 'Invalid expiry date format. Use MM/YY.' });
      }

      // Check if expired
      const parts = cardExpiry.split('/');
      const expMonth = parseInt(parts[0], 10);
      let expYear = parseInt(parts[1], 10);
      if (expYear < 100) expYear += 2000;
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
        return res.status(400).json({ success: false, message: 'Card has expired.' });
      }

      const cleanCvc = String(cardCvc || '').trim();
      if (!/^\d{3,4}$/.test(cleanCvc)) {
        return res.status(400).json({ success: false, message: 'Invalid CVC. Must be 3 or 4 digits.' });
      }

      // Card payment approved
      const cardBrand = detectCardBrand(cleanNumber);
      const cardLast4 = cleanNumber.slice(-4);
      const transactionId = `TXN_CARD_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // 30 days active period from today
      const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      user.subscription.plan = plan;
      user.subscription.status = 'active';
      user.subscription.isTrial = false;
      user.subscription.employeeLimit = tierInfo.employeeLimit;
      user.subscription.expiresAt = newExpiresAt;
      user.subscription.lastPayment = {
        amount: tierInfo.price,
        currency: 'USD',
        paidAt: new Date(),
        cardLast4,
        cardBrand,
        transactionId,
      };

      await user.save({ validateBeforeSave: false });

      // Log transaction
      await SubscriptionHistory.create({
        company: user._id,
        fromPlan,
        toPlan: plan,
        amount: tierInfo.price,
        currency: 'USD',
        paymentMethod: 'card',
        paymentReference: transactionId,
        status: 'completed',
        validFrom: new Date(),
        validUntil: newExpiresAt,
        notes: `Card payment of $${tierInfo.price} successful (${cardBrand} •••• ${cardLast4})`,
      });

      return res.json({
        success: true,
        message: `Payment successful! Upgraded to ${tierInfo.name} plan ($${tierInfo.price}/mo).`,
        data: {
          ...user.subscription.toObject(),
          trialInfo: user.getTrialInfo(),
          transactionId,
          cardBrand,
          cardLast4,
        },
      });
    }

    // Downgrade to Starter (re-enters 7-day limit or current)
    user.subscription.plan = 'starter';
    user.subscription.employeeLimit = tierInfo.employeeLimit;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: `Plan changed to ${tierInfo.name}.`,
      data: user.subscription,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPlans, getCurrentSubscription, upgradePlan };
