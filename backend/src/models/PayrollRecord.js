const mongoose = require('mongoose');

const employeePayrollSchema = new mongoose.Schema({
  matricule: { type: String, required: true },
  nom_prenom: { type: String, required: true },
  salaire_base: { type: Number, required: true, min: 0 },
  taux_horaire: { type: Number, required: true, min: 0 },
  heures_retard: { type: Number, default: 0, min: 0 },
  heures_absence: { type: Number, default: 0, min: 0 },
  heures_supp: { type: Number, default: 0, min: 0 },
  prime: { type: Number, default: 0, min: 0 },

  // Optional custom deductions / contributions
  cnss: { type: Number, default: 0 },
  irpp: { type: Number, default: 0 },
  avance: { type: Number, default: 0 },

  // Calculated fields
  late_deduction: { type: Number, default: 0 },
  absence_deduction: { type: Number, default: 0 },
  overtime_bonus: { type: Number, default: 0 },
  net_salary: { type: Number, default: 0 },

  // Row-level errors
  errors: [String],
  hasErrors: { type: Boolean, default: false },
}, { _id: false, suppressReservedKeysWarning: true });

const payrollRecordSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  period: {
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
  },
  fileName: { type: String, required: true },
  originalFileName: String,
  employees: [employeePayrollSchema],
  summary: {
    totalEmployees: { type: Number, default: 0 },
    totalNetPayout: { type: Number, default: 0 },
    totalLateDeductions: { type: Number, default: 0 },
    totalAbsenceDeductions: { type: Number, default: 0 },
    totalOvertimeBonus: { type: Number, default: 0 },
    totalPrimes: { type: Number, default: 0 },
    totalCnss: { type: Number, default: 0 },
    totalIrpp: { type: Number, default: 0 },
    totalAvance: { type: Number, default: 0 },
    rowsWithErrors: { type: Number, default: 0 },
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
  },
  processingErrors: [String],
}, {
  timestamps: true,
});

payrollRecordSchema.index({ company: 1, 'period.year': -1, 'period.month': -1 });
payrollRecordSchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model('PayrollRecord', payrollRecordSchema);
