import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2, TrendingUp, Building2, Mail, Lock, Sparkles, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ companyName: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await register(form.companyName, form.email, form.password);
      toast.success('Account created! Welcome to your 7-day free trial.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl shadow-md shadow-blue-200 dark:shadow-none mb-3 text-white">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
            Payroll<span className="text-blue-600 dark:text-blue-400">Pro</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Start your <span className="text-emerald-600 dark:text-emerald-400 font-semibold">7-Day Free Trial</span> • No credit card required
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                Company / Organization Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-blue-500 transition pl-9"
                  placeholder="Acme Technologies"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                />
                <Building2 className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-blue-500 transition pl-9"
                  placeholder="admin@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <Mail className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-blue-500 transition pl-9 pr-10"
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <Lock className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 p-1"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={8}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-blue-500 transition pl-9"
                  placeholder="Repeat your password"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                />
                <Lock className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 rounded-xl transition shadow-sm shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account &amp; Start Trial</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 dark:text-slate-400 mt-6 pt-5 border-t border-gray-100 dark:border-slate-800">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
