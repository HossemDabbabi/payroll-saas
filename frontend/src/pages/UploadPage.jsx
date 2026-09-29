import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePayroll } from '../hooks/usePayroll';
import { useAuth } from '../context/AuthContext';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  FileCheck,
  ArrowRight,
  ShieldCheck,
  Plus,
} from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_COLUMNS = [
  'Matricule',
  'Nom_Prenom',
  'Salaire_Base',
  'Taux_Horaire',
  'Heures_Retard',
  'Heures_Absence',
  'Heures_Supp',
  'Prime',
];
const PRESET_COLUMNS = ['CNSS', 'IRPP', 'Avance', 'Transport', 'Ticket_Resto'];
const MONTHS = [
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

export default function UploadPage() {
  const { user } = useAuth();
  const { uploadPayroll, uploading } = usePayroll();
  const navigate = useNavigate();
  const fileInputRef = useRef();

  const [file, setFile] = useState(null);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState(null);

  // Custom optional columns (e.g. CNSS, IRPP)
  const [customColumns, setCustomColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('payroll_custom_columns');
      return saved ? JSON.parse(saved) : ['CNSS', 'IRPP'];
    } catch {
      return ['CNSS', 'IRPP'];
    }
  });
  const [isAdding, setIsAdding] = useState(false);
  const [columnInput, setColumnInput] = useState('');

  const addColumn = (name) => {
    const val = (name || columnInput).trim().replace(/[\s\.\-]+/g, '_').toUpperCase();
    if (!val) return;
    if (!DEFAULT_COLUMNS.map(c => c.toUpperCase()).includes(val) && !customColumns.includes(val)) {
      const updated = [...customColumns, val];
      setCustomColumns(updated);
      localStorage.setItem('payroll_custom_columns', JSON.stringify(updated));
    }
    setColumnInput('');
    setIsAdding(false);
  };

  const removeColumn = (col) => {
    const updated = customColumns.filter((c) => c !== col);
    setCustomColumns(updated);
    localStorage.setItem('payroll_custom_columns', JSON.stringify(updated));
  };

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      alert('Only .xlsx, .xls, or .csv files are accepted.');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    const res = await uploadPayroll(file, month, year);
    setResult(res);
    if (res.success) {
      setTimeout(() => navigate(`/payroll/${res.data.id}`), 1400);
    }
  };

  const isStarter = user?.subscription?.plan === 'starter';
  const isTrialExpired = user?.trialInfo?.isExpired;
  const trialDays = user?.trialInfo?.daysRemaining;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
          Upload Payroll File
        </h1>
        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
          Upload your monthly Excel (.xlsx) or CSV file with employee attendance, rates, and bonuses.
        </p>
      </div>

      {/* Subscription Status Card */}
      <div
        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
          isTrialExpired
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
            : isStarter
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-950 dark:text-amber-200'
            : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isTrialExpired
                ? 'bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300'
                : isStarter
                ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold capitalize">
              {user?.subscription?.plan} Plan • Limit:{' '}
              {user?.subscription?.employeeLimit === 999999 ? 'Unlimited' : user?.subscription?.employeeLimit} Employees
            </p>
            <p className="text-[11px] opacity-85 mt-0.5">
              {isTrialExpired
                ? 'Your 7-day free trial has expired. Uploads are locked until you upgrade.'
                : isStarter
                ? `7-Day Free Trial (${trialDays !== undefined ? `${trialDays} days left` : 'Active'}). Upgrade anytime with card.`
                : 'Account active with verified card payment.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/subscription')}
          className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-current shadow-sm hover:opacity-90 flex-shrink-0 flex items-center gap-1 transition"
        >
          {isStarter ? 'Upgrade' : 'Manage'} <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Upload Form Card */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Period Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Pay Period Month
            </label>
            <select
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-blue-500 transition"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Pay Period Year
            </label>
            <select
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-blue-500 transition"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40'
              : file
              ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/40'
              : 'border-gray-200 dark:border-slate-800 hover:border-blue-400 hover:bg-gray-50/50 dark:hover:bg-slate-800/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {file ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-slate-100 text-xs">{file.name}</p>
              <p className="text-[10px] text-gray-400 dark:text-slate-400 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="mt-0.5 flex items-center gap-1 text-[11px] text-rose-500 hover:underline font-medium"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-gray-800 dark:text-slate-200 font-semibold text-xs">
                Drop your payroll file here, or <span className="text-blue-600 dark:text-blue-400 hover:underline">browse</span>
              </p>
              <p className="text-[10px] text-gray-400 dark:text-slate-400">Supports .xlsx, .xls, and .csv up to 10MB</p>
            </div>
          )}
        </div>

        {/* Expected Columns */}
        <div className="bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-gray-700 dark:text-slate-300">
              Expected Column Headers:
            </span>
            <span className="text-[10px] text-gray-400 dark:text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-blue-600" /> Case-insensitive
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Default Required & Calculated Headers */}
            {DEFAULT_COLUMNS.map((col) => (
              <span
                key={col}
                className="font-mono text-[10px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-md px-2 py-0.5 shadow-sm"
              >
                {col}
              </span>
            ))}

            {/* Custom Added Headers (e.g. CNSS, IRPP) */}
            {customColumns.map((col) => (
              <span
                key={col}
                className="inline-flex items-center gap-1 font-mono text-[10px] font-medium bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 rounded-md pl-2 pr-1 py-0.5 shadow-sm"
              >
                <span>{col}</span>
                <button
                  type="button"
                  onClick={() => removeColumn(col)}
                  className="hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded p-0.5 text-blue-500 hover:text-rose-500 transition cursor-pointer"
                  title={`Remove ${col} column`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}

            {/* Interactive "+ Add" Button */}
            <button
              type="button"
              onClick={() => setIsAdding(!isAdding)}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 border border-dashed border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-md px-2.5 py-0.5 transition cursor-pointer shadow-sm"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>

          {/* Quick Suggestions & Custom Input Box */}
          {isAdding && (
            <div className="mt-3 pt-2.5 border-t border-gray-200/70 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">
                  Quick Add:
                </span>
                {PRESET_COLUMNS.filter((p) => !customColumns.includes(p)).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => addColumn(preset)}
                    className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-white dark:bg-slate-700/80 border border-gray-200 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type column name (e.g. CNSS, IRPP, Avance)..."
                  value={columnInput}
                  onChange={(e) => setColumnInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addColumn();
                    }
                  }}
                  className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => addColumn()}
                  disabled={!columnInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-[11px] font-semibold px-3 py-1 rounded-lg transition"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setColumnInput('');
                  }}
                  className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 px-2 py-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!file || uploading || isTrialExpired}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-2.5 rounded-xl transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
              <span>Calculating Deductions &amp; Net Salaries...</span>
            </>
          ) : (
            <>
              <FileCheck className="w-3.5 h-3.5" />
              <span>Process Payroll Batch</span>
            </>
          )}
        </button>
      </form>

      {/* Result Status Card */}
      {result && (
        <div
          className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border shadow-sm ${
            result.success
              ? 'border-emerald-300 dark:border-emerald-800'
              : 'border-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {result.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span className="font-bold text-xs text-gray-900 dark:text-slate-100">
              {result.success ? 'Payroll Batch Processed Successfully!' : 'Processing Error'}
            </span>
          </div>
          {result.success && result.data && (
            <div className="text-xs text-gray-600 dark:text-slate-300 space-y-0.5">
              <p>
                Employees: <span className="font-bold text-gray-900 dark:text-slate-100">{result.data.summary.totalEmployees}</span>
              </p>
              <p>
                Net Payout: <span className="font-bold text-gray-900 dark:text-slate-100">{result.data.summary.totalNetPayout.toLocaleString()} TND</span>
              </p>
              <p className="text-blue-600 dark:text-blue-400 pt-1 text-[11px]">Redirecting to statement...</p>
            </div>
          )}
          {!result.success && <p className="text-xs text-rose-600 font-medium">{result.error}</p>}
        </div>
      )}
    </div>
  );
}
