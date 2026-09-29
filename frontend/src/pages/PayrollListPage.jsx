import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePayroll } from '../hooks/usePayroll';
import {
  Eye,
  Trash2,
  Download,
  Calendar,
  Loader2,
  Plus,
  FileSpreadsheet,
  FileText,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function PayrollListPage() {
  const navigate = useNavigate();
  const { records, loading, pagination, fetchRecords, deleteRecord, downloadExcel } = usePayroll();
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchRecords({ page });
  }, [page]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this payroll record? This action cannot be undone.'))
      return;
    setDeletingId(id);
    await deleteRecord(id);
    setDeletingId(null);
  };

  const statusBadge = (status) => {
    const isCompleted = status === 'completed';
    return (
      <span
        className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
          isCompleted
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
        }`}
      >
        {status || 'Completed'}
      </span>
    );
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">Payroll Records</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Historical payroll batches, calculated compensation, and exported payslips.
          </p>
        </div>
        <button
          onClick={() => navigate('/upload')}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition shadow-sm shadow-blue-200 dark:shadow-none self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Payroll Batch</span>
        </button>
      </div>

      {/* Table Card (Shopeers 2xl Border Style) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Calendar className="w-6 h-6 text-gray-400 dark:text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">No payroll records yet</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 mb-4">
              Upload your first monthly Excel file to calculate payroll statements.
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              Upload Payroll Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-gray-400 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800 pb-3">
                  <th className="pb-3.5 font-medium uppercase tracking-wider">Pay Period</th>
                  <th className="pb-3.5 font-medium uppercase tracking-wider">Employees</th>
                  <th className="pb-3.5 font-medium uppercase tracking-wider">Total Net Salary</th>
                  <th className="pb-3.5 font-medium uppercase tracking-wider">Penalties</th>
                  <th className="pb-3.5 font-medium uppercase tracking-wider">Overtime</th>
                  <th className="pb-3.5 font-medium uppercase tracking-wider">Status</th>
                  <th className="pb-3.5 font-medium uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800/60 text-gray-700 dark:text-slate-300">
                {records.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 font-semibold text-gray-900 dark:text-slate-100 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <span>
                          {MONTH_NAMES[r.period.month - 1]} {r.period.year}
                        </span>
                        <span className="block text-[11px] font-normal text-gray-400 dark:text-slate-500">
                          {r.originalFileName || r.fileName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 text-gray-600 dark:text-slate-400 font-medium">{r.summary.totalEmployees} staff</td>
                    <td className="py-3.5 font-bold text-gray-900 dark:text-slate-100 text-sm">
                      {r.summary.totalNetPayout.toLocaleString()} TND
                    </td>
                    <td className="py-3.5 text-rose-600 dark:text-rose-400 font-medium">
                      {(r.summary.totalLateDeductions + r.summary.totalAbsenceDeductions).toLocaleString()} TND
                    </td>
                    <td className="py-3.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      {r.summary.totalOvertimeBonus.toLocaleString()} TND
                    </td>
                    <td className="py-3.5">{statusBadge(r.status)}</td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => navigate(`/payroll/${r._id}`)}
                          className="p-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/60 text-blue-600 dark:text-blue-400 transition"
                          title="View Statement & Payslips"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            downloadExcel(
                              r._id,
                              `Payroll_${MONTH_NAMES[r.period.month - 1]}_${r.period.year}.xlsx`
                            )
                          }
                          className="p-1.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 transition"
                          title="Download Excel Summary"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r._id)}
                          disabled={deletingId === r._id}
                          className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-500 dark:text-rose-400 disabled:opacity-40 transition"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 pt-4 mt-2 border-t border-gray-100 dark:border-slate-800">
            <span>
              Showing {records.length} of {pagination.total} records
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium disabled:opacity-40 transition"
              >
                Previous
              </button>
              <span className="font-semibold text-gray-700 dark:text-slate-200">
                Page {page} of {pagination.pages}
              </span>
              <button
                disabled={page === pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
