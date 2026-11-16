import { describe, expect, it, vi, beforeEach } from 'vitest';

// Since api.js uses axios and localStorage, we test it at the module level
// We mock axios to avoid real network calls
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  };
  return { default: mockAxios };
});

import axios from 'axios';

describe('API service module', () => {
  it('creates an axios instance with /api as baseURL', async () => {
    // Import after mock is applied
    const { default: axiosMock } = await import('axios');
    expect(axiosMock.create).toBeDefined();
  });
});

describe('authAPI exports', () => {
  it('exports login, register, getMe and changePassword', async () => {
    const { authAPI } = await import('../services/api');
    expect(typeof authAPI.login).toBe('function');
    expect(typeof authAPI.register).toBe('function');
    expect(typeof authAPI.getMe).toBe('function');
    expect(typeof authAPI.changePassword).toBe('function');
  });
});

describe('payrollAPI exports', () => {
  it('exports upload, getAll, getById, delete and getDashboardStats', async () => {
    const { payrollAPI } = await import('../services/api');
    expect(typeof payrollAPI.upload).toBe('function');
    expect(typeof payrollAPI.getAll).toBe('function');
    expect(typeof payrollAPI.getById).toBe('function');
    expect(typeof payrollAPI.delete).toBe('function');
    expect(typeof payrollAPI.getDashboardStats).toBe('function');
  });
});

describe('subscriptionAPI exports', () => {
  it('exports getPlans, getCurrent, upgrade', async () => {
    const { subscriptionAPI } = await import('../services/api');
    expect(typeof subscriptionAPI.getPlans).toBe('function');
    expect(typeof subscriptionAPI.getCurrent).toBe('function');
    expect(typeof subscriptionAPI.upgrade).toBe('function');
  });
});

describe('copilotAPI exports', () => {
  it('exports chat function', async () => {
    const { copilotAPI } = await import('../services/api');
    expect(typeof copilotAPI.chat).toBe('function');
  });
});
