const { notFound, errorHandler } = require('../../middleware/error.middleware');

describe('notFound middleware', () => {
  test('creates a 404 error with the original URL in the message', () => {
    const req = { originalUrl: '/api/unknown-route' };
    const next = jest.fn();
    notFound(req, {}, next);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Route not found: /api/unknown-route');
    expect(err.status).toBe(404);
  });
});

describe('errorHandler middleware', () => {
  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  test('sends 500 for a generic error', () => {
    const err = new Error('Something broke');
    const res = mockRes();
    errorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Something broke' })
    );
  });

  test('uses the error status when provided', () => {
    const err = new Error('Not found');
    err.status = 404;
    const res = mockRes();
    errorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('handles Mongoose ValidationError with 400 status', () => {
    const err = {
      name: 'ValidationError',
      errors: {
        email: { message: 'Email is required' },
        password: { message: 'Password too short' },
      },
    };
    const res = mockRes();
    errorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    const body = res.json.mock.calls[0][0];
    expect(body.message).toContain('Email is required');
    expect(body.message).toContain('Password too short');
  });

  test('handles Mongoose duplicate key error (code 11000) with 409', () => {
    const err = { code: 11000, keyValue: { email: 'dup@test.com' } };
    const res = mockRes();
    errorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Email already exists.' })
    );
  });

  test('handles JsonWebTokenError with 401', () => {
    const err = new Error('invalid signature');
    err.name = 'JsonWebTokenError';
    const res = mockRes();
    errorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid token.' })
    );
  });
});
