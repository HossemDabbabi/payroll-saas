import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Loader2, Lock, Building2, ShieldCheck, Mail, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password updated successfully.');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">Account &amp; Security Settings</h1>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Manage your organization profile, role, and credentials.</p>
      </div>

      {/* Organization Information Card */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3 mb-5 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">Company Profile</h2>
            <p className="text-xs text-gray-400 dark:text-slate-500">Registered business account details</p>
          </div>
        </div>

        <div className="space-y-3.5 text-xs">
          <div className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-slate-800/60">
            <span className="text-gray-500 dark:text-slate-400 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" /> Company Name
            </span>
            <span className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{user?.companyName}</span>
          </div>

          <div className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-slate-800/60">
            <span className="text-gray-500 dark:text-slate-400 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" /> Account Email
            </span>
            <span className="font-medium text-gray-800 dark:text-slate-200 font-mono">{user?.email}</span>
          </div>

          <div className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-slate-800/60">
            <span className="text-gray-500 dark:text-slate-400 flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" /> Access Role
            </span>
            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 capitalize">
              {user?.role?.replace('_', ' ') || 'Admin'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <span className="text-gray-500 dark:text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" /> Active Tier
            </span>
            <span className="font-bold text-gray-900 dark:text-slate-100 capitalize">
              {user?.subscription?.plan} Plan ({user?.subscription?.employeeLimit === 999999 ? 'Unlimited' : user?.subscription?.employeeLimit} employees)
            </span>
          </div>
        </div>
      </div>

      {/* Security: Change Password Card */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3 mb-5 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">Security &amp; Password</h2>
            <p className="text-xs text-gray-400 dark:text-slate-500">Update your account password</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              required
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-blue-500 transition"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-blue-500 transition"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-blue-500 transition"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2 rounded-xl transition shadow-sm shadow-blue-200 dark:shadow-none flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
