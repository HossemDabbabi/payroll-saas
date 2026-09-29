import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import {
  ShieldCheck,
  Users,
  Building2,
  CreditCard,
  DollarSign,
  UserPlus,
  Ban,
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Trash2,
  Eye,
  X,
  Search,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const PLAN_COLORS = {
  starter: 'bg-slate-400',
  business: 'bg-blue-500',
  pro: 'bg-violet-500',
  enterprise: 'bg-amber-500',
};

const PAYMENT_STATUS_META = {
  completed: { icon: CheckCircle, color: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  pending: { icon: Clock, color: 'text-amber-500', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  failed: { icon: XCircle, color: 'text-rose-500', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  refunded: { icon: RefreshCw, color: 'text-gray-500', badge: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400' },
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const MANAGEMENT_LINKS = [
  {
    to: '/admin/users',
    icon: Users,
    title: 'User Management',
    desc: 'Activate, deactivate, change roles and delete user accounts.',
    color: 'bg-blue-600',
  },
  {
    to: '/admin/accounts',
    icon: Building2,
    title: 'Account Management',
    desc: 'Plans, employee limits, trial extensions and subscription status.',
    color: 'bg-violet-600',
  },
  {
    to: '/admin/payments',
    icon: CreditCard,
    title: 'Payment Management',
    desc: 'Review transactions, mark refunds, failed and completed payments.',
    color: 'bg-emerald-600',
  },
  {
    scrollTo: 'admin-payroll',
    icon: FileSpreadsheet,
    title: 'Payroll Management',
    desc: 'Every payroll batch across all companies — inspect and delete.',
    color: 'bg-blue-700',
  },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payroll batches (all companies)
  const [batches, setBatches] = useState([]);
  const [batchPagination, setBatchPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [batchPage, setBatchPage] = useState(1);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  // Payroll record detail
  const [viewing, setViewing] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [recordSearch, setRecordSearch] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminAPI.getStats();
      if (data.success) setStats(data.stats);
      else setError(data.message || 'Failed to load admin stats.');
    } catch (err) {
      setError(err.response?.data?.message || 'Network error. Are you an admin?');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async (pageParam = batchPage) => {
    setBatchesLoading(true);
    try {
      const { data } = await adminAPI.getPayroll({ page: pageParam, limit: 8 });
      if (data.success) {
        setBatches(data.records);
        setBatchPagination(data.pagination);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load payroll batches.');
    } finally {
      setBatchesLoading(false);
    }
  };

  const viewRecord = async (id) => {
    setViewLoading(true);
    setRecordSearch('');
    try {
      const { data } = await adminAPI.getPayrollRecord(id);
      if (data.success) setViewing(data.record);
      else toast.error(data.message || 'Failed to load record.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load record.');
    } finally {
      setViewLoading(false);
    }
  };

  const deleteBatch = async (rec) => {
    const label = `${rec.company?.companyName || 'Company'} — ${
      MONTH_NAMES[rec.period?.month - 1] || rec.period?.month
    } ${rec.period?.year || ''}`;
    if (!window.confirm(`Delete payroll batch "${label}"? This cannot be undone.`)) return;
    setDeletingId(rec._id);
    try {
      const { data } = await adminAPI.deletePayroll(rec._id);
      if (data.success) {
        toast.success('Payroll batch deleted.');
        fetchBatches(batchPage);
        fetchStats();
      } else {
        toast.error(data.message || 'Delete failed.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchBatches(1);
  }, []);

  const accounts = stats?.accounts;
  const revenue = stats?.revenue;
  const plans = stats?.plans;
  const payroll = stats?.payroll;

  const chartData = {
    labels: revenue?.byMonth?.map((m) => m.label) || [],
    datasets: [
      {
        label: 'Revenue (USD)',
        data: revenue?.byMonth?.map((m) => m.total) || [],
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        hoverBackgroundColor: '#059669',
        borderRadius: 6,
        barThickness: 18,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 11, weight: 'bold' },
        bodyFont: { size: 10 },
        padding: 8,
        cornerRadius: 6,
        callbacks: {
          label: (ctx) => ` $${ctx.parsed.y.toLocaleString()}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false },
        ticks: { font: { size: 9 }, color: '#94a3b8', callback: (v) => `$${v}` },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10, weight: '500' }, color: '#94a3b8' },
      },
    },
  };

  const kpis = [
    { label: 'Total Accounts', value: accounts?.total ?? '—', icon: Users, color: 'text-blue-600 dark:text-blue-400', ring: 'bg-blue-50 dark:bg-blue-950/50' },
    { label: 'Active Paid', value: accounts?.activePaid ?? '—', icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', ring: 'bg-emerald-50 dark:bg-emerald-950/50' },
    { label: 'On Trial', value: accounts?.onTrial ?? '—', icon: Clock, color: 'text-amber-600 dark:text-amber-400', ring: 'bg-amber-50 dark:bg-amber-950/50' },
    { label: 'Total Revenue', value: `$${(revenue?.total ?? 0).toLocaleString()}`, icon: DollarSign, color: 'text-violet-600 dark:text-violet-400', ring: 'bg-violet-50 dark:bg-violet-950/50' },
  ];

  const secondary = [
    { label: 'New (30d)', value: accounts?.newLast30Days ?? '—', icon: UserPlus },
    { label: 'Disabled', value: accounts?.disabled ?? '—', icon: Ban },
    { label: 'Payroll Batches', value: stats?.payrollBatches ?? '—', icon: FileSpreadsheet },
    { label: 'Payments', value: revenue?.completedCount ?? '—', icon: CreditCard },
  ];

  const totalPlanCount = plans
    ? plans.starter + plans.business + plans.pro + plans.enterprise
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </span>
            Admin Dashboard
          </h1>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
            Platform overview — manage users, accounts and payments from one place.
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="self-start flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-xl transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 rounded-xl border border-rose-200 dark:border-rose-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-gray-500 dark:text-slate-400 uppercase tracking-wider font-semibold">{k.label}</p>
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${k.ring}`}>
                  <Icon className={`w-3.5 h-3.5 ${k.color}`} />
                </span>
              </div>
              <p className={`text-2xl font-bold mt-2 ${k.color}`}>
                {loading ? <span className="inline-block w-10 h-6 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /> : k.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Management section */}
      <div>
        <h2 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Management
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {MANAGEMENT_LINKS.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.to}
                onClick={() => navigate(m.to)}
                className="group text-left bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between">
                  <span className={`w-8 h-8 rounded-xl ${m.color} text-white flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-blue-500 transition" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 mt-3">{m.title}</h3>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">{m.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart + plan distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Revenue — last 6 months</h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                This month: <span className="font-semibold text-emerald-600 dark:text-emerald-400">${(revenue?.thisMonth ?? 0).toLocaleString()}</span>
              </p>
            </div>
            <span className="text-[11px] text-gray-400 dark:text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {revenue?.thisMonthCount ?? 0} payments
            </span>
          </div>
          <div className="h-52">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
              </div>
            ) : (
              <Bar data={chartData} options={chartOptions} />
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-3">Plan Distribution</h3>
          <div className="space-y-3">
            {['starter', 'business', 'pro', 'enterprise'].map((p) => {
              const count = plans?.[p] ?? 0;
              const pct = totalPlanCount ? Math.round((count / totalPlanCount) * 100) : 0;
              return (
                <div key={p}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="capitalize font-semibold text-gray-700 dark:text-slate-300">{p}</span>
                    <span className="text-gray-500 dark:text-slate-400">
                      {count} <span className="text-gray-400 dark:text-slate-600">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${PLAN_COLORS[p]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Recent signups */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Recent Accounts</h3>
            <button
              onClick={() => navigate('/admin/users')}
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Manage users <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
            </div>
          ) : (
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {(stats?.recentSignups || []).map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                          {u.companyName?.substring(0, 2).toUpperCase() || 'CO'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 dark:text-slate-200 truncate max-w-[130px]">{u.companyName}</p>
                          <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate max-w-[130px]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="capitalize text-gray-600 dark:text-slate-400">{u.plan}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-gray-500 dark:text-slate-500">{formatDate(u.createdAt)}</span>
                    </td>
                  </tr>
                ))}
                {!stats?.recentSignups?.length && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500">
                      No accounts yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent payments */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Recent Payments</h3>
            <button
              onClick={() => navigate('/admin/payments')}
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Manage payments <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-600" />
            </div>
          ) : (
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {(stats?.recentPayments || []).map((p) => {
                  const meta = PAYMENT_STATUS_META[p.status] || PAYMENT_STATUS_META.pending;
                  const Icon = meta.icon;
                  return (
                    <tr key={p._id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-gray-800 dark:text-slate-200 truncate max-w-[130px]">
                          {p.company?.companyName || '—'}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500">{formatDateTime(p.createdAt)}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-semibold text-gray-800 dark:text-slate-200">${p.amount}</span>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 capitalize">{p.toPlan}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.badge}`}>
                          <Icon className={`w-3 h-3 ${meta.color}`} />
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!stats?.recentPayments?.length && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500">
                      No payments recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
