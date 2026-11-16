const { calculateTunisianTax, calculateEmployeePayroll } = require('../../services/payroll.service');

// ─── Edge Cases for calculateTunisianTax ─────────────────────────────────────

describe('calculateTunisianTax — edge cases', () => {
  test('handles zero gross salary correctly (no CNSS, no IRPP)', () => {
    const result = calculateTunisianTax(0, 0);
    expect(result.cnss).toBe(0);
    expect(result.irpp).toBe(0);
    expect(result.netSalary).toBe(0);
  });

  test('applies 26% IRPP bracket for income 5000–20000 TND annually', () => {
    // Gross: 2000 TND
    // CNSS: 2000 * 0.0918 = 183.6 TND
    // Net taxable monthly: 2000 - 183.6 = 1816.4
    // Annual base: 1816.4 * 12 = 21796.8
    // Allowance: min(21796.8 * 0.1, 2000) = 2000
    // Taxable annual: 21796.8 - 2000 = 19796.8
    // IRPP annual: (19796.8 - 5000) * 0.26 = 14796.8 * 0.26 = 3847.168
    // Monthly IRPP: 3847.168 / 12 = 320.597...
    const result = calculateTunisianTax(2000, 0);
    expect(result.cnss).toBeCloseTo(183.6, 2);
    expect(result.irpp).toBeGreaterThan(0);
    expect(result.netSalary).toBeLessThan(2000);
    expect(result.netSalary).toBeGreaterThan(0);
  });

  test('applies highest 35% IRPP bracket for income above 50000 TND annually', () => {
    // Very high salary — should hit the 35% bracket
    const result = calculateTunisianTax(10000, 0);
    expect(result.cnss).toBeCloseTo(10000 * 0.0918, 2);
    expect(result.irpp).toBeGreaterThan(0);
    expect(result.netSalary).toBeGreaterThan(0);
    expect(result.netSalary).toBeLessThan(10000);
  });

  test('deducts salary advance from net salary', () => {
    const withoutAvance = calculateTunisianTax(1500, 0);
    const withAvance = calculateTunisianTax(1500, 200);
    expect(withoutAvance.netSalary - withAvance.netSalary).toBeCloseTo(200, 2);
  });

  test('returns values rounded to 3 decimal places', () => {
    const result = calculateTunisianTax(1234.56, 0);
    const cnssStr = result.cnss.toString();
    const irppStr = result.irpp.toString();
    // No more than 3 decimal places
    if (cnssStr.includes('.')) expect(cnssStr.split('.')[1].length).toBeLessThanOrEqual(3);
    if (irppStr.includes('.')) expect(irppStr.split('.')[1].length).toBeLessThanOrEqual(3);
  });
});

// ─── Edge Cases for calculateEmployeePayroll ─────────────────────────────────

describe('calculateEmployeePayroll — edge cases', () => {
  const baseRow = {
    Matricule: 'EMP-TEST',
    Nom_Prenom: 'Test Employee',
    Salaire_Base: 1500,
    Taux_Horaire: 10,
    Heures_Retard: 0,
    Heures_Absence: 0,
    Heures_Supp: 0,
    Prime: 0,
    CNSS: 0,
    IRPP: 0,
    Avance: 0,
  };

  test('computes late deduction as heures_retard × taux_horaire', () => {
    const row = { ...baseRow, Heures_Retard: 3 };
    const result = calculateEmployeePayroll(row, 2);
    expect(result.late_deduction).toBeCloseTo(30, 3);
  });

  test('computes absence deduction as heures_absence × taux_horaire', () => {
    const row = { ...baseRow, Heures_Absence: 8 };
    const result = calculateEmployeePayroll(row, 2);
    expect(result.absence_deduction).toBeCloseTo(80, 3);
  });

  test('computes overtime bonus as heures_supp × taux_horaire × 1.25', () => {
    const row = { ...baseRow, Heures_Supp: 4 };
    const result = calculateEmployeePayroll(row, 2);
    expect(result.overtime_bonus).toBeCloseTo(50, 3);
  });

  test('uses CNSS from file when provided (non-zero)', () => {
    const row = { ...baseRow, CNSS: 150 };
    const result = calculateEmployeePayroll(row, 2);
    expect(result.cnss).toBe(150);
  });

  test('uses IRPP from file when provided (non-zero)', () => {
    const row = { ...baseRow, IRPP: 300 };
    const result = calculateEmployeePayroll(row, 2);
    expect(result.irpp).toBe(300);
  });

  test('flags a missing Matricule as an error', () => {
    const row = { ...baseRow, Matricule: '' };
    const result = calculateEmployeePayroll(row, 2);
    expect(result.hasErrors).toBe(true);
    expect(result.errors.some(e => e.includes('Matricule'))).toBe(true);
  });

  test('flags a missing Nom_Prenom as an error', () => {
    const row = { ...baseRow, Nom_Prenom: '' };
    const result = calculateEmployeePayroll(row, 2);
    expect(result.hasErrors).toBe(true);
    expect(result.errors.some(e => e.includes('Nom_Prenom'))).toBe(true);
  });

  test('warns when Salaire_Base is zero', () => {
    const row = { ...baseRow, Salaire_Base: 0 };
    const result = calculateEmployeePayroll(row, 2);
    expect(result.hasErrors).toBe(true);
    expect(result.errors.some(e => e.includes('Salaire_Base is 0'))).toBe(true);
  });

  test('falls back to UNKNOWN_N when Matricule is missing', () => {
    const row = { ...baseRow, Matricule: '' };
    const result = calculateEmployeePayroll(row, 5);
    expect(result.matricule).toBe('UNKNOWN_5');
  });

  test('net salary is positive for a normal employee record', () => {
    const result = calculateEmployeePayroll(baseRow, 2);
    expect(result.net_salary).toBeGreaterThan(0);
  });
});
