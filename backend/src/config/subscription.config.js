/**
 * Subscription tier configuration.
 * Defines employee limits and features per plan.
 */
const SUBSCRIPTION_TIERS = {
  starter: {
    name: 'Starter (7-Day Free Trial)',
    employeeLimit: 20,
    price: 0,
    isTrial: true,
    trialDays: 7,
    features: [
      'Up to 20 employees',
      '7-Day Free Trial',
      'Automated payroll engine',
      'Excel & CSV file upload',
      'Downloadable PDF payslips',
      'Line-by-line deduction breakdown',
    ],
  },
  business: {
    name: 'Business',
    employeeLimit: 30,
    price: 29,
    features: [
      'Up to 30 employees',
      'All Starter features included',
      'Monthly analytics dashboard',
      'Overtime & penalty reports',
      'Excel summary export',
      'Credit / Debit Card billing',
    ],
  },
  pro: {
    name: 'Pro',
    employeeLimit: 50,
    price: 59,
    features: [
      'Up to 50 employees',
      'All Business features included',
      'Priority email & chat support',
      'Multi-department breakdowns',
      'Custom report templates',
      'Credit / Debit Card billing',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    employeeLimit: 999999,
    price: 149,
    features: [
      'Unlimited employees',
      'All Pro features included',
      'Dedicated account manager',
      '99.9% uptime SLA guarantee',
      'Custom API & payroll integrations',
      'Credit / Debit Card billing',
    ],
  },
};

module.exports = { SUBSCRIPTION_TIERS };
