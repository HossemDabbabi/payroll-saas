const XLSX = require('xlsx');
const path = require('path');

/**
 * Expected column names (case-insensitive matching).
 */
const REQUIRED_COLUMNS = ['Matricule', 'Nom_Prenom', 'Salaire_Base', 'Taux_Horaire'];
const OPTIONAL_COLUMNS = ['Heures_Retard', 'Heures_Absence', 'Heures_Supp', 'Prime', 'CNSS', 'IRPP', 'Avance'];
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

/**
 * Normalize a column header to match expected names.
 */
const normalizeHeader = (header) => {
  const cleaned = String(header).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  
  if (cleaned === 'cnss' || cleaned.includes('cnss')) return 'CNSS';
  if (cleaned === 'irpp' || cleaned.includes('irpp') || cleaned === 'impot') return 'IRPP';
  if (cleaned === 'avance' || cleaned.includes('avance')) return 'Avance';
  if (cleaned === 'nom_prenom' || cleaned === 'nom_et_prenom' || cleaned.includes('nom')) return 'Nom_Prenom';
  if (cleaned === 'salaire_base' || cleaned === 'salairebase' || cleaned === 'base') return 'Salaire_Base';
  if (cleaned === 'taux_horaire' || cleaned === 'tauxhoraire') return 'Taux_Horaire';

  return ALL_COLUMNS.find((col) => col.toLowerCase() === cleaned) || header;
};

/**
 * Safely parse a numeric value from a cell.
 * Returns the number or 0 if invalid.
 */
const safeNumber = (val, fieldName, rowErrors) => {
  if (val === null || val === undefined || val === '') {
    return 0;
  }
  if (typeof val === 'number') {
    if (isNaN(val)) return 0;
    if (val < 0) {
      rowErrors.push(`Negative value '${val}' for field '${fieldName}' — defaulting to 0.`);
      return 0;
    }
    return val;
  }

  // Handle strings with thousand separators (spaces, commas, periods) and decimal commas
  let str = String(val).trim().replace(/\s+/g, '').replace(/[^0-9.,-]/g, '');
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(str)) {
    str = str.replace(/,/g, '');
  } else if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(str)) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',') && !str.includes('.')) {
    str = str.replace(',', '.');
  } else if (str.includes(',') && str.includes('.')) {
    if (str.indexOf(',') < str.indexOf('.')) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(/\./g, '').replace(',', '.');
    }
  }

  const num = parseFloat(str);
  if (isNaN(num)) {
    rowErrors.push(`Invalid value '${val}' for field '${fieldName}' — defaulting to 0.`);
    return 0;
  }
  if (num < 0) {
    rowErrors.push(`Negative value '${val}' for field '${fieldName}' — defaulting to 0.`);
    return 0;
  }
  return num;
};

/**
 * Calculate Tunisian statutory CNSS and IRPP deductions.
 * @param {number} grossSalary - Gross Taxable Salary (Salaire Brut Imposable)
 * @param {number} avance - Salary advance (Avance sur salaire)
 * @returns {{ cnss: number, irpp: number, netSalary: number }}
 */
function calculateTunisianTax(grossSalary, avance = 0) {
  // 1. Employee CNSS Contribution (9.18%)
  const cnss = grossSalary * 0.0918;

  // 2. Net Taxable Monthly & Annual Base
  const netTaxableMonthly = grossSalary - cnss;
  const annualBase = netTaxableMonthly * 12;

  // 3. Professional Allowance (10% capped at 2000 TND/year)
  const allowance = Math.min(annualBase * 0.10, 2000);
  const taxableAnnualIncome = Math.max(0, annualBase - allowance);

  // 4. Calculate Annual IRPP Tax Brackets
  let annualIrpp = 0;
  if (taxableAnnualIncome > 50000) {
    annualIrpp += (taxableAnnualIncome - 50000) * 0.35;
    annualIrpp += (50000 - 30000) * 0.32;
    annualIrpp += (30000 - 20000) * 0.28;
    annualIrpp += (20000 - 5000) * 0.26;
  } else if (taxableAnnualIncome > 30000) {
    annualIrpp += (taxableAnnualIncome - 30000) * 0.32;
    annualIrpp += (30000 - 20000) * 0.28;
    annualIrpp += (20000 - 5000) * 0.26;
  } else if (taxableAnnualIncome > 20000) {
    annualIrpp += (taxableAnnualIncome - 20000) * 0.28;
    annualIrpp += (20000 - 5000) * 0.26;
  } else if (taxableAnnualIncome > 5000) {
    annualIrpp += (taxableAnnualIncome - 5000) * 0.26;
  }

  // 5. Monthly IRPP & Final Net Salary
  const monthlyIrpp = annualIrpp / 12;
  const netSalary = grossSalary - cnss - monthlyIrpp - avance;

  return {
    cnss: Number(cnss.toFixed(3)),
    irpp: Number(monthlyIrpp.toFixed(3)),
    netSalary: Number(netSalary.toFixed(3)),
  };
}

/**
 * Calculate payroll for a single employee row.
 */
const calculateEmployeePayroll = (row, rowIndex) => {
  const rowErrors = [];

  const matricule = row['Matricule'] ? String(row['Matricule']).trim() : null;
  const nom_prenom = row['Nom_Prenom'] ? String(row['Nom_Prenom']).trim() : null;

  if (!matricule) rowErrors.push('Missing required field: Matricule.');
  if (!nom_prenom) rowErrors.push('Missing required field: Nom_Prenom.');

  const salaire_base = safeNumber(row['Salaire_Base'], 'Salaire_Base', rowErrors);
  const taux_horaire = safeNumber(row['Taux_Horaire'], 'Taux_Horaire', rowErrors);
  const heures_retard = safeNumber(row['Heures_Retard'], 'Heures_Retard', rowErrors);
  const heures_absence = safeNumber(row['Heures_Absence'], 'Heures_Absence', rowErrors);
  const heures_supp = safeNumber(row['Heures_Supp'], 'Heures_Supp', rowErrors);
  const prime = safeNumber(row['Prime'], 'Prime', rowErrors);

  // Optional custom deductions / avance
  const cnssInFile = safeNumber(row['CNSS'], 'CNSS', rowErrors);
  const irppInFile = safeNumber(row['IRPP'], 'IRPP', rowErrors);
  const avance = safeNumber(row['Avance'], 'Avance', rowErrors);

  if (salaire_base === 0 && !rowErrors.some(e => e.includes('Salaire_Base'))) {
    rowErrors.push('Warning: Salaire_Base is 0.');
  }

  // Payroll formulas
  const late_deduction = parseFloat((heures_retard * taux_horaire).toFixed(3));
  const absence_deduction = parseFloat((heures_absence * taux_horaire).toFixed(3));
  const overtime_bonus = parseFloat((heures_supp * taux_horaire * 1.25).toFixed(3));

  // Gross Taxable Salary (Salaire Brut Imposable)
  const gross_salary = parseFloat(
    (salaire_base + prime + overtime_bonus - late_deduction - absence_deduction).toFixed(3)
  );

  // Tunisian statutory tax calculation
  const taxCalculated = calculateTunisianTax(Math.max(0, gross_salary), avance);

  const cnss = cnssInFile > 0 ? cnssInFile : taxCalculated.cnss;
  const irpp = irppInFile > 0 ? irppInFile : taxCalculated.irpp;
  const net_salary = parseFloat(
    (gross_salary - cnss - irpp - avance).toFixed(3)
  );

  return {
    matricule: matricule || `UNKNOWN_${rowIndex}`,
    nom_prenom: nom_prenom || `Employee ${rowIndex}`,
    salaire_base,
    taux_horaire,
    heures_retard,
    heures_absence,
    heures_supp,
    prime,
    cnss,
    irpp,
    avance,
    late_deduction,
    absence_deduction,
    overtime_bonus,
    net_salary,
    errors: rowErrors,
    hasErrors: rowErrors.length > 0,
  };
};

/**
 * Parse an uploaded payroll file (Excel or CSV) and compute payroll.
 * @param {string} filePath - Absolute path to the uploaded file.
 * @returns {{ employees: Array, summary: Object, parseErrors: Array }}
 */
const parseAndCalculatePayroll = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  let workbook;

  try {
    const readOptions = { type: 'file', raw: true };
    workbook = XLSX.readFile(filePath, raw);
  } catch (err) {
    try {
      workbook = XLSX.readFile(filePath);
    } catch (err2) {
      throw new Error(`Failed to read file: ${err.message}`);
    }
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: true });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('The uploaded file is empty or contains no data rows.');
  }

  // Normalize column headers
  const normalizedRows = rawRows.map((row) => {
    const normalized = {};
    for (const key of Object.keys(row)) {
      normalized[normalizeHeader(key)] = row[key];
    }
    return normalized;
  });

  // Validate required columns exist
  const sampleRow = normalizedRows[0];
  const missingRequired = REQUIRED_COLUMNS.filter((col) => !(col in sampleRow));
  if (missingRequired.length > 0) {
    throw new Error(`Missing required columns: ${missingRequired.join(', ')}. Please check your file format.`);
  }

  // Process each employee row
  const parseErrors = [];
  const employees = normalizedRows.map((row, index) => {
    const result = calculateEmployeePayroll(row, index + 2); // +2 for 1-indexed + header
    if (result.hasErrors) {
      parseErrors.push({ row: index + 2, errors: result.errors });
    }
    return result;
  });

  // Compute summary
  const summary = employees.reduce((acc, emp) => {
    acc.totalEmployees += 1;
    acc.totalNetPayout += emp.net_salary;
    acc.totalLateDeductions += emp.late_deduction;
    acc.totalAbsenceDeductions += emp.absence_deduction;
    acc.totalOvertimeBonus += emp.overtime_bonus;
    acc.totalPrimes += emp.prime;
    acc.totalCnss += emp.cnss;
    acc.totalIrpp += emp.irpp;
    acc.totalAvance += emp.avance;
    if (emp.hasErrors) acc.rowsWithErrors += 1;
    return acc;
  }, {
    totalEmployees: 0,
    totalNetPayout: 0,
    totalLateDeductions: 0,
    totalAbsenceDeductions: 0,
    totalOvertimeBonus: 0,
    totalPrimes: 0,
    totalCnss: 0,
    totalIrpp: 0,
    totalAvance: 0,
    rowsWithErrors: 0,
  });

  // Round summary values
  Object.keys(summary).forEach((key) => {
    if (typeof summary[key] === 'number') {
      summary[key] = parseFloat(summary[key].toFixed(3));
    }
  });

  return { employees, summary, parseErrors };
};

module.exports = { parseAndCalculatePayroll, calculateTunisianTax, calculateEmployeePayroll };
