jest.mock('../../models/User');

const User = require('../../models/User');
const { adminExists, assertNoAdmin } = require('../../utils/adminGuard');

beforeEach(() => { jest.clearAllMocks(); });

describe('adminExists', () => {
  test('returns true when at least one admin exists', async () => {
    // countDocuments().limit() chaining
    User.countDocuments.mockReturnValue({ limit: jest.fn().mockResolvedValue(1) });
    const result = await adminExists();
    expect(result).toBe(true);
    expect(User.countDocuments).toHaveBeenCalledWith({ role: 'admin' });
  });

  test('returns false when no admin exists', async () => {
    User.countDocuments.mockReturnValue({ limit: jest.fn().mockResolvedValue(0) });
    const result = await adminExists();
    expect(result).toBe(false);
  });
});

describe('assertNoAdmin', () => {
  test('does not throw when no admin exists', async () => {
    User.countDocuments.mockReturnValue({ limit: jest.fn().mockResolvedValue(0) });
    await expect(assertNoAdmin()).resolves.toBeUndefined();
  });

  test('throws a 409 error when an admin already exists', async () => {
    User.countDocuments.mockReturnValue({ limit: jest.fn().mockResolvedValue(1) });
    await expect(assertNoAdmin()).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('administrator account already exists'),
    });
  });
});
