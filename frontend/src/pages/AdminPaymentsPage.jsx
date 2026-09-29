import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Search,
  Calendar,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

const STATUS_META = {
  completed: {
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  pending: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  failed: {
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
  refunded: {
    badge: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
    dot: 'bg-gray-400',
  },
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);

  const fetchPayments = async (pageParam = page) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminAPI.getPayments({
        page: pageParam,
        limit: 50,
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      if (data.success) {
        setPayments(data.payments);
        setStats(data.stats);
        setPagination(data.pagination);
      } else {
        setError(data.message || 'Failed to load payments.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Network error. Are you an admin?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(page);
  }, [page, statusFilter]);

  const updateStatus = async (payment, status) => {
    if (status === payment.status) return;
    const labels = { completed: 'completed', failed: 'failed', refunded: 'refunded', pending: 'pending' };
    if (
      !window.confirm(
        `Mark payment ${payment.paymentReference || payment._id} as ${labels[status]}?`
      )
    )
      return;

    setBusyId(payment._id);
    try {
      const { data } = await adminAPI.updatePayment(payment._id, { status });
      if (data.success) {
        setPayments((prev) =>
          prev.map((p) =>
            p._id === payment._id
              ? { ...p, status: data.payment.status, notes: data.payment.notes }
              : p
          )
        );
        toast.success('Payment updated.');
        fetchPayments(page);
      } else {
        toast.error(data.message || 'Update failed.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      p.company?.companyName?.toLowerCase().includes(q) ||
      p.company?.email?.toLowerCase().includes(q) ||
      p.paymentReference?.toLowerCase().includes(q) ||
      p.toPlan?.toLowerCase().includes(q)
    );
  });

  const byStatus = stats?.byStatus || {};

  const cards = [
    { label: 'Total Revenue', value: `$${(stats?.totalRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Completed', value: stats?.completedCount ?? '—', icon: CheckCircle, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Pending', value: byStatus.pending ?? 0, icon: RefreshCw, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Failed / Refunded', value: (byStatus.failed || 0) + (byStatus.refunded || 0), icon: AlertCircle, color: 'text-rose-600 dark:text-rose-400' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            Payment Management
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            All transactions across every company — review, refund or flag payments.
          </p>
        </div>
        <button
          onClick={() => fetchPayments(page)}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-xl transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-gray-500 dark:text-slate-400 uppercase tracking-wider font-semibold">{c.label}</p>
                <Icon className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600" />
              </div>
              <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
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
            placeholder="Search by company, email or reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-slate-500 text-sm">No payments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-950/40">
                  {['Date', 'Company', 'Plan', 'Amount', 'Method', 'Reference', 'Status', 'Actions'].map((h) => (
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
                {filtered.map((p) => {
                  const meta = STATUS_META[p.status] || STATUS_META.pending;
                  const busy = busyId === p._id;
                  return (
                    <tr key={p._id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-gray-600 dark:text-slate-400">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span className="whitespace-nowrap">{formatDateTime(p.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800 dark:text-slate-200 truncate max-w-[150px]">
                          {p.company?.companyName || '—'}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate max-w-[150px] font-mono">
                          {p.company?.email || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-gray-700 dark:text-slate-300 font-medium">
                          {p.fromPlan ? `${p.fromPlan} → ${p.toPlan}` : p.toPlan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900 dark:text-slate-100">
                          ${Number(p.amount || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 ml-1">{p.currency}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-gray-600 dark:text-slate-400">{p.paymentMethod}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] text-gray-500 dark:text-slate-500">
                          {p.paymentReference || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${meta.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={p.status}
                          disabled={busy}
                          onChange={(e) => updateStatus(p, e.target.value)}
                          title="Change payment status"
                          className="text-[11px] rounded-lg border border-gray-200 bg-white text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          <option value="completed">Completed</option>
                          <option value="pending">Pending</option>
                          <option value="failed">Failed</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer / pagination */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-gray-400 dark:text-slate-500">
            <span>
              Showing {filtered.length} of {pagination.total} payments
            </span>
            {pagination.pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ArrowLeft className="w-3 h-3" /> Prev
                </button>
                <span>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page >= pagination.pages}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
