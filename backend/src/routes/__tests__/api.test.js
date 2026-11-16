const express = require('express');
const request = require('supertest');
const authRoutes = require('../auth.routes');
const payrollRoutes = require('../payroll.routes');
const adminRoutes = require('../admin.routes');
const subscriptionRoutes = require('../subscription.routes');
const { adminOnly } = require('../../middleware/auth.middleware');
const { notFound, errorHandler } = require('../../middleware/error.middleware');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use(notFound);
app.use(errorHandler);

describe('API routes', () => {
  test('returns the configured subscription plans', async () => {
    const response = await request(app).get('/api/subscriptions/plans');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ starter: expect.any(Object), business: expect.any(Object), pro: expect.any(Object), enterprise: expect.any(Object) }),
    }));
  });

  test('validates missing registration fields without accessing the database', async () => {
    const response = await request(app).post('/api/auth/register').send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Company name, email, and password are required.');
  });

  test.each(['/api/payroll', '/api/admin/users'])('rejects unauthenticated access to %s', async (path) => {
    const response = await request(app).get(path);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Access denied. No token provided.');
  });

  test('returns the standard not-found response for an unknown route', async () => {
    const response = await request(app).get('/api/not-a-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      message: 'Route not found: /api/not-a-route',
    }));
  });
});

describe('adminOnly middleware', () => {
  test('denies non-admin users', () => {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    adminOnly({ user: { role: 'hr_manager' } }, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ success: false, message: 'Access denied. Admins only.' });
    expect(next).not.toHaveBeenCalled();
  });

  test('allows admin users to continue', () => {
    const next = jest.fn();

    adminOnly({ user: { role: 'admin' } }, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});