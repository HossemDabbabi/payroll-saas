jest.mock('../../models/User');

const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { protect } = require('../auth.middleware');

const originalJwtSecret = process.env.JWT_SECRET;

describe('protect middleware', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-only-signing-key';
  });

  afterAll(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects requests without a bearer token', async () => {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await protect({ headers: {} }, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'Access denied. No token provided.',
    });
    expect(User.findById).not.toHaveBeenCalled();
  });

  test('rejects invalid tokens', async () => {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await protect({ headers: { authorization: 'Bearer invalid-token' } }, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ success: false, message: 'Invalid token.' });
    expect(User.findById).not.toHaveBeenCalled();
  });

  test('attaches the active user for a valid token', async () => {
    const activeUser = { isActive: true, role: 'hr_manager' };
    const request = {
      headers: {
        authorization: `Bearer ${jwt.sign({ id: 'test-user-id' }, process.env.JWT_SECRET)}`,
      },
    };
    const response = {};
    const next = jest.fn();
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(activeUser) });

    await protect(request, response, next);

    expect(User.findById).toHaveBeenCalledWith('test-user-id');
    expect(request.user).toBe(activeUser);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('rejects deactivated users', async () => {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const token = jwt.sign({ id: 'test-user-id' }, process.env.JWT_SECRET);
    const next = jest.fn();
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ isActive: false }) });

    await protect({ headers: { authorization: `Bearer ${token}` } }, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'User not found or account deactivated.',
    });
    expect(next).not.toHaveBeenCalled();
  });
});