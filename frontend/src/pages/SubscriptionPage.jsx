import React, { useEffect, useState } from 'react';
import { subscriptionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Check,
  Zap,
  Loader2,
  CreditCard,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Lock,
  X,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const PLAN_ORDER = ['starter', 'business', 'pro', 'enterprise'];

const PLAN_STYLES = {
  starter: {
    border: 'border-gray-200 dark:border-slate-800',
    badge: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
    btn: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300',
    accent: 'emerald',
  },
  business: {
    border: 'border-blue-300 dark:border-blue-800 hover:border-blue-500',
    badge: 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800',
    btn: 'bg-blue-600 hover:bg-blue-700 text-white',
    accent: 'blue',
  },
  pro: {
    border: 'border-purple-300 dark:border-purple-800 hover:border-purple-500',
    badge: 'bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800',
    btn: 'bg-purple-600 hover:bg-purple-700 text-white',
    accent: 'purple',
  },
  enterprise: {
    border: 'border-amber-300 dark:border-amber-800 hover:border-amber-500',
    badge: 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
    btn: 'bg-amber-600 hover:bg-amber-700 text-white',
    accent: 'amber',
  },
};

const formatCardNumber = (value) => {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const matches = v.match(/\d{4,16}/g);
  const match = (matches && matches[0]) || '';
  const parts = [];
  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }
  return parts.length ? parts.join(' ') : value;
};

const formatExpiry = (value) => {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  if (v.length >= 2) {
    return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
  }
  return v;
};

const getCardBrandName = (number) => {
  const clean = number.replace(/[\s-]/g, '');
  if (/^4/.test(clean)) return { name: 'Visa', color: 'from-blue-600 to-indigo-800' };
  if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean))
    return { name: 'Mastercard', color: 'from-red-600 to-orange-700' };
  if (/^3[47]/.test(clean)) return { name: 'Amex', color: 'from-sky-700 to-cyan-900' };
  return { name: 'Card', color: 'from-slate-800 to-slate-900' };
};

export default function SubscriptionPage() {
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState({});
  const [currentSubData, setCurrentSubData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState(null);
  const [cardForm, setCardForm] = useState({
    cardHolder: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
  });
  const [paying, setPaying] = useState(false);

  const fetchSubscriptionData = async () => {
    try {
      const [plansRes, currentRes] = await Promise.all([
        subscriptionAPI.getPlans(),
        subscriptionAPI.getCurrent(),
      ]);
      setPlans(plansRes.data.data);
      setCurrentSubData(currentRes.data.data);
    } catch {
      toast.error('Failed to load subscription details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const currentPlan = user?.subscription?.plan || 'starter';
  const isTrial =
    currentSubData?.trialInfo?.isTrial ?? user?.subscription?.isTrial ?? currentPlan === 'starter';
  const trialDaysRemaining = currentSubData?.trialInfo?.daysRemaining ?? user?.trialInfo?.daysRemaining;
  const isTrialExpired = currentSubData?.trialInfo?.isExpired ?? (isTrial && trialDaysRemaining === 0);

  const handleOpenCardCheckout = (planKey) => {
    const plan = plans[planKey];
    if (!plan || plan.price === 0) return;
    setSelectedPlanForUpgrade({ key: planKey, ...plan });
    setCardForm({
      cardHolder: user?.companyName || '',
      cardNumber: '',
      cardExpiry: '',
      cardCvc: '',
    });
  };

  const handleProcessCardPayment = async (e) => {
    e.preventDefault();
    if (!selectedPlanForUpgrade) return;

    if (!cardForm.cardHolder.trim()) {
      toast.error('Please enter the cardholder name.');
      return;
    }
    const cleanNum = cardForm.cardNumber.replace(/[\s-]/g, '');
    if (cleanNum.length < 13 || cleanNum.length > 19) {
      toast.error('Please enter a valid card number (13-19 digits).');
      return;
    }
    if (!cardForm.cardExpiry || cardForm.cardExpiry.length < 5) {
      toast.error('Please enter a valid expiry date (MM/YY).');
      return;
    }
    if (cardForm.cardCvc.length < 3) {
      toast.error('Please enter a valid 3 or 4-digit CVC.');
      return;
    }

    setPaying(true);
    try {
      const { data } = await subscriptionAPI.upgrade({
        plan: selectedPlanForUpgrade.key,
        cardDetails: cardForm,
      });

      toast.success(data.message || 'Payment successful! Subscription upgraded.');
      setSelectedPlanForUpgrade(null);
      await refreshUser();
      await fetchSubscriptionData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment processing failed. Please check card details.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const brand = getCardBrandName(cardForm.cardNumber);

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
          Subscription &amp; Plans
        </h1>
        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
          Starter plan includes a 7-day free trial. Upgrade with card for uninterrupted batch processing.
        </p>
      </div>

      {/* Trial Status Banner */}
      {isTrial && currentPlan === 'starter' && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
            isTrialExpired
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-950 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isTrialExpired ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <div>
              <p className="font-semibold text-xs">
                {isTrialExpired
                  ? '7-Day Free Trial Expired'
                  : `Starter Plan — 7-Day Free Trial (${
                      trialDaysRemaining !== null ? `${trialDaysRemaining} days remaining` : 'Active'
                    })`}
              </p>
              <p className="text-[11px] opacity-85 mt-0.5">
                {isTrialExpired
                  ? 'Batch payroll processing is paused. Choose a plan below and pay with card to instantly reactivate.'
                  : 'Full access under Starter trial. Upgrade anytime with card to avoid interruptions.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleOpenCardCheckout('business')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl shadow-sm whitespace-nowrap flex items-center gap-1.5 transition ${
              isTrialExpired
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            Upgrade with Card <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Paid Active Subscription Banner */}
      {!isTrial && currentSubData?.lastPayment && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-blue-900 dark:text-blue-200 capitalize">
                {currentPlan} Plan Active
              </span>
              <span className="text-blue-700 dark:text-blue-300 ml-2">
                • Billed via {currentSubData.lastPayment.cardBrand || 'Card'} ending in{' '}
                <span className="font-mono font-medium">{currentSubData.lastPayment.cardLast4}</span>
              </span>
              {currentSubData.expiresAt && (
                <span className="text-gray-400 dark:text-slate-500 text-[10px] block mt-0.5">
                  Renews on: {new Date(currentSubData.expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <span className="text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-2.5 py-0.5 rounded-full">
            Paid &amp; Active
          </span>
        </div>
      )}

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLAN_ORDER.map((key) => {
          const plan = plans[key];
          if (!plan) return null;
          const isCurrent = key === currentPlan;
          const styles = PLAN_STYLES[key] || PLAN_STYLES.starter;
          const isFreeTrial = plan.price === 0;

          return (
            <div
              key={key}
              className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 relative flex flex-col justify-between transition-all ${
                isCurrent
                  ? 'ring-2 ring-blue-500 border-blue-500 shadow-sm'
                  : styles.border
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                    Current Active Plan
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles.badge}`}>
                    {isFreeTrial ? '7-Day Free Trial' : 'Requires Card'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 capitalize">
                  {plan.name}
                </h3>

                {/* Price Display */}
                <div className="mt-2.5 mb-3.5">
                  {isFreeTrial ? (
                    <div>
                      <div className="text-2xl font-extrabold text-gray-900 dark:text-slate-100">Free</div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                        7 days trial period
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-extrabold text-gray-900 dark:text-slate-100">
                          ${plan.price}
                        </span>
                        <span className="text-xs font-normal text-gray-400 dark:text-slate-500">/ month</span>
                      </div>
                      <div className="text-[11px] text-gray-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                        <CreditCard className="w-3 h-3 text-gray-400 dark:text-slate-500" /> Billed with Card
                      </div>
                    </div>
                  )}
                </div>

                {/* Capacity badge */}
                <div className="bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-800 rounded-xl p-2 mb-4 text-center text-xs font-medium text-gray-700 dark:text-slate-300">
                  Capacity:{' '}
                  <span className="font-bold text-gray-900 dark:text-slate-100">
                    {plan.employeeLimit === 999999 ? 'Unlimited' : `Up to ${plan.employeeLimit}`}
                  </span>{' '}
                  employees
                </div>

                {/* Features List */}
                <ul className="space-y-2 mb-5">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-400">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div>
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-default"
                  >
                    Current Plan
                  </button>
                ) : isFreeTrial ? (
                  <button
                    disabled
                    className="w-full py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500"
                  >
                    Trial Included
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenCardCheckout(key)}
                    className={`w-full py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition ${styles.btn}`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Pay with Card (${plan.price}/mo)
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment History Section */}
      {currentSubData?.history && currentSubData.history.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 text-xs">
              Payment &amp; Billing History
            </h4>
            <span className="text-[11px] text-gray-400 dark:text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Card Billing
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-400 dark:text-slate-500 uppercase border-b border-gray-100 dark:border-slate-800">
                <tr>
                  <th className="py-2 px-3 font-medium text-[10px]">Date</th>
                  <th className="py-2 px-3 font-medium text-[10px]">Plan</th>
                  <th className="py-2 px-3 font-medium text-[10px]">Amount</th>
                  <th className="py-2 px-3 font-medium text-[10px]">Payment Method</th>
                  <th className="py-2 px-3 font-medium text-[10px]">Status</th>
                  <th className="py-2 px-3 font-medium text-[10px]">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800 text-gray-700 dark:text-slate-300">
                {currentSubData.history.map((tx) => (
                  <tr key={tx._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-gray-600 dark:text-slate-400 text-xs">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-medium capitalize text-gray-900 dark:text-slate-100">
                      {tx.toPlan}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-slate-100">
                      ${tx.amount}.00 USD
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 dark:text-slate-400 capitalize">
                      <span className="inline-flex items-center gap-1.5">
                        <CreditCard className="w-3 h-3 text-gray-400 dark:text-slate-400" />
                        {tx.paymentMethod === 'card' ? 'Card' : tx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="badge bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 capitalize">
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-gray-400 dark:text-slate-500">
                      {tx.paymentReference || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Credit / Debit Card Checkout Modal (Dark Mode Ready) */}
      {selectedPlanForUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-gray-200 dark:border-slate-800 relative transition-colors">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-slate-100 text-sm">Pay with Card</h3>
                  <p className="text-[11px] text-gray-400 dark:text-slate-400">
                    Upgrading to{' '}
                    <span className="font-semibold capitalize text-gray-800 dark:text-slate-200">
                      {selectedPlanForUpgrade.name}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlanForUpgrade(null)}
                className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Virtual Card Preview */}
            <div className="my-4">
              <div
                className={`bg-gradient-to-tr ${brand.color} text-white p-4 rounded-xl shadow-md relative overflow-hidden`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-8 h-5 bg-amber-400/80 rounded border border-amber-300 shadow-inner flex items-center justify-center">
                    <div className="w-5 h-3 border border-amber-600/40 rounded-xs" />
                  </div>
                  <span className="font-bold text-xs tracking-wider uppercase opacity-90">
                    {brand.name}
                  </span>
                </div>

                <div className="font-mono text-base tracking-widest mb-3">
                  {cardForm.cardNumber ? formatCardNumber(cardForm.cardNumber) : '•••• •••• •••• ••••'}
                </div>

                <div className="flex justify-between items-end text-[11px]">
                  <div>
                    <span className="text-[9px] block opacity-70 uppercase tracking-wider">Cardholder</span>
                    <span className="font-medium tracking-wide uppercase truncate max-w-[170px] block">
                      {cardForm.cardHolder || user?.companyName || 'YOUR COMPANY'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] block opacity-70 uppercase tracking-wider">Expires</span>
                    <span className="font-mono font-medium">
                      {cardForm.cardExpiry || 'MM/YY'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-gray-50 dark:bg-slate-800/60 rounded-xl p-3 mb-4 flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Total Due Today</span>
                <span className="text-gray-900 dark:text-slate-100 font-bold text-sm">
                  ${selectedPlanForUpgrade.price}.00 USD
                </span>
              </div>
              <div className="text-right">
                <span className="text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full text-[10px]">
                  30 Days Access
                </span>
              </div>
            </div>

            {/* Card Payment Form */}
            <form onSubmit={handleProcessCardPayment} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Cardholder Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="John Doe / Company"
                  className="input-field"
                  value={cardForm.cardHolder}
                  onChange={(e) => setCardForm({ ...cardForm, cardHolder: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Card Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength="19"
                    placeholder="4242 •••• •••• 4242"
                    className="input-field font-mono pr-9"
                    value={cardForm.cardNumber}
                    onChange={(e) =>
                      setCardForm({ ...cardForm, cardNumber: formatCardNumber(e.target.value) })
                    }
                  />
                  <CreditCard className="w-3.5 h-3.5 text-gray-400 dark:text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    required
                    maxLength="5"
                    placeholder="MM/YY"
                    className="input-field font-mono text-center"
                    value={cardForm.cardExpiry}
                    onChange={(e) =>
                      setCardForm({ ...cardForm, cardExpiry: formatExpiry(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    CVC / CVV
                  </label>
                  <input
                    type="password"
                    required
                    maxLength="4"
                    placeholder="•••"
                    className="input-field font-mono text-center"
                    value={cardForm.cardCvc}
                    onChange={(e) =>
                      setCardForm({
                        ...cardForm,
                        cardCvc: e.target.value.replace(/[^0-9]/g, '').slice(0, 4),
                      })
                    }
                  />
                </div>
              </div>

              {/* Security info */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 dark:text-slate-500 pt-0.5">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>256-bit SSL encrypted. Card details never stored.</span>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlanForUpgrade(null)}
                  className="btn-secondary w-1/3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="btn-primary flex-1 flex items-center justify-center gap-1.5"
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Authorizing...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Pay ${selectedPlanForUpgrade.price}.00 &amp; Activate</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
