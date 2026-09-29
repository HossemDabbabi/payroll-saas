import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePayroll } from '../hooks/usePayroll';
import {
  ArrowLeft,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
  DollarSign,
  TrendingDown,
  Sparkles,
  Users,
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

export default function PayrollDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchRecord, downloadExcel, downloadPayslip, loading } = usePayroll();
  const [record, setRecord] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchRecord(id).then((r) => r && setRecord(r));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center py-20 text-gray-500 dark:text-slate-400">
        <p className="font-semibold text-sm">Payroll record not found.</p>
        <button
          onClick={() => navigate('/payroll')}
          className="mt-3 px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
        >
          Return to Records
        </button>
      </div>
    );
  }

  const { period, summary, employees = [] } = record;
  const hasCnss = employees.some((e) => e.cnss && e.cnss > 0);
  const hasIrpp = employees.some((e) => e.irpp && e.irpp > 0);
  const hasAvance = employees.some((e) => e.avance && e.avance > 0);

  const filtered = employees.filter(
    (e) =>
      e.nom_prenom.toLowerCase().includes(search.toLowerCase()) ||
      e.matricule.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Top Bar with Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/payroll')}
            className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 flex items-center justify-center text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
              {MONTH_NAMES[period.month - 1]} {period.year} Statement
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {summary.totalEmployees} employees calculated •{' '}
              <span className="font-mono text-gray-400 dark:text-slate-500">{record.originalFileName || record.fileName}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            downloadExcel(id, `Payroll_${MONTH_NAMES[period.month - 1]}_${period.year}.xlsx`)
          }
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition shadow-sm shadow-blue-200 dark:shadow-none self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Excel (.xlsx)</span>
        </button>
      </div>

      {/* 4 Summary Cards (Exact Shopeers 2xl Grid Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Total Net Payout</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-slate-100">
            {summary.totalNetPayout.toLocaleString()} <span className="text-xs text-gray-400 dark:text-slate-500 font-semibold">TND</span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Disbursed to bank accounts</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Late Deductions</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
            -{summary.totalLateDeductions.toLocaleString()} <span className="text-xs text-rose-400 dark:text-rose-500 font-semibold">TND</span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Late arrival penalties</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Absence Deductions</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
            -{summary.totalAbsenceDeductions.toLocaleString()} <span className="text-xs text-orange-400 dark:text-orange-500 font-semibold">TND</span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Absence hours deducted</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Overtime Bonuses</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            +{summary.totalOvertimeBonus.toLocaleString()} <span className="text-xs text-emerald-400 dark:text-emerald-500 font-semibold">TND</span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Calculated at 1.25x hourly</p>
        </div>
      </div>

      {/* Warnings Banner if any */}
      {summary.rowsWithErrors > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs font-medium text-amber-900 dark:text-amber-200">
            {summary.rowsWithErrors} rows had validation warnings during automated calculation. Review the highlighted items below.
          </span>
        </div>
      )}

      {/* Employee Breakdown Table (Shopeers Style) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Employee Statements &amp; Payslips</h4>
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">Line-by-line compensation details</p>
          </div>

          <div className="flex items-center w-full sm:w-64 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:border-blue-500 transition">
            <Search className="w-3.5 h-3.5 text-gray-400 dark:text-slate-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by name or matricule..."
              className="bg-transparent border-none text-xs w-full focus:outline-none text-gray-700 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-gray-400 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800 pb-3">
                <th className="pb-3 font-medium uppercase tracking-wider">Matricule</th>
                <th className="pb-3 font-medium uppercase tracking-wider">Employee Name</th>
                <th className="pb-3 font-medium uppercase tracking-wider">Base Salary</th>
                <th className="pb-3 font-medium uppercase tracking-wider">Late Ded.</th>
                <th className="pb-3 font-medium uppercase tracking-wider">Abs. Ded.</th>
                {hasCnss && <th className="pb-3 font-medium uppercase tracking-wider text-rose-500">CNSS</th>}
                {hasIrpp && <th className="pb-3 font-medium uppercase tracking-wider text-rose-500">IRPP</th>}
                {hasAvance && <th className="pb-3 font-medium uppercase tracking-wider text-rose-500">Avance</th>}
                <th className="pb-3 font-medium uppercase tracking-wider">Overtime</th>
                <th className="pb-3 font-medium uppercase tracking-wider">Prime</th>
                <th className="pb-3 font-medium uppercase tracking-wider">Net Salary</th>
                <th className="pb-3 font-medium uppercase tracking-wider text-right">PDF Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800/60 text-gray-700 dark:text-slate-300">
              {filtered.map((emp) => (
                <tr
                  key={emp.matricule}
                  className={`hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition ${
                    emp.hasErrors ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                  }`}
                >
                  <td className="py-3 font-mono font-medium text-gray-500 dark:text-slate-400">{emp.matricule}</td>
                  <td className="py-3 font-semibold text-gray-900 dark:text-slate-100">{emp.nom_prenom}</td>
                  <td className="py-3 font-medium text-gray-700 dark:text-slate-300">
                    {emp.salaire_base.toLocaleString()} TND
                  </td>
                  <td className="py-3 font-medium text-rose-500 dark:text-rose-400">
                    {emp.late_deduction > 0 ? `-${emp.late_deduction.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 font-medium text-rose-500 dark:text-rose-400">
                    {emp.absence_deduction > 0 ? `-${emp.absence_deduction.toFixed(2)}` : '—'}
                  </td>
                  {hasCnss && (
                    <td className="py-3 font-medium text-rose-500 dark:text-rose-400">
                      {emp.cnss > 0 ? `-${emp.cnss.toFixed(3)}` : '—'}
                    </td>
                  )}
                  {hasIrpp && (
                    <td className="py-3 font-medium text-rose-500 dark:text-rose-400">
                      {emp.irpp > 0 ? `-${emp.irpp.toFixed(3)}` : '—'}
                    </td>
                  )}
                  {hasAvance && (
                    <td className="py-3 font-medium text-rose-500 dark:text-rose-400">
                      {emp.avance > 0 ? `-${emp.avance.toFixed(2)}` : '—'}
                    </td>
                  )}
                  <td className="py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                    {emp.overtime_bonus > 0 ? `+${emp.overtime_bonus.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 font-medium text-emerald-600 dark:text-emerald-400">
                    {emp.prime > 0 ? `+${emp.prime.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 font-bold text-gray-900 dark:text-slate-100 text-sm">
                    {emp.net_salary.toLocaleString()} TND
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => downloadPayslip(id, emp.matricule)}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition font-semibold text-[11px]"
                      title="Download Fiche de Paie PDF"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
