jest.mock('../../models/User');
jest.mock('../../utils/adminGuard');
jest.mock('../../config/subscription.config', () => ({
  SUBSCRIPTION_TIERS: {
    starter: { employeeLimit: 20, name: 'Starter', price: 0, isTrial: true, trialDays: 7 },
  },
}));

const User = require('../../models/User');
const { assertNoAdmin } = require('../../utils/adminGuard');
const { register, login, getMe, changePassword } = require('../auth.controller');

// Set a stable JWT secret for all tests in this suite
const originalJwtSecret = process.env.JWT_SECRET;
beforeAll(() => { process.env.JWT_SECRET = 'test-only-auth-controller-key'; });
afterAll(() => {
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});
beforeEach(() => { jest.clearAllMocks(); });

// --- Helpers ---
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = () => jest.fn();

// --- POST /api/auth/register ---
describe('register controller', () => {
  test('returns 400 when required fields are missing', async () => {
    const req = { body: {} };
    const res = mockRes();
    await register(req, res, mockNext());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Company name, email, and password are required.' })
    );
  });

  test('returns 400 when password is shorter than 8 characters', async () => {
    const req = { body: { companyName: 'Corp', email: 'a@b.com', password: 'short' } };
    const res = mockRes();
    await register(req, res, mockNext());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Password must be at least 8 characters.' })
    );
  });

  test('returns 409 when email already exists', async () => {
    User.findOne.mockResolvedValue({ email: 'existing@test.com' });
    const req = { body: { companyName: 'Corp', email: 'existing@test.com', password: 'password123' } };
    const res = mockRes();
    await register(req, res, mockNext());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'An account with this email already exists.' })
    );
  });

  test('creates a new hr_manager user and returns 201 with token', async () => {
    assertNoAdmin.mockResolvedValue(undefined);
    User.findOne.mockResolvedValue(null);
    const mockUser = {
      _id: 'user-id-001',
      companyName: 'Test Corp',
      email: 'new@test.com',
      role: 'hr_manager',
      subscription: { plan: 'starter', status: 'active', isTrial: true },
      getTrialInfo: jest.fn().mockReturnValue({ isTrial: true, daysRemaining: 7 }),
    };
    User.create.mockResolvedValue(mockUser);

    const req = { body: { companyName: 'Test Corp', email: 'new@test.com', password: 'password123' } };
    const res = mockRes();
    await register(req, res, mockNext());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Account created successfully. Your 7-day free trial is now active.',
        token: expect.any(String),
      })
    );
  });
});

// --- POST /api/auth/login ---
describe('login controller', () => {
  test('returns 400 when credentials are missing', async () => {
    const req = { body: {} };
    const res = mockRes();
    await login(req, res, mockNext());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Email and password are required.' })
    );
  });

  test('returns 401 for invalid credentials', async () => {
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        comparePassword: jest.fn().mockResolvedValue(false),
      }),
    });
    const req = { body: { email: 'wrong@test.com', password: 'wrongpassword' } };
    const res = mockRes();
    await login(req, res, mockNext());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid email or password.' })
    );
  });

  test('returns 403 for a deactivated user', async () => {
    const mockUser = {
      isActive: false,
      comparePassword: jest.fn().mockResolvedValue(true),
    };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });
    const req = { body: { email: 'disabled@test.com', password: 'password123' } };
    const res = mockRes();
    await login(req, res, mockNext());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Account is deactivated. Contact support.' })
    );
  });

  test('returns a JWT token and user data for valid credentials', async () => {
    const mockUser = {
      _id: 'user-id-002',
      companyName: 'Corp',
      email: 'valid@test.com',
      role: 'hr_manager',
      isActive: true,
      subscription: { plan: 'starter' },
      lastLogin: null,
      comparePassword: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(undefined),
      getTrialInfo: jest.fn().mockReturnValue({ isTrial: true, daysRemaining: 5 }),
      hasActiveSubscription: jest.fn().mockReturnValue(true),
    };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });

    const req = { body: { email: 'valid@test.com', password: 'password123' } };
    const res = mockRes();
    await login(req, res, mockNext());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Login successful.',
        token: expect.any(String),
        user: expect.objectContaining({ email: 'valid@test.com' }),
      })
    );
  });
});

// --- PUT /api/auth/change-password ---
describe('changePassword controller', () => {
  test('returns 400 when passwords are missing', async () => {
    const req = { body: {}, user: { id: 'user-id' } };
    const res = mockRes();
    await changePassword(req, res, mockNext());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Current and new passwords are required.' })
    );
  });

  test('returns 400 when new password is too short', async () => {
    const req = { body: { currentPassword: 'old1234', newPassword: 'short' }, user: { id: 'user-id' } };
    const res = mockRes();
    await changePassword(req, res, mockNext());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'New password must be at least 8 characters.' })
    );
  });

  test('returns 401 when current password is incorrect', async () => {
    const mockUser = {
      comparePassword: jest.fn().mockResolvedValue(false),
    };
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });
    const req = { body: { currentPassword: 'wrongold', newPassword: 'newpassword123' }, user: { id: 'user-id' } };
    const res = mockRes();
    await changePassword(req, res, mockNext());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Current password is incorrect.' })
    );
  });

  test('changes password successfully', async () => {
    const mockUser = {
      password: 'old-hashed',
      comparePassword: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(undefined),
    };
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });
    const req = { body: { currentPassword: 'correctold', newPassword: 'newpassword123' }, user: { id: 'user-id' } };
    const res = mockRes();
    await changePassword(req, res, mockNext());
    expect(mockUser.password).toBe('newpassword123');
    expect(mockUser.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Password changed successfully.' })
    );
  });
});
