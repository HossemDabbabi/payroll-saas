const { handleCopilotChat } = require('../copilot.controller');
const PayrollRecord = require('../../models/PayrollRecord');

jest.mock('../../models/PayrollRecord');

describe('Payroll Copilot AI Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { _id: '507f1f77bcf86cd799439011' },
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('returns 400 if query is missing or empty', async () => {
    req.body = { query: '   ' };
    await handleCopilotChat(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Query string is required.' })
    );
  });

  test('returns employee summary when requested employee is found in MongoDB record', async () => {
    req.body = { query: 'Give me all information for Imene Zouaghi' };

    const mockRecord = {
      period: { month: 9, year: 2026 },
      employees: [
        {
          matricule: 'EMP-005',
          nom_prenom: 'Imene Zouaghi',
          salaire_base: 1800,
          taux_horaire: 10,
          heures_retard: 0,
          heures_absence: 0,
          heures_supp: 5,
          prime: 200,
          cnss: 189.34,
          irpp: 310.25,
          avance: 0,
          late_deduction: 0,
          absence_deduction: 0,
          overtime_bonus: 62.5,
          net_salary: 1562.91,
          errors: [],
        },
      ],
    };

    PayrollRecord.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockRecord),
    });

    await handleCopilotChat(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        answer: expect.stringContaining('Imene Zouaghi'),
      })
    );
  });

  test('returns "Employee not found in the current payroll records." when employee is missing', async () => {
    req.body = { query: 'Give me information for Unknown Person' };

    PayrollRecord.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue({ employees: [] }),
    });

    await handleCopilotChat(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        answer: expect.stringContaining('Employee not found in the current payroll records.'),
      })
    );
  });

  test('explains Tunisian IRPP tax rules when asked', async () => {
    req.body = { query: 'How is IRPP calculated in Tunisia?' };

    PayrollRecord.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(null),
    });

    await handleCopilotChat(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        answer: expect.stringContaining('Tunisian IRPP'),
      })
    );
  });
});
