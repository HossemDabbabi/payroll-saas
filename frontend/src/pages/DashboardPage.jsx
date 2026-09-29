import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePayroll } from '../hooks/usePayroll';
import { useAuth } from '../context/AuthContext';
import { copilotAPI } from '../services/api';
import PayrollCopilotCard from '../components/payroll/PayrollCopilotCard';
import {
  Users,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Upload,
  FileText,
  Calendar,
  ChevronDown,
  Plus,
  Download,
  Eye,
  Trash2,
  Clock,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Paperclip,
  Mic,
  Maximize2,
  MoreVertical,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { dashboardStats, fetchDashboardStats, records, fetchRecords, deleteRecord, downloadExcel, loading } =
    usePayroll();

  useEffect(() => {
    fetchDashboardStats();
    fetchRecords({ limit: 5 });
  }, []);

  const monthLabels = dashboardStats?.monthlyData?.map((d) => MONTH_NAMES[d.month - 1]) || [];
  const netPayoutData = dashboardStats?.monthlyData?.map((d) => d.totalNetPayout) || [];
  const deductionData =
    dashboardStats?.monthlyData?.map((d) => d.totalLateDeductions + d.totalAbsenceDeductions) || [];

  const chartData = {
    labels: monthLabels.length ? monthLabels : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Net Payout (TND)',
        data: netPayoutData.length ? netPayoutData : [0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(59, 130, 246, 0.85)',
        hoverBackgroundColor: '#2563eb',
        borderRadius: 6,
        barThickness: 14,
      },
      {
        label: 'Deductions (TND)',
        data: deductionData.length ? deductionData : [0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(239, 68, 68, 0.75)',
        hoverBackgroundColor: '#dc2626',
        borderRadius: 6,
        barThickness: 14,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { size: 10, family: 'Inter' },
          color: '#94a3b8',
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 11, weight: 'bold' },
        bodyFont: { size: 10 },
        padding: 8,
        cornerRadius: 6,
        callbacks: {
          label: (context) => ` ${context.dataset.label}: ${context.parsed.y.toLocaleString()} TND`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false },
        ticks: { font: { size: 9 }, color: '#94a3b8' },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10, weight: '500' }, color: '#94a3b8' },
      },
    },
  };

  const totals = dashboardStats?.totals;
  const plan = user?.subscription?.plan || 'starter';
  const isTrial = plan === 'starter';
  const trialDays = user?.trialInfo?.daysRemaining;

  return (
    <div className="space-y-5">
      {/* Top Bar: Title & Filters (Reduced font & compact sizing) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
            Dashboard
          </h1>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
            Welcome back, <span className="font-semibold text-gray-700 dark:text-slate-300">{user?.companyName}</span> • Payroll analytics
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Date Filter */}
          <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-700 dark:text-slate-300 shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-slate-400" />
            <span>Jan 1, 2026 - Dec 31, 2026</span>
          </div>

          {/* Range Selector */}
          <div className="flex items-center space-x-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-700 dark:text-slate-300 shadow-sm">
            <span>Year {dashboardStats?.year || 2026}</span>
            <ChevronDown className="w-3 h-3 text-gray-400 dark:text-slate-400" />
          </div>

          {/* Add / Upload Button */}
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
            <span>New Payroll</span>
          </button>

          {/* Export Button */}
          <button
            onClick={() => navigate('/payroll')}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-medium transition shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>All Records</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row (Compact Shopeers 4-Card Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Annual Payout */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm relative transition hover:border-gray-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Total Net Payout</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
              {totals ? `${totals.totalPayout.toLocaleString()}` : '0'}{' '}
              <span className="text-xs font-semibold text-gray-400 dark:text-slate-500">TND</span>
            </h3>
            <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> Active
            </span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1.5">Annual salary distribution</p>
        </div>

        {/* Card 2: Total Deductions */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm relative transition hover:border-gray-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Penalties Deducted</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
              {totals ? `${totals.totalDeductions.toLocaleString()}` : '0'}{' '}
              <span className="text-xs font-semibold text-gray-400 dark:text-slate-500">TND</span>
            </h3>
            <span className="inline-flex items-center text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
              <ArrowDown className="w-2.5 h-2.5 mr-0.5" /> Late + Abs
            </span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1.5">Deducted from gross base</p>
        </div>

        {/* Card 3: Overtime Bonuses */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm relative transition hover:border-gray-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Overtime Bonuses</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
              {totals ? `${totals.totalOvertimeBonus.toLocaleString()}` : '0'}{' '}
              <span className="text-xs font-semibold text-gray-400 dark:text-slate-500">TND</span>
            </h3>
            <span className="inline-flex items-center text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">
              +25% Extra
            </span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1.5">1.25x statutory hourly rate</p>
        </div>

        {/* Card 4: Employee Limit */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm relative transition hover:border-gray-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Employee Capacity</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
              {user?.subscription?.employeeLimit === 999999 ? 'Unlimited' : user?.subscription?.employeeLimit}
            </h3>
            <span className="inline-flex items-center text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full capitalize">
              {plan}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1.5">
            {isTrial ? `${trialDays ?? 7}d left in free trial` : 'Active paid subscription'}
          </p>
        </div>
      </div>

      {/* Middle Section: Chart & Activity (Reduced font, compact) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Total Payroll Chart Section */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-0.5">
                Monthly Payroll Payout
              </h4>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {totals ? `${totals.totalPayout.toLocaleString()} TND` : '$0 TND'}
                </span>
                <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> Active Period
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/upload')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
            >
              Upload Batch &rarr;
            </button>
          </div>

          {/* Bar Chart */}
          <div className="relative h-56 w-full mt-2">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
              </div>
            ) : monthLabels.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 text-xs">
                <FileText className="w-8 h-8 mb-2 opacity-30" />
                <p>No payroll data uploaded yet.</p>
                <button
                  onClick={() => navigate('/upload')}
                  className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  Upload your first file
                </button>
              </div>
            ) : (
              <Bar data={chartData} options={chartOptions} />
            )}
          </div>

          {/* Breakdown Legend Footer */}
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[11px] text-gray-400 dark:text-slate-500 block mb-0.5">Net Pay</span>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-gray-900 dark:text-slate-100">
                  {totals ? `${totals.totalPayout.toLocaleString()}` : '0'} TND
                </span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">Disbursed</span>
              </div>
            </div>
            <div>
              <span className="text-[11px] text-gray-400 dark:text-slate-500 block mb-0.5">Bonuses</span>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-gray-900 dark:text-slate-100">
                  {totals ? `${totals.totalOvertimeBonus.toLocaleString()}` : '0'} TND
                </span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">Overtime</span>
              </div>
            </div>
            <div>
              <span className="text-[11px] text-gray-400 dark:text-slate-500 block mb-0.5">Deductions</span>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-gray-900 dark:text-slate-100">
                  {totals ? `${totals.totalDeductions.toLocaleString()}` : '0'} TND
                </span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">Penalties</span>
              </div>
            </div>
          </div>

          {/* Progress bar segments */}
          <div className="w-full h-1 bg-gray-100 dark:bg-slate-800 rounded-full flex overflow-hidden mt-2.5">
            <div className="bg-blue-600 h-full w-[70%]" title="Net Salary"></div>
            <div className="bg-emerald-500 h-full w-[20%]" title="Overtime Bonus"></div>
            <div className="bg-rose-400 h-full w-[10%]" title="Deductions"></div>
          </div>
        </div>

        {/* Activity Distribution Column */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-900 dark:text-slate-100">Payroll Cycle Activity</h4>
            <button
              onClick={() => navigate('/payroll')}
              className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-300"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bar Chart Representation */}
          <div className="flex items-end justify-between h-40 pt-4 px-1">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'].map((m, idx) => {
              const isActive = idx === 2;
              const heights = [35, 48, 85, 40, 55, 60, 50];
              return (
                <div key={m} className="flex flex-col items-center space-y-1.5 relative">
                  {isActive && (
                    <span className="absolute -top-6 text-[9px] font-bold bg-gray-900 dark:bg-slate-800 text-white px-1.5 py-0.5 rounded shadow">
                      {totals ? `${(totals.totalPayout / 1000).toFixed(0)}k` : '30k'}
                    </span>
                  )}
                  <div
                    style={{ height: `${heights[idx]}%` }}
                    className={`w-5 rounded-md transition-all ${
                      isActive
                        ? 'bg-blue-600 shadow-sm shadow-blue-200'
                        : 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700'
                    }`}
                  ></div>
                  <span
                    className={`text-[10px] font-medium ${
                      isActive ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-400 dark:text-slate-500'
                    }`}
                  >
                    {m}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400">
            <span>Cycle: Monthly end</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 100% Calculated
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Batches Table & Side Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Payroll Batches Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xs font-semibold text-gray-900 dark:text-slate-100">
                Recent Payroll Batches
              </h4>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">Calculated employee compensation statements</p>
            </div>
            <button
              onClick={() => navigate('/payroll')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              View all
            </button>
          </div>

          <div className="overflow-x-auto">
            {records.length === 0 ? (
              <div className="py-10 text-center text-gray-400 dark:text-slate-500 text-xs">
                No payroll records found. Upload your first batch!
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-400 dark:text-slate-500 border-b border-gray-100 dark:border-slate-800 pb-2">
                    <th className="pb-2.5 font-medium uppercase tracking-wider text-[10px]">Period</th>
                    <th className="pb-2.5 font-medium uppercase tracking-wider text-[10px]">Employees</th>
                    <th className="pb-2.5 font-medium uppercase tracking-wider text-[10px]">Total Net Pay</th>
                    <th className="pb-2.5 font-medium uppercase tracking-wider text-[10px]">Status</th>
                    <th className="pb-2.5 font-medium uppercase tracking-wider text-right text-[10px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800 text-gray-700 dark:text-slate-200">
                  {records.slice(0, 5).map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 font-semibold text-gray-900 dark:text-slate-100 flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span>
                            {MONTH_NAMES[r.period.month - 1]} {r.period.year}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-gray-600 dark:text-slate-400 font-medium">
                        {r.summary.totalEmployees} staff
                      </td>
                      <td className="py-3 font-bold text-gray-900 dark:text-slate-100">
                        {r.summary.totalNetPayout.toLocaleString()} TND
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full capitalize">
                          {r.status || 'Completed'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => navigate(`/payroll/${r._id}`)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/60 text-blue-600 dark:text-blue-400 transition"
                            title="View statement"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => downloadExcel(r._id)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 transition"
                            title="Download Excel"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Widgets Column */}
        <div className="space-y-5">
          {/* Accuracy Gauge Widget */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-900 dark:text-slate-100">
                Statutory Formula Accuracy
              </h4>
              <button className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-300">
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Gauge */}
            <div className="flex flex-col items-center justify-center my-3">
              <div className="relative w-40 h-20 overflow-hidden flex items-end justify-center">
                <div className="absolute w-40 h-40 rounded-full border-[8px] border-emerald-400/20 border-t-emerald-500 border-r-emerald-500 box-border rotate-[-45deg]"></div>
                <div className="absolute text-center bottom-0">
                  <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">99.8%</span>
                </div>
              </div>
              <span className="text-[11px] text-gray-400 dark:text-slate-500 mt-1.5">
                Zero rounding discrepancy
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 text-center">
              <button
                onClick={() => navigate('/upload')}
                className="px-3 py-1.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs font-medium rounded-xl transition border border-gray-200 dark:border-slate-700 w-full"
              >
                Inspect Calculations
              </button>
            </div>
          </div>

          {/* Embedded Payroll Copilot AI Card */}
          <PayrollCopilotCard totalPayout={totals?.totalPayout} recordCount={records.length} />
        </div>
      </div>
    </div>
  );
}
