const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  parseAndCalculatePayroll,
  calculateTunisianTax,
  calculateEmployeePayroll,
} = require('../src/services/payroll.service');

// ---------- Helpers ----------
const baseRow = (overrides = {}) => ({
  Matricule: 'E001',
  Nom_Prenom: 'Ali Ben Salah',
  Salaire_Base: 1000,
  Taux_Horaire: 10,
  ...overrides,
});

const HEADER =
  'Matricule,Nom_Prenom,Salaire_Base,Taux_Horaire,Heures_Retard,Heures_Absence,Heures_Supp,Prime';

let tmpDir;
beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'payroll-'));
});
afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const writeCsv = (name, lines) => {
  const p = path.join(tmpDir, name);
  fs.writeFileSync(p, lines.join('\n'));
  return p;
};

// ---------- 1. Formules (fonctionnel) ----------
describe('calculateEmployeePayroll - formules', () => {
  test('retard: 2h x 10 = 20', () => {
    const r = calculateEmployeePayroll(baseRow({ Heures_Retard: 2 }), 2);
    expect(r.late_deduction).toBeCloseTo(20, 3);
  });

  test('absence: 3h x 10 = 30', () => {
    const r = calculateEmployeePayroll(baseRow({ Heures_Absence: 3 }), 2);
    expect(r.absence_deduction).toBeCloseTo(30, 3);
  });

  test('overtime: 4h x 10 x 1.25 = 50', () => {
    const r = calculateEmployeePayroll(baseRow({ Heures_Supp: 4 }), 2);
    expect(r.overtime_bonus).toBeCloseTo(50, 3);
  });

  test('salaire bas (500): irpp = 0, net = 500 - CNSS(45.9) = 454.1', () => {
    const r = calculateEmployeePayroll(baseRow({ Salaire_Base: 500 }), 2);
    expect(r.cnss).toBeCloseTo(45.9, 3);
    expect(r.irpp).toBe(0);
    expect(r.net_salary).toBeCloseTo(454.1, 3);
  });

  test('avance (50) tetna7a mel net', () => {
    const r = calculateEmployeePayroll(baseRow({ Salaire_Base: 500, Avance: 50 }), 2);
    expect(r.net_salary).toBeCloseTo(404.1, 3);
  });

  test("CNSS fil fichier (100) yتغلب 3la el calcul automatique", () => {
    const r = calculateEmployeePayroll(baseRow({ CNSS: 100 }), 2);
    expect(r.cnss).toBe(100);
  });

  test('prime tetzed lel brut', () => {
    const a = calculateEmployeePayroll(baseRow({ Prime: 0 }), 2);
    const b = calculateEmployeePayroll(baseRow({ Prime: 100 }), 2);
    expect(b.net_salary).toBeGreaterThan(a.net_salary);
  });
});

// ---------- 2. Tranches IRPP ----------
describe('calculateTunisianTax', () => {
  test('brut = 0 → tout 0', () => {
    expect(calculateTunisianTax(0)).toEqual({ cnss: 0, irpp: 0, netSalary: 0 });
  });

  test('brut = 3000 (tranche 32%): valeurs calculées 3al 9alam', () => {
    const r = calculateTunisianTax(3000);
    expect(r.cnss).toBeCloseTo(275.4, 3);
    expect(r.irpp).toBeCloseTo(576.872, 3);
    expect(r.netSalary).toBeCloseTo(2147.728, 3);
  });

  test('propriété: net yزid kol ma brut yزid (ma3andouch yنقص)', () => {
    let prev = -Infinity;
    for (let g = 0; g <= 20000; g += 250) {
      const { netSalary } = calculateTunisianTax(g);
      expect(netSalary).toBeGreaterThanOrEqual(prev);
      prev = netSalary;
    }
  });
});

// ---------- 3. Boundary ----------
describe('boundary', () => {
  test('tout zero → ma yetla3ch NaN', () => {
    const r = calculateEmployeePayroll(
      baseRow({ Salaire_Base: 0, Taux_Horaire: 0 }),
      2
    );
    expect(Number.isNaN(r.net_salary)).toBe(false);
    expect(r.errors.some((e) => e.includes('Salaire_Base is 0'))).toBe(true);
  });

  test('valeur décimale (7.5h)', () => {
    const r = calculateEmployeePayroll(baseRow({ Heures_Retard: 7.5 }), 2);
    expect(r.late_deduction).toBeCloseTo(75, 3);
  });

  test('valeur énorme ma tkassarch el calcul', () => {
    const r = calculateEmployeePayroll(baseRow({ Salaire_Base: 1e9 }), 2);
    expect(Number.isFinite(r.net_salary)).toBe(true);
  });

  test('format "1 234,50" yetfahem 1234.5', () => {
    const r = calculateEmployeePayroll(baseRow({ Salaire_Base: '1 234,50' }), 2);
    expect(r.salaire_base).toBeCloseTo(1234.5, 3);
  });

  test('virgule décimale "7,5"', () => {
    const r = calculateEmployeePayroll(baseRow({ Taux_Horaire: '7,5' }), 2);
    expect(r.taux_horaire).toBeCloseTo(7.5, 3);
  });
});

// ---------- 4. Négatifs ----------
describe('cas négatifs', () => {
  test('valeur négative → 0 + erreur', () => {
    const r = calculateEmployeePayroll(baseRow({ Heures_Retard: -5 }), 2);
    expect(r.heures_retard).toBe(0);
    expect(r.hasErrors).toBe(true);
    expect(r.errors.join(' ')).toMatch(/Negative/);
  });

  test('texte fi blast raqm → 0 + erreur', () => {
    const r = calculateEmployeePayroll(baseRow({ Salaire_Base: 'abc' }), 2);
    expect(r.salaire_base).toBe(0);
    expect(r.errors.join(' ')).toMatch(/Invalid value/);
  });

  test('Matricule na9es → UNKNOWN_<row> + erreur', () => {
    const r = calculateEmployeePayroll(baseRow({ Matricule: '' }), 5);
    expect(r.matricule).toBe('UNKNOWN_5');
    expect(r.hasErrors).toBe(true);
  });

  test('Nom_Prenom na9es → erreur', () => {
    const r = calculateEmployeePayroll(baseRow({ Nom_Prenom: '' }), 2);
    expect(r.errors.join(' ')).toMatch(/Nom_Prenom/);
  });
});

// ---------- 5. Parsing fichier ----------
describe('parseAndCalculatePayroll', () => {
  test('CSV s7i7 → 2 employés + summary', () => {
    const f = writeCsv('ok.csv', [
      HEADER,
      'E001,Ali Ben Salah,1000,10,2,0,4,0',
      'E002,Sara Trabelsi,500,5,0,0,0,0',
    ]);
    const { employees, summary, parseErrors } = parseAndCalculatePayroll(f);
    expect(employees).toHaveLength(2);
    expect(summary.totalEmployees).toBe(2);
    expect(summary.totalLateDeductions).toBeCloseTo(20, 3);
    expect(summary.totalOvertimeBonus).toBeCloseTo(50, 3);
    expect(employees[1].net_salary).toBeCloseTo(454.1, 3);
    expect(parseErrors).toHaveLength(0);
  });

  test('colonne obligatoire na9sa (Matricule) → erreur', () => {
    const f = writeCsv('nomat.csv', [
      'Nom_Prenom,Salaire_Base,Taux_Horaire',
      'Ali,1000,10',
    ]);
    expect(() => parseAndCalculatePayroll(f)).toThrow(/Missing required columns: Matricule/);
  });

  test('fichier avec header brk (bla données) → erreur', () => {
    const f = writeCsv('headeronly.csv', [HEADER]);
    expect(() => parseAndCalculatePayroll(f)).toThrow(/empty/i);
  });

  test('fichier vide → erreur', () => {
    const f = writeCsv('empty.csv', ['']);
    expect(() => parseAndCalculatePayroll(f)).toThrow();
  });

  test('noms de colonnes en minuscules / avec espaces yetقبلou', () => {
    const f = writeCsv('lower.csv', [
      'matricule, nom prenom ,salaire base,taux horaire',
      'E001,Ali,1000,10',
    ]);
    const { employees } = parseAndCalculatePayroll(f);
    expect(employees[0].matricule).toBe('E001');
    expect(employees[0].salaire_base).toBe(1000);
  });

  test('ligne mta3 valeur négative tطلع fi parseErrors b numéro ligne s7i7', () => {
    const f = writeCsv('neg.csv', [HEADER, 'E001,Ali,1000,10,-3,0,0,0']);
    const { parseErrors } = parseAndCalculatePayroll(f);
    expect(parseErrors[0].row).toBe(2);
  });
});

// ---------- 6. BUGS CONNUS (test.failing) ----------
// test.failing = "le test DOIT échouer". Kif developer ysala7 el bug,
// el test yetla3 rouge → tbaddlou l test() 3adi.
describe('BUGS CONNUS (a corriger par les devs)', () => {
  test.failing('BUG1: fichier mouch mawjoud → message ma yetla3ch "raw is not defined"', () => {
    let msg = '';
    try {
      parseAndCalculatePayroll(path.join(tmpDir, 'nexiste-pas.csv'));
    } catch (e) {
      msg = e.message;
    }
    expect(msg).not.toMatch(/raw is not defined/);
  });

  test.failing('BUG2: colonne "Nombre_Enfants" ma tfassedch Nom_Prenom', () => {
    const f = writeCsv('nom.csv', [
      'Matricule,Nom_Prenom,Salaire_Base,Taux_Horaire,Nombre_Enfants',
      'E001,Ali,1000,10,3',
    ]);
    const { employees } = parseAndCalculatePayroll(f);
    expect(employees[0].nom_prenom).toBe('Ali');
  });

  test.failing('BUG3: "7.500" lazem yetfahem 7.5 (TND) mouch 7500', () => {
    const r = calculateEmployeePayroll(baseRow({ Taux_Horaire: '7.500' }), 2);
    expect(r.taux_horaire).toBeCloseTo(7.5, 3);
  });

  test.failing('BUG4: matricule doublon lazem yetعلّم b erreur', () => {
    const f = writeCsv('dup.csv', [
      HEADER,
      'E001,Ali,1000,10,0,0,0,0',
      'E001,Sara,800,8,0,0,0,0',
    ]);
    const { parseErrors } = parseAndCalculatePayroll(f);
    expect(parseErrors.length).toBeGreaterThan(0);
  });

  test.failing('BUG5: net salary ma yت3adch négatif (absence > salaire)', () => {
    const r = calculateEmployeePayroll(
      baseRow({ Salaire_Base: 100, Heures_Absence: 50 }),
      2
    );
    expect(r.net_salary).toBeGreaterThanOrEqual(0);
  });
});