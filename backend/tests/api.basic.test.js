const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/server');

describe('Health & 404', () => {
  test('GET /api/health repond success', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('route inconnue retourne 404', async () => {
    const res = await request(app).get('/api/route-qui-nexiste-pas');
    expect(res.status).toBe(404);
  });
});

describe('Routes protegees sans token', () => {
  test.each([
    '/api/payroll',
    '/api/payroll/dashboard/stats',
    '/api/payroll/123',
    '/api/reports/123/excel',
    '/api/reports/123/payslip/M001',
    '/api/subscriptions/current',
    '/api/auth/me',
    '/api/admin',
  ])('GET %s sans token -> 401', async (url) => {
    const res = await request(app).get(url);
    expect(res.status).toBe(401);
  });

  test('upload payroll sans token -> 401', async () => {
    const res = await request(app).post('/api/payroll/upload');
    expect(res.status).toBe(401);
  });
});

describe('Token invalide', () => {
  test('token aleatoire -> 401', async () => {
    const res = await request(app)
      .get('/api/payroll')
      .set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });

  test('token signe avec un mauvais secret -> 401', async () => {
    const fake = jwt.sign({ id: '123' }, 'mauvais-secret');
    const res = await request(app)
      .get('/api/payroll')
      .set('Authorization', `Bearer ${fake}`);
    expect(res.status).toBe(401);
  });

  test('token expire -> 401', async () => {
    const expired = jwt.sign({ id: '123' }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await request(app)
      .get('/api/payroll')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });
});

describe('Validation auth (sans DB)', () => {
  test('login body vide refuse', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect([400, 401, 422]).toContain(res.status);
  });

  test('register email invalide refuse', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'pas-un-email', password: 'Password1' });
    expect([400, 422]).toContain(res.status);
  });

  test('boundary: mot de passe de 7 caracteres refuse', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'a@a.com', password: '1234567' });
    expect([400, 422]).toContain(res.status);
  });
});

describe('Methodes protegees sans token', () => {
  test('POST /api/subscriptions/upgrade -> 401', async () => {
    const res = await request(app).post('/api/subscriptions/upgrade').send({ plan: 'pro' });
    expect(res.status).toBe(401);
  });

  test('PUT /api/auth/change-password -> 401', async () => {
    const res = await request(app).put('/api/auth/change-password').send({});
    expect(res.status).toBe(401);
  });

  test('DELETE /api/payroll/123 -> 401', async () => {
    const res = await request(app).delete('/api/payroll/123');
    expect(res.status).toBe(401);
  });
});