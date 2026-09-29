/**
 * scripts/ensureSingleAdmin.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Standalone migration script — run manually when needed:
 *
 *   node scripts/ensureSingleAdmin.js
 *
 * What it does:
 *   1. Connects to MongoDB using the same env as the app.
 *   2. Finds all users with role='admin'.
 *   3. If more than one exists, keeps the OLDEST and demotes the rest to 'hr_manager'.
 *   4. Prints a full report to the console.
 *   5. Exits cleanly.
 *
 * Safe to run multiple times (idempotent).
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const path = require('path');

// Load .env from the backend root (one level above /scripts)
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');

/** ANSI colour helpers for readable console output */
const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  bold:   '\x1b[1m',
};
const log  = (msg) => console.log(`${c.green}✔${c.reset}  ${msg}`);
const warn = (msg) => console.warn(`${c.yellow}⚠${c.reset}  ${msg}`);
const err  = (msg) => console.error(`${c.red}✘${c.reset}  ${msg}`);
const info = (msg) => console.log(`${c.cyan}ℹ${c.reset}  ${msg}`);

async function run() {
  /* ── 1. Connect ─────────────────────────────────────────────────────────── */
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://localhost:27017/payroll_saas';

  info(`Connecting to MongoDB: ${mongoUri.replace(/:\/\/.*@/, '://***@')}`);

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    log('MongoDB connected.');
  } catch (e) {
    err(`Connection failed: ${e.message}`);
    process.exit(1);
  }

  /* ── 2. Fetch all admins ────────────────────────────────────────────────── */
  const admins = await User.find({ role: 'admin' })
    .select('_id companyName email createdAt')
    .sort({ createdAt: 1 })   // oldest first → this one is kept
    .lean();

  console.log('');
  console.log(`${c.bold}=== Admin Uniqueness Migration ===${c.reset}`);
  console.log(`Total admin accounts found: ${c.bold}${admins.length}${c.reset}`);
  console.log('');

  /* ── 3. Handle each scenario ────────────────────────────────────────────── */
  if (admins.length === 0) {
    warn('No admin account found in the database.');
    warn('Create one with:  node scripts/seedAdmin.js');
    await mongoose.disconnect();
    process.exit(0);
  }

  if (admins.length === 1) {
    log(`Single admin already in place — no action required.`);
    log(`  Email  : ${admins[0].email}`);
    log(`  Company: ${admins[0].companyName}`);
    log(`  Since  : ${new Date(admins[0].createdAt).toLocaleString()}`);
    await mongoose.disconnect();
    process.exit(0);
  }

  /* Multiple admins — keep the first (oldest), demote the rest */
  const [keeper, ...duplicates] = admins;

  warn(`${duplicates.length} duplicate admin(s) detected. Beginning demotion...`);
  console.log('');

  log(`Keeping (oldest admin):`);
  console.log(`   Email  : ${keeper.email}`);
  console.log(`   Company: ${keeper.companyName}`);
  console.log(`   Since  : ${new Date(keeper.createdAt).toLocaleString()}`);
  console.log('');

  warn('Demoting the following accounts to hr_manager:');
  duplicates.forEach((d, i) => {
    console.log(`   ${i + 1}. ${d.email} (${d.companyName}) — created ${new Date(d.createdAt).toLocaleString()}`);
  });
  console.log('');

  /* Bulk update */
  const duplicateIds = duplicates.map((d) => d._id);
  const result = await User.updateMany(
    { _id: { $in: duplicateIds } },
    { $set: { role: 'hr_manager' } }
  );

  if (result.modifiedCount === duplicates.length) {
    log(`${result.modifiedCount} account(s) successfully demoted to 'hr_manager'.`);
  } else {
    err(`Expected to demote ${duplicates.length} but only modified ${result.modifiedCount}. Check manually.`);
  }

  /* ── 4. Final verification ──────────────────────────────────────────────── */
  const finalAdminCount = await User.countDocuments({ role: 'admin' });
  console.log('');
  if (finalAdminCount === 1) {
    log(`${c.bold}Migration complete. Exactly 1 admin in the database.${c.reset}`);
  } else {
    err(`Unexpected admin count after migration: ${finalAdminCount}. Please investigate.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  err(`Unhandled error: ${e.message}`);
  process.exit(1);
});
