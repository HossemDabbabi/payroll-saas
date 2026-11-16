jest.mock('../src/models/PayrollRecord', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOneAndDelete: jest.fn(),
}));
jest.mock('../src/services/payroll.service', () => ({
  parseAndCalculatePayroll: jest.fn(),
}));
jest.mock('../src/middleware/auth.middleware', () => ({
  enforceEmployeeLimit: jest.fn(),
}));

const fs = require('fs');
const PayrollRecord = require('../src/models/PayrollRecord');
const { parseAndCalculatePayroll } = require('../src/services/payroll.service');
const { enforceEmployeeLimit } = require('../src/middleware/auth.middleware');
const {
  uploadAndProcess,
  getPayrollRecords,
  getPayrollRecord,
  deletePayrollRecord,
} = require('../src/controllers/payroll.controller');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (over = {}) => ({
  file: { path: '/tmp/paie.xlsx', filename: 'paie.xlsx', originalname: 'paie.xlsx' },
  body: { month: '3', year: '2025' },
  user: { _id: 'user1', subscription: {} },
  params: {},
  query: {},
  ...over,
});

beforeEach(() => {
  jest.spyOn(fs, 'existsSync').mockReturnValue(true);
  jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
  parseAndCalculatePayroll.mockReturnValue({
    employees: [{ matricule: '1' }, { matricule: '2' }],
    summary: { totalNetPayout: 2000 },
    parseErrors: [],
  });
  enforceEmployeeLimit.mockReturnValue({ allowed: true });
  PayrollRecord.findOne.mockResolvedValue(null);
  PayrollRecord.create.mockResolvedValue({
    _id: 'rec1',
    period: { month: 3, year: 2025 },
    summary: { totalNetPayout: 2000 },
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('uploadAndProcess - cas fonctionnel', () => {
  test('upload valide -> 201 avec id et summary', async () => {
    const res = mockRes();
    await uploadAndProcess(makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(201);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('rec1');
    expect(PayrollRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ company: 'user1', period: { month: 3, year: 2025 } })
    );
  });

  test('parseErrors sont formates en "Row N: ..."', async () => {
    parseAndCalculatePayroll.mockReturnValue({
      employees: [{}],
      summary: {},
      parseErrors: [{ row: 2, errors: ['Heures negatives', 'Matricule vide'] }],
    });
    const res = mockRes();
    await uploadAndProcess(makeReq(), res, jest.fn());
    expect(PayrollRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ processingErrors: ['Row 2: Heures negatives; Matricule vide'] })
    );
    expect(res.json.mock.calls[0][0].data.totalRowsWithWarnings).toBe(1);
  });
});

describe('uploadAndProcess - validation month/year (boundary)', () => {
  test('aucun fichier -> 400', async () => {
    const res = mockRes();
    await uploadAndProcess(makeReq({ file: undefined }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test.each([
    [{ year: '2025' }],
    [{ month: '3' }],
    [{}],
  ])('month/year manquant %j -> 400', async (body) => {
    const res = mockRes();
    await uploadAndProcess(makeReq({ body }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test.each([['1'], ['12']])('month limite valide %s -> 201', async (month) => {
    const res = mockRes();
    await uploadAndProcess(makeReq({ body: { month, year: '2025' } }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test.each([['0'], ['13'], ['-1']])('month invalide %s -> 400', async (month) => {
    const res = mockRes();
    await uploadAndProcess(makeReq({ body: { month, year: '2025' } }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test.each([['2000'], ['2100']])('year limite valide %s -> 201', async (year) => {
    const res = mockRes();
    await uploadAndProcess(makeReq({ body: { month: '3', year } }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test.each([['1999'], ['2101']])('year invalide %s -> 400', async (year) => {
    const res = mockRes();
    await uploadAndProcess(makeReq({ body: { month: '3', year } }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // BUG attendu: NaN passe la validation (NaN < 1 et NaN > 12 sont false)
  test.each([['abc'], ['1.5x'], ['']])('month non numerique "%s" -> 400', async (month) => {
    const res = mockRes();
    await uploadAndProcess(makeReq({ body: { month, year: '2025' } }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('uploadAndProcess - erreurs metier', () => {
  test('colonne Matricule manquante -> 422', async () => {
    parseAndCalculatePayroll.mockImplementation(() => {
      throw new Error('Missing required columns: Matricule');
    });
    const res = mockRes();
    await uploadAndProcess(makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(422);
  });

  test('fichier vide -> 422 et fichier supprime', async () => {
    parseAndCalculatePayroll.mockImplementation(() => {
      throw new Error('File is empty');
    });
    const res = mockRes();
    await uploadAndProcess(makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(422);
    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/paie.xlsx');
  });

  test('erreur inconnue -> next(error) et fichier supprime', async () => {
    const err = new Error('boom');
    parseAndCalculatePayroll.mockImplementation(() => { throw err; });
    const next = jest.fn();
    await uploadAndProcess(makeReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  test('limite employes depassee (plan Starter) -> 403', async () => {
    enforceEmployeeLimit.mockReturnValue({ allowed: false, message: 'Limit reached' });
    const res = mockRes();
    await uploadAndProcess(makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(PayrollRecord.create).not.toHaveBeenCalled();
  });

  test('periode deja existante -> 409 sans creation', async () => {
    PayrollRecord.findOne.mockResolvedValue({ _id: 'old' });
    const res = mockRes();
    await uploadAndProcess(makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(PayrollRecord.create).not.toHaveBeenCalled();
  });
});

// BUG attendu: les return 400/403/409 ne nettoient pas le fichier upload
describe('uploadAndProcess - nettoyage du fichier (fichiers orphelins)', () => {
  test('month invalide -> fichier supprime', async () => {
    await uploadAndProcess(makeReq({ body: { month: '13', year: '2025' } }), mockRes(), jest.fn());
    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/paie.xlsx');
  });

  test('limite depassee (403) -> fichier supprime', async () => {
    enforceEmployeeLimit.mockReturnValue({ allowed: false });
    await uploadAndProcess(makeReq(), mockRes(), jest.fn());
    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/paie.xlsx');
  });

  test('doublon (409) -> fichier supprime', async () => {
    PayrollRecord.findOne.mockResolvedValue({ _id: 'old' });
    await uploadAndProcess(makeReq(), mockRes(), jest.fn());
    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/paie.xlsx');
  });
});

describe('Isolation entre societes (securite)', () => {
  test('getPayrollRecord filtre par company = user connecte', async () => {
    PayrollRecord.findOne.mockResolvedValue(null);
    const res = mockRes();
    await getPayrollRecord(makeReq({ params: { id: 'abc' } }), res, jest.fn());
    expect(PayrollRecord.findOne).toHaveBeenCalledWith({ _id: 'abc', company: 'user1' });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('deletePayrollRecord filtre par company et 404 si absent', async () => {
    PayrollRecord.findOneAndDelete.mockResolvedValue(null);
    const res = mockRes();
    await deletePayrollRecord(makeReq({ params: { id: 'abc' } }), res, jest.fn());
    expect(PayrollRecord.findOneAndDelete).toHaveBeenCalledWith({ _id: 'abc', company: 'user1' });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('delete reussi supprime aussi le fichier', async () => {
    PayrollRecord.findOneAndDelete.mockResolvedValue({ fileName: 'paie.xlsx' });
    const res = mockRes();
    await deletePayrollRecord(makeReq({ params: { id: 'abc' } }), res, jest.fn());
    expect(fs.unlinkSync).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('getPayrollRecords - pagination (boundary)', () => {
  const mockFind = () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };
    PayrollRecord.find.mockReturnValue(chain);
    PayrollRecord.countDocuments.mockResolvedValue(25);
    return chain;
  };

  test('defaults page=1 limit=10 -> 3 pages', async () => {
    mockFind();
    const res = mockRes();
    await getPayrollRecords(makeReq(), res, jest.fn());
    expect(res.json.mock.calls[0][0].pagination).toEqual({ total: 25, page: 1, limit: 10, pages: 3 });
  });

  // BUG attendu: limit=0 -> pages = Infinity
  test('limit=0 ne produit pas pages infini', async () => {
    mockFind();
    const res = mockRes();
    await getPayrollRecords(makeReq({ query: { limit: '0' } }), res, jest.fn());
    const { pages } = res.json.mock.calls[0][0].pagination;
    expect(Number.isFinite(pages)).toBe(true);
  });

  // BUG attendu: page=0 -> skip negatif
  test('page=0 ne produit pas un skip negatif', async () => {
    const chain = mockFind();
    await getPayrollRecords(makeReq({ query: { page: '0' } }), mockRes(), jest.fn());
    expect(chain.skip.mock.calls[0][0]).toBeGreaterThanOrEqual(0);
  });
});