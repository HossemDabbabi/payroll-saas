/**
 * adminGuard.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Utility functions that enforce the business rule:
 *   "There can only be ONE administrator in the entire database."
 *
 * Exported helpers:
 *   - adminExists()        → Boolean: is an admin already registered?
 *   - assertNoAdmin()      → Throws an error if an admin already exists.
 *   - ensureSingleAdmin()  → Called at startup; demotes extra admins to hr_manager.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const User = require('../models/User');

/**
 * Returns true if at least one user with role='admin' exists in the database.
 *
 * @returns {Promise<boolean>}
 */
const adminExists = async () => {
  // countDocuments with a limit of 1 is O(1) — does NOT scan the full collection.
  const count = await User.countDocuments({ role: 'admin' }).limit(1);
  return count > 0;
};

/**
 * Throws a structured error if an admin already exists.
 * Use this inside controllers (register, update-role) to block a second admin.
 *
 * @throws {Error} with statusCode 409 attached so errorHandler can pick it up.
 */
const assertNoAdmin = async () => {
  const exists = await adminExists();
  if (exists) {
    const err = new Error(
      'An administrator account already exists. ' +
      'Only one admin is allowed per application instance. ' +
      'Contact the current administrator to manage access.'
    );
    err.statusCode = 409;
    throw err;
  }
};

/**
 * Startup migration — ensures exactly ONE admin exists.
 *
 * Algorithm:
 *   1. Find all users with role='admin', sorted by createdAt ASC (oldest first).
 *   2. If none → log a warning (first-run scenario — seed script should create one).
 *   3. If exactly one → nothing to do.
 *   4. If more than one → keep the OLDEST admin, demote the rest to 'hr_manager'.
 *
 * This function is idempotent and safe to run on every server boot.
 *
 * @returns {Promise<void>}
 */
const ensureSingleAdmin = async () => {
  try {
    // Fetch all admin accounts sorted oldest → newest
    const admins = await User.find({ role: 'admin' })
      .select('_id email companyName createdAt')
      .sort({ createdAt: 1 })
      .lean();

    if (admins.length === 0) {
      // No admin at all — this is expected on the very first run before seeding.
      console.warn(
        '⚠️  [adminGuard] No administrator found in the database. ' +
        'Run the seed script (scripts/seedAdmin.js) to create one.'
      );
      return;
    }

    if (admins.length === 1) {
      // Perfect state — nothing to do.
      console.log(`✅ [adminGuard] Single admin verified: ${admins[0].email}`);
      return;
    }

    // Multiple admins detected — keep the oldest, demote the rest.
    const [keeper, ...extras] = admins;
    const extraIds = extras.map((a) => a._id);

    await User.updateMany(
      { _id: { $in: extraIds } },
      { $set: { role: 'hr_manager' } }
    );

    console.warn(
      `⚠️  [adminGuard] ${extras.length} duplicate admin(s) detected and demoted to 'hr_manager'.\n` +
      `   ✔ Kept admin    : ${keeper.email} (created ${keeper.createdAt.toISOString()})\n` +
      `   ✘ Demoted users : ${extras.map((e) => e.email).join(', ')}`
    );
  } catch (err) {
    // Log but do NOT crash the server — the app can still run safely.
    console.error('❌ [adminGuard] ensureSingleAdmin failed:', err.message);
  }
};

module.exports = { adminExists, assertNoAdmin, ensureSingleAdmin };
