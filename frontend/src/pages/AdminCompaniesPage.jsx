import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import {
  Building2,
  Mail,
  Crown,
  Users,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  Settings2,
  X,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const PLAN_META = {
  starter:    { label: 'Starter',    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',         dot: 'bg-slate-400' },
  business:   { label: 'Business',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',          dot: 'bg-blue-500'  },
  pro:        { label: 'Pro',        color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',  dot: 'bg-violet-500'},
  enterprise: { label: 'Enterprise', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',      dot: 'bg-amber-500' },
};

const TIER_LIMITS = {
  starter: 20,
  business: 30,
  pro: 50,
  enterprise: '',
};

const STATUS_META = {
  active:   { icon: CheckCircle, color: 'text-emerald-500' },
  trial:    { icon: Clock,        color: 'text-amber-500'   },
  expired:  { icon: XCircle,     color: 'text-rose-500'    },
  inactive: { icon: AlertCircle, color: 'text-gray-400'    },
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toDateInput(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function PlanBadge({ plan }) {
  const m = PLAN_META[plan] || PLAN_META.starter;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function StatusIcon({ status }) {
  const m = STATUS_META[status] || STATUS_META.inactive;
  const Icon = m.icon;
  return <Icon className={`w-4 h-4 ${m.color}`} />;
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */

export default function AdminCompaniesPage() {
  const [companies, setCompanies]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [sortField, setSortField]   = useState('createdAt');
  const [sortAsc, setSortAsc]       = useState(false);
  const [expanded, setExpanded]     = useState(null);

  // Account (subscription) management modal
  const [editing, setEditing]       = useState(null);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState({ plan: 'starter', status: 'active', employeeLimit: 20, expiresAt: '', trialEndsAt: '' });

  const openEdit = (c) => {
    const sub = c.subscription || {};
    setEditing(c);
    setForm({
      plan: sub.plan || 'starter',
      status: ['active', 'inactive', 'expired'].includes(sub.status) ? sub.status : 'active',
      employeeLimit: sub.employeeLimit === 999999 ? '' : (sub.employeeLimit ?? 20),
      expiresAt: toDateInput(sub.expiresAt),
      trialEndsAt: toDateInput(sub.trialEndsAt),
    });
  };

  const closeEdit = () => {
    if (saving) return;
    setEditing(null);
  };

  const saveSubscription = async (extra = {}) => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {
        plan: form.plan,
        status: form.status,
        ...(form.employeeLimit !== '' && { employeeLimit: Number(form.employeeLimit) }),
        expiresAt: form.expiresAt || null,
        trialEndsAt: form.trialEndsAt || null,
        ...extra,
      };
      const { data } = await adminAPI.updateSubscription(editing._id, payload);
      if (data.success) {
        setCompanies((prev) => prev.map((c) => (c._id === data.company._id ? data.company : c)));
        toast.success(extra.extendDays ? `Extended by ${extra.extendDays} days.` : 'Subscription updated.');
        setEditing(null);
      } else {
        toast.error(data.message || 'Update failed.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const fetchCompanies = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminAPI.getCompanies();
      if (data.success) setCompanies(data.companies);
      else setError(data.message || 'Failed to load companies.');
    } catch (err) {
      setError(err.response?.data?.message || 'Network error. Are you an admin?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  /* filtering + sorting */
  const filtered = companies
    .filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.companyName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q);
      const matchPlan = planFilter === 'all' || c.subscription?.plan === planFilter;
      return matchSearch && matchPlan;
    })
    .sort((a, b) => {
      let av, bv;
      if (sortField === 'createdAt') { av = new Date(a.createdAt); bv = new Date(b.createdAt); }
      else if (sortField === 'plan')  { av = a.subscription?.plan || ''; bv = b.subscription?.plan || ''; }
      else if (sortField === 'name')  { av = a.companyName || ''; bv = b.companyName || ''; }
      else { av = a[sortField]; bv = b[sortField]; }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

  const toggleSort = (field) => {
    if (sortField === field) setSortAsc((p) => !p);
    else { setSortField(field); setSortAsc(true); }
  };

  const SortIcon = ({ field }) =>
    sortField === field
      ? sortAsc ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
      : <ChevronDown className="w-3 h-3 ml-1 opacity-30" />;

  /* stats banner */
  const stats = {
    total:      companies.length,
    trial:      companies.filter((c) => c.subscription?.isTrial).length,
    active:     companies.filter((c) => c.subscription?.status === 'active').length,
    enterprise: companies.filter((c) => c.subscription?.plan === 'enterprise').length,
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Account Management
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Manage company accounts: plans, employee limits, trial and subscription status.
          </p>
        </div>
        <button
          onClick={fetchCompanies}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-xl transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Companies',  value: stats.total,      color: 'text-gray-900 dark:text-slate-100' },
          { label: 'On Trial',         value: stats.trial,      color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Active Paid',      value: stats.active,     color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Enterprise',       value: stats.enterprise, color: 'text-violet-600 dark:text-violet-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
            <p className="text-[11px] text-gray-500 dark:text-slate-400 uppercase tracking-wider font-semibold">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Plans</option>
          <option value="starter">Starter</option>
          <option value="business">Business</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Error */}
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
          <div className="text-center py-16 text-gray-400 dark:text-slate-500 text-sm">
            No companies found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-950/40">
                  {[
                    { label: 'Company',     field: 'name'      },
                    { label: 'Email',       field: 'email'     },
                    { label: 'Plan',        field: 'plan'      },
                    { label: 'Status',      field: 'status'    },
                    { label: 'Emp. Limit',  field: null        },
                    { label: 'Registered',  field: 'createdAt' },
                    { label: 'Trial Ends',  field: null        },
                    { label: 'Actions',     field: null        },
                    { label: '',            field: null        },
                  ].map(({ label, field }) => (
                    <th
                      key={label}
                      onClick={() => field && toggleSort(field)}
                      className={`text-left px-4 py-3 font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap ${field ? 'cursor-pointer hover:text-gray-700 dark:hover:text-slate-200' : ''}`}
                    >
                      <span className="flex items-center">
                        {label}
                        {field && <SortIcon field={field} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {filtered.map((c) => {
                  const sub = c.subscription || {};
                  const isExpanded = expanded === c._id;
                  return (
                    <React.Fragment key={c._id}>
                      <tr
                        className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition cursor-pointer"
                        onClick={() => setExpanded(isExpanded ? null : c._id)}
                      >
                        {/* Company name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                              {c.companyName?.substring(0, 2).toUpperCase() || 'CO'}
                            </div>
                            <span className="font-semibold text-gray-800 dark:text-slate-200 truncate max-w-[140px]">
                              {c.companyName}
                            </span>
                          </div>
                        </td>

                        {/* Email — unique identifier */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-slate-400">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate max-w-[180px] font-mono text-[11px]">{c.email}</span>
                          </div>
                        </td>

                        {/* Plan badge */}
                        <td className="px-4 py-3">
                          <PlanBadge plan={sub.plan} />
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon status={sub.status} />
                            <span className="capitalize text-gray-600 dark:text-slate-400">{sub.status || '—'}</span>
                          </div>
                        </td>

                        {/* Employee limit */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-gray-600 dark:text-slate-400">
                            <Users className="w-3 h-3" />
                            <span>{sub.employeeLimit === 999999 ? '∞' : sub.employeeLimit ?? 20}</span>
                          </div>
                        </td>

                        {/* Registered */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-gray-500 dark:text-slate-500">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(c.createdAt)}</span>
                          </div>
                        </td>

                        {/* Trial ends / expiry */}
                        <td className="px-4 py-3">
                          {sub.isTrial ? (
                            <span className={`font-semibold ${sub.trialDaysRemaining === 0 ? 'text-rose-500' : 'text-amber-500'}`}>
                              {sub.trialDaysRemaining === 0 ? 'Expired' : `${sub.trialDaysRemaining}d left`}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500">{formatDate(sub.expiresAt)}</span>
                          )}
                        </td>

                        {/* Manage account */}
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 dark:hover:border-blue-800 transition text-[11px] font-semibold"
                            title="Manage subscription"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                            Manage
                          </button>
                        </td>

                        {/* Expand toggle */}
                        <td className="px-4 py-3 text-right">
                          {isExpanded
                            ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 ml-auto" />
                            : <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr className="bg-blue-50/40 dark:bg-slate-800/40">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px]">
                              {[
                                { label: 'Company ID',    value: c._id },
                                { label: 'Role',          value: c.role },
                                { label: 'Is Active',     value: c.isActive ? 'Yes' : 'No' },
                                { label: 'Last Login',    value: formatDate(c.lastLogin) },
                                { label: 'Sub. Status',   value: sub.status },
                                { label: 'Plan',          value: sub.plan },
                                { label: 'Employee Limit',value: sub.employeeLimit === 999999 ? 'Unlimited' : sub.employeeLimit },
                                { label: 'Trial',         value: sub.isTrial ? `Yes (${sub.trialDaysRemaining}d left)` : 'No' },
                                { label: 'Trial Ends',    value: formatDate(sub.trialEndsAt) },
                                { label: 'Plan Expires',  value: formatDate(sub.expiresAt) },
                                { label: 'Last Payment',  value: sub.lastPayment ? `${formatDate(sub.lastPayment.paidAt)} — $${sub.lastPayment.amount ?? 0} (${sub.lastPayment.cardBrand || 'card'})` : '—' },
                                { label: 'Registered',    value: formatDate(c.createdAt) },
                              ].map(({ label, value }) => (
                                <div key={label}>
                                  <p className="text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold mb-0.5">{label}</p>
                                  <p className="text-gray-700 dark:text-slate-300 font-medium break-all">{value ?? '—'}</p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 text-[11px] text-gray-400 dark:text-slate-500">
            Showing {filtered.length} of {companies.length} companies
          </div>
        )}
      </div>

      {/* Account management modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={closeEdit}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                  {editing.companyName?.substring(0, 2).toUpperCase() || 'CO'}
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
                    Manage Account
                  </h2>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate font-mono">
                    {editing.email}
                  </p>
                </div>
              </div>
              <button
                onClick={closeEdit}
                disabled={saving}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-5 py-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-400 mb-1.5">
                    Subscription Plan
                  </label>
                  <select
                    value={form.plan}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        plan: e.target.value,
                        employeeLimit: e.target.value === 'enterprise' ? '' : TIER_LIMITS[e.target.value],
                      })
                    }
                    className="w-full text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="starter">Starter</option>
                    <option value="business">Business</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-400 mb-1.5">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-400 mb-1.5">
                  Employee Limit
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.employeeLimit}
                  placeholder={form.plan === 'enterprise' ? 'Unlimited' : ''}
                  onChange={(e) => setForm({ ...form, employeeLimit: e.target.value })}
                  className="w-full text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
                  Leave empty to use the plan default (Enterprise = unlimited).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-400 mb-1.5">
                    Plan Expires On
                  </label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className="w-full text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-400 mb-1.5">
                    Trial Ends On
                  </label>
                  <input
                    type="date"
                    value={form.trialEndsAt}
                    onChange={(e) => setForm({ ...form, trialEndsAt: e.target.value })}
                    className="w-full text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => saveSubscription({ extendDays: 30 })}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-xl transition disabled:opacity-50"
              >
                <Clock className="w-3.5 h-3.5" />
                Extend current period by 30 days
              </button>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-950/40">
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="text-xs font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 px-3 py-2 rounded-xl transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveSubscription()}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
