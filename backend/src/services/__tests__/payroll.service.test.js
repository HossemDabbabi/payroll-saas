const { calculateTunisianTax, calculateEmployeePayroll, parseAndCalculatePayroll } = require('../payroll.service');

describe('Tunisian Payroll Tax Calculation', () => {
  test('calculateTunisianTax computes correct CNSS, IRPP, and Net Salary for 1000 TND Gross', () => {
    const result = calculateTunisianTax(1000, 0);
    expect(result.cnss).toBe(91.8);
    expect(result.irpp).toBe(104.185);
    expect(result.netSalary).toBe(804.015);
  });

  test('calculateTunisianTax computes correct progressive IRPP for higher bracket (> 20000 TND annual)', () => {
    const result = calculateTunisianTax(3000, 0);
    // Gross: 3000 TND
    // CNSS (9.18%): 275.4 TND
    // Net Taxable Monthly: 2724.6 TND
    // Annual Base: 32695.2 TND
    // Allowance (10% capped at 2000): 2000 TND
    // Taxable Annual Income: 30695.2 TND
    // Brackets:
    //   > 30000: (30695.2 - 30000) * 0.32 = 695.2 * 0.32 = 222.464
    //   20000 - 30000: (30000 - 20000) * 0.28 = 2800
    //   5000 - 20000: (20000 - 5000) * 0.26 = 3900
    // Total Annual IRPP: 6922.464 TND
    // Monthly IRPP: 576.872 TND
    // Net Salary: 3000 - 275.4 - 576.872 = 2147.728 TND
    expect(result.cnss).toBe(275.4);
    expect(result.irpp).toBe(576.872);
    expect(result.netSalary).toBe(2147.728);
  });

  test('calculateEmployeePayroll handles gross earnings and applies statutory CNSS & IRPP', () => {
    const row = {
      Matricule: 'EMP-001',
      Nom_Prenom: 'Ahmed Ben Ali',
      Salaire_Base: 2000,
      Taux_Horaire: 10,
      Heures_Retard: 1,
      Heures_Absence: 0,
      Heures_Supp: 4,
      Prime: 150,
      CNSS: 0,
      IRPP: 0,
      Avance: 0,
    };

    const emp = calculateEmployeePayroll(row, 2);
    expect(emp.matricule).toBe('EMP-001');
    expect(emp.nom_prenom).toBe('Ahmed Ben Ali');
    expect(emp.late_deduction).toBe(10);
    expect(emp.overtime_bonus).toBe(50); // 4 * 10 * 1.25
    // Gross = 2000 + 150 + 50 - 10 = 2190 TND
    const expectedTax = calculateTunisianTax(2190, 0);
    expect(emp.cnss).toBe(expectedTax.cnss);
    expect(emp.irpp).toBe(expectedTax.irpp);
    expect(emp.net_salary).toBe(expectedTax.netSalary);
  });
});
