/**
 * scripts/seedAdmin.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates the one-and-only admin account if none exists yet.
 *
 * Usage (edit credentials below OR pass env vars):
 *   ADMIN_EMAIL=boss@company.com ADMIN_PASSWORD=Secret123 node scripts/seedAdmin.js
 *
 * If an admin already exists, the script exits without modifying anything.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const { SUBSCRIPTION_TIERS } = require('../src/config/subscription.config');

/* ── Credentials (override with env vars) ─────────────────────────────────── */
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL    || 'admin@payrollpro.com';
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD || 'Admin@12345';   // Change this!
const ADMIN_COMPANY     = process.env.ADMIN_COMPANY  || 'PayrollPro HQ';

async function run() {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI   ||
    'mongodb://localhost:27017/payroll_saas';

  console.log(`ℹ  Connecting to: ${mongoUri.replace(/:\/\/.*@/, '://***@')}`);

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('✔  MongoDB connected.');
  } catch (e) {
    console.error('✘  Connection failed:', e.message);
    process.exit(1);
  }

  /* Check if admin already exists */
  const existing = await User.findOne({ role: 'admin' }).lean();
  if (existing) {
    console.log(`⚠  Admin already exists: ${existing.email} — skipping seed.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  /* Create the admin */
  const trialEnds = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
  const admin = await User.create({
    companyName: ADMIN_COMPANY,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin',                         // explicitly set — bypasses hr_manager default
    isActive: true,
    subscription: {
      plan: 'enterprise',
      status: 'active',
      employeeLimit: SUBSCRIPTION_TIERS.enterprise.employeeLimit,
      isTrial: false,
      trialEndsAt: null,
      expiresAt: trialEnds,
    },
  });

  console.log('');
  console.log('✔  Admin account created successfully:');
  console.log(`   Email  : ${admin.email}`);
  console.log(`   Company: ${admin.companyName}`);
  console.log(`   Role   : ${admin.role}`);
  console.log(`   Plan   : ${admin.subscription.plan}`);
  console.log('');
  console.log('⚠  IMPORTANT: Change the default password immediately after first login.');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error('✘  Unhandled error:', e.message);
  process.exit(1);
});
