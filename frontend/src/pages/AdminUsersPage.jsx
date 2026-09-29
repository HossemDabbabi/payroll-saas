import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  Search,
  RefreshCw,
  AlertCircle,
  Trash2,
  Power,
  Building2,
  Clock,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return 'Never';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PLAN_BADGE = {
  starter: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  business: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  pro: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
  enterprise: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
};

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminAPI.getUsers();
      if (data.success) setUsers(data.users);
      else setError(data.message || 'Failed to load users.');
    } catch (err) {
      setError(err.response?.data?.message || 'Network error. Are you an admin?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const patchUser = async (id, payload, successMsg) => {
    setBusyId(id);
    try {
      const { data } = await adminAPI.updateUser(id, payload);
      if (data.success) {
        setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, ...data.user } : u)));
        toast.success(successMsg);
      } else {
        toast.error(data.message || 'Update failed.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = (u) => {
    if (u.isActive) {
      if (!window.confirm(`Deactivate ${u.email}? They will no longer be able to sign in.`)) return;
      patchUser(u._id, { isActive: false }, 'Account deactivated.');
    } else {
      patchUser(u._id, { isActive: true }, 'Account activated.');
    }
  };

  const changeRole = (u, role) => {
    if (role === u.role) return;
    const msg =
      role === 'admin'
        ? `Promote ${u.email} to admin? Any other admin will be demoted — only one admin is allowed.`
        : `Change role of ${u.email} to ${role}?`;
    if (!window.confirm(msg)) return;
    patchUser(u._id, { role }, 'Role updated.');
  };

  const removeUser = (u) => {
    if (!window.confirm(`Permanently delete ${u.companyName} (${u.email})? All payroll and payment history will be removed.`)) return;
    setBusyId(u._id);
    adminAPI
      .deleteUser(u._id)
      .then(({ data }) => {
        if (data.success) {
          setUsers((prev) => prev.filter((x) => x._id !== u._id));
          toast.success('Account deleted.');
        } else {
          toast.error(data.message || 'Delete failed.');
        }
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Delete failed.'))
      .finally(() => setBusyId(null));
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.companyName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchAccount =
      accountFilter === 'all' ||
      (accountFilter === 'active' && u.isActive) ||
      (accountFilter === 'disabled' && !u.isActive);
    return matchSearch && matchRole && matchAccount;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    disabled: users.filter((u) => !u.isActive).length,
    admins: users.filter((u) => u.role === 'admin').length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            User Management
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Activate, deactivate, change roles and delete user accounts.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-xl transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: stats.total, icon: Users, color: 'text-gray-900 dark:text-slate-100' },
          { label: 'Active', value: stats.active, icon: UserCheck, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Disabled', value: stats.disabled, icon: UserX, color: 'text-rose-600 dark:text-rose-400' },
          { label: 'Administrators', value: stats.admins, icon: ShieldCheck, color: 'text-blue-600 dark:text-blue-400' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-gray-500 dark:text-slate-400 uppercase tracking-wider font-semibold">{s.label}</p>
                <Icon className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600" />
              </div>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by company or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="hr_manager">HR Manager</option>
        </select>
        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Accounts</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 rounded-xl border border-rose-200 dark:border-rose-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-slate-500 text-sm">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-950/40">
                  {['User', 'Role', 'Plan', 'Account', 'Last Login', 'Registered', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {filtered.map((u) => {
                  const isSelf = me && u._id === me.id;
                  const busy = busyId === u._id;
                  return (
                    <tr key={u._id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition">
                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                            {u.companyName?.substring(0, 2).toUpperCase() || 'CO'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 dark:text-slate-200 truncate max-w-[150px]">
                              {u.companyName}
                              {isSelf && <span className="ml-1 text-[10px] text-blue-500">(you)</span>}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate max-w-[150px] font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        {['admin', 'hr_manager'].includes(u.role) ? (
                          <select
                            value={u.role}
                            onChange={(e) => changeRole(u, e.target.value)}
                            disabled={isSelf || busy}
                            title={isSelf ? 'You cannot change your own role' : 'Change role'}
                            className={`text-[11px] rounded-lg border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed ${
                              u.role === 'admin'
                                ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                                : 'border-gray-200 bg-white text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                            }`}
                          >
                            <option value="hr_manager">HR Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 text-[11px] capitalize">
                            {u.role || 'member'}
                          </span>
                        )}
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${PLAN_BADGE[u.subscription?.plan] || PLAN_BADGE.starter}`}>
                          {u.subscription?.plan || 'starter'}
                        </span>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5 capitalize">
                          {u.subscription?.isTrial ? 'trial' : u.subscription?.status}
                        </p>
                      </td>

                      {/* Account status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            u.isActive
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      {/* Last login */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-gray-500 dark:text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>{formatDateTime(u.lastLogin)}</span>
                        </div>
                      </td>

                      {/* Registered */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-gray-500 dark:text-slate-500">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(u.createdAt)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleActive(u)}
                            disabled={isSelf || busy}
                            title={isSelf ? 'You cannot deactivate yourself' : u.isActive ? 'Deactivate' : 'Activate'}
                            className={`p-1.5 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed ${
                              u.isActive
                                ? 'border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/30'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/30'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => navigate('/admin/accounts')}
                            title="Manage account / subscription"
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeUser(u)}
                            disabled={isSelf || busy || u.role === 'admin'}
                            title={u.role === 'admin' ? 'Administrator accounts cannot be deleted' : 'Delete account'}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 dark:border-slate-700 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:border-rose-800 dark:hover:bg-rose-900/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {busy ? (
                              <span className="block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 text-[11px] text-gray-400 dark:text-slate-500">
            Showing {filtered.length} of {users.length} users
          </div>
        )}
      </div>
    </div>
  );
}
