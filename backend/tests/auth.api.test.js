const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/models/User', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../src/utils/adminGuard', () => ({
  assertNoAdmin: jest.fn(),
  ensureSingleAdmin: jest.fn(),
}));

const User = require('../src/models/User');
const { assertNoAdmin } = require('../src/utils/adminGuard');
const app = require('../src/server');
const { adminOnly, checkSubscriptionLimit, enforceEmployeeLimit } = require('../src/middleware/auth.middleware');

// Retourne un objet awaitable ET chainable avec .select()
const chain = (value) => ({
  select: jest.fn().mockResolvedValue(value),
  then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
});

const makeUser = (overrides = {}) => ({
  _id: 'u1',
  companyName: 'Acme',
  email: 'a@a.com',
  role: 'hr_manager',
  isActive: true,
  subscription: { plan: 'starter', isTrial: true, employeeLimit: 10 },
  comparePassword: jest.fn().mockResolvedValue(true),
  getTrialInfo: () => ({}),
  hasActiveSubscription: () => true,
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const tokenFor = (id = 'u1') => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });

beforeEach(() => {
  jest.clearAllMocks();
  assertNoAdmin.mockResolvedValue();
});

describe('POST /api/auth/register', () => {
  const valid = { companyName: 'Acme', email: 'New@Acme.com', password: 'Password1' };

  test('champs manquants -> 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@a.com' });
    expect(res.status).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  test('boundary: mot de passe de 7 caracteres -> 400 (message sur 8 caracteres)', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...valid, password: '1234567' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/8/);
    expect(User.create).not.toHaveBeenCalled();
  });

  test('boundary: mot de passe de 8 caracteres -> 201 + token', async () => {
    User.findOne.mockReturnValue(chain(null));
    User.create.mockResolvedValue(makeUser());
    const res = await request(app).post('/api/auth/register').send({ ...valid, password: '12345678' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(jwt.verify(res.body.token, process.env.JWT_SECRET).id).toBe('u1');
  });

  test('email deja utilise -> 409', async () => {
    User.findOne.mockReturnValue(chain(makeUser()));
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(409);
    expect(User.create).not.toHaveBeenCalled();
  });

  test('email cherche en minuscules', async () => {
    User.findOne.mockReturnValue(chain(null));
    User.create.mockResolvedValue(makeUser());
    await request(app).post('/api/auth/register').send(valid);
    expect(User.findOne).toHaveBeenCalledWith({ email: 'new@acme.com' });
  });

  test('compte cree avec plan starter + essai 7 jours + role hr_manager', async () => {
    User.findOne.mockReturnValue(chain(null));
    User.create.mockResolvedValue(makeUser());
    await request(app).post('/api/auth/register').send(valid);
    const arg = User.create.mock.calls[0][0];
    expect(arg.role).toBe('hr_manager');
    expect(arg.subscription.plan).toBe('starter');
    expect(arg.subscription.isTrial).toBe(true);
    const days = (arg.subscription.trialEndsAt - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThanOrEqual(7);
  });

  test('securite: role inconnu (superuser) -> hr_manager', async () => {
    User.findOne.mockReturnValue(chain(null));
    User.create.mockResolvedValue(makeUser());
    await request(app).post('/api/auth/register').send({ ...valid, role: 'superuser' });
    expect(User.create.mock.calls[0][0].role).toBe('hr_manager');
  });

  test('securite: role admin refuse si un admin existe deja', async () => {
    assertNoAdmin.mockRejectedValue(Object.assign(new Error('Admin exists'), { statusCode: 409 }));
    User.findOne.mockReturnValue(chain(null));
    const res = await request(app).post('/api/auth/register').send({ ...valid, role: 'admin' });
    expect(res.status).not.toBe(201);
    expect(User.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/login', () => {
  test('body vide -> 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  test('email inconnu -> 401', async () => {
    User.findOne.mockReturnValue(chain(null));
    const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com', password: 'Password1' });
    expect(res.status).toBe(401);
  });

  test('mauvais mot de passe -> 401', async () => {
    User.findOne.mockReturnValue(chain(makeUser({ comparePassword: jest.fn().mockResolvedValue(false) })));
    const res = await request(app).post('/api/auth/login').send({ email: 'a@a.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('securite: meme message pour email inconnu et mauvais mot de passe', async () => {
    User.findOne.mockReturnValueOnce(chain(null));
    const r1 = await request(app).post('/api/auth/login').send({ email: 'x@x.com', password: 'Password1' });
    User.findOne.mockReturnValueOnce(chain(makeUser({ comparePassword: jest.fn().mockResolvedValue(false) })));
    const r2 = await request(app).post('/api/auth/login').send({ email: 'a@a.com', password: 'wrong' });
    expect(r1.body.message).toBe(r2.body.message);
  });

  test('compte desactive -> 403', async () => {
    User.findOne.mockReturnValue(chain(makeUser({ isActive: false })));
    const res = await request(app).post('/api/auth/login').send({ email: 'a@a.com', password: 'Password1' });
    expect(res.status).toBe(403);
  });

  test('login correct -> 200 + JWT valide', async () => {
    const user = makeUser();
    User.findOne.mockReturnValue(chain(user));
    const res = await request(app).post('/api/auth/login').send({ email: 'A@A.com', password: 'Password1' });
    expect(res.status).toBe(200);
    expect(jwt.verify(res.body.token, process.env.JWT_SECRET).id).toBe('u1');
    expect(user.save).toHaveBeenCalled();
    expect(User.findOne).toHaveBeenCalledWith({ email: 'a@a.com' });
  });

  test('securite: la reponse ne contient pas le mot de passe', async () => {
    User.findOne.mockReturnValue(chain(makeUser({ password: 'hash' })));
    const res = await request(app).post('/api/auth/login').send({ email: 'a@a.com', password: 'Password1' });
    expect(JSON.stringify(res.body)).not.toMatch(/"password"/);
  });
});

describe('Middleware protect (via GET /api/auth/me)', () => {
  test('token valide + user existant -> 200', async () => {
    User.findById.mockReturnValue(chain(makeUser({ createdAt: new Date() })));
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenFor()}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('a@a.com');
  });

  test('token valide mais user supprime -> 401', async () => {
    User.findById.mockReturnValue(chain(null));
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenFor()}`);
    expect(res.status).toBe(401);
  });

  test('token valide mais compte desactive -> 401', async () => {
    User.findById.mockReturnValue(chain(makeUser({ isActive: false })));
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenFor()}`);
    expect(res.status).toBe(401);
  });

  test('header "Bearer" sans token -> 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer');
    expect(res.status).toBe(401);
  });

  test('header sans prefixe Bearer -> 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', tokenFor());
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/auth/change-password', () => {
  const auth = () => ({ Authorization: `Bearer ${tokenFor()}` });

  test('champs manquants -> 400', async () => {
    User.findById.mockReturnValue(chain(makeUser()));
    const res = await request(app).put('/api/auth/change-password').set(auth()).send({});
    expect(res.status).toBe(400);
  });

  test('boundary: nouveau mot de passe de 7 caracteres -> 400', async () => {
    User.findById.mockReturnValue(chain(makeUser()));
    const res = await request(app).put('/api/auth/change-password').set(auth())
      .send({ currentPassword: 'Password1', newPassword: '1234567' });
    expect(res.status).toBe(400);
  });

  test('ancien mot de passe incorrect -> 401', async () => {
    User.findById.mockReturnValue(chain(makeUser({ comparePassword: jest.fn().mockResolvedValue(false) })));
    const res = await request(app).put('/api/auth/change-password').set(auth())
      .send({ currentPassword: 'wrong', newPassword: 'NewPassword1' });
    expect(res.status).toBe(401);
  });

  test('changement correct -> 200 + save', async () => {
    const user = makeUser();
    User.findById.mockReturnValue(chain(user));
    const res = await request(app).put('/api/auth/change-password').set(auth())
      .send({ currentPassword: 'Password1', newPassword: 'NewPassword1' });
    expect(res.status).toBe(200);
    expect(user.password).toBe('NewPassword1');
    expect(user.save).toHaveBeenCalled();
  });
});

describe('RBAC: adminOnly', () => {
  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  test('hr_manager -> 403', () => {
    const res = mockRes();
    const next = jest.fn();
    adminOnly({ user: { role: 'hr_manager' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('sans user -> 403', () => {
    const res = mockRes();
    adminOnly({}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('admin -> next()', () => {
    const next = jest.fn();
    adminOnly({ user: { role: 'admin' } }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });
});

describe('Abonnement: checkSubscriptionLimit / enforceEmployeeLimit', () => {
  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  test('essai expire -> 403 TRIAL_EXPIRED', async () => {
    const res = mockRes();
    const next = jest.fn();
    const user = makeUser({ hasActiveSubscription: () => false });
    await checkSubscriptionLimit()({ user }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].code).toBe('TRIAL_EXPIRED');
    expect(next).not.toHaveBeenCalled();
  });

  test('abonnement paye expire -> 403 SUBSCRIPTION_EXPIRED', async () => {
    const res = mockRes();
    const user = makeUser({
      hasActiveSubscription: () => false,
      subscription: { plan: 'pro', isTrial: false },
    });
    await checkSubscriptionLimit()({ user }, res, jest.fn());
    expect(res.json.mock.calls[0][0].code).toBe('SUBSCRIPTION_EXPIRED');
  });

  test('abonnement actif -> next()', async () => {
    const next = jest.fn();
    await checkSubscriptionLimit()({ user: makeUser() }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('limite employes depassee -> allowed false', () => {
    const user = makeUser({ canProcessEmployees: () => false });
    const r = enforceEmployeeLimit({ user }, {}, 50);
    expect(r.allowed).toBe(false);
    expect(r.code).toBe('EMPLOYEE_LIMIT_EXCEEDED');
    expect(r.submitted).toBe(50);
  });

  test('dans la limite -> allowed true', () => {
    const user = makeUser({ canProcessEmployees: () => true });
    expect(enforceEmployeeLimit({ user }, {}, 5)).toEqual({ allowed: true });
  });
});