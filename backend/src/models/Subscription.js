const mongoose = require('mongoose');

/**
 * Tracks subscription plan changes / payment history.
 */
const subscriptionHistorySchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fromPlan: {
    type: String,
    enum: ['starter', 'business', 'pro', 'enterprise', null],
    default: null,
  },
  toPlan: {
    type: String,
    enum: ['starter', 'business', 'pro', 'enterprise'],
    required: true,
  },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  paymentMethod: {
    type: String,
    enum: ['card', 'stripe', 'konnect', 'flouci', 'manual', 'trial'],
    default: 'trial',
  },
  paymentReference: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed',
  },
  validFrom: { type: Date, required: true },
  validUntil: { type: Date },
  notes: String,
}, {
  timestamps: true,
});

subscriptionHistorySchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model('SubscriptionHistory', subscriptionHistorySchema);
