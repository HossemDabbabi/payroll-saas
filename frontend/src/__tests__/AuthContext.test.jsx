import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import * as api from '../services/api';

// Mock the API module
vi.mock('../services/api', () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
    getMe: vi.fn(),
  },
}));

// Test component to consume AuthContext
function AuthConsumer() {
  const { user, loading, login, register, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'null'}</span>
      <button onClick={() => login('test@test.com', 'password123')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('starts in loading state and resolves to null user when no token exists', async () => {
    // No token in localStorage
    api.authAPI.getMe.mockRejectedValue(new Error('no token'));

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    // After mount, loading should become false with no user
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('validates token from localStorage on mount and sets user', async () => {
    localStorage.setItem('payroll_token', 'fake-jwt-token');
    api.authAPI.getMe.mockResolvedValue({
      data: { user: { email: 'stored@test.com', role: 'hr_manager' } },
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('stored@test.com');
    });
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('clears auth and user when token validation fails', async () => {
    localStorage.setItem('payroll_token', 'invalid-token');
    api.authAPI.getMe.mockRejectedValue(new Error('401'));

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(localStorage.getItem('payroll_token')).toBeNull();
  });

  it('logout clears user state and localStorage', async () => {
    localStorage.setItem('payroll_token', 'valid-token');
    localStorage.setItem('payroll_user', JSON.stringify({ email: 'user@test.com' }));
    api.authAPI.getMe.mockResolvedValue({
      data: { user: { email: 'user@test.com', role: 'hr_manager' } },
    });

    const { getByRole } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('user')).toHaveTextContent('user@test.com')
    );

    act(() => {
      getByRole('button', { name: 'Logout' }).click();
    });

    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(localStorage.getItem('payroll_token')).toBeNull();
    expect(localStorage.getItem('payroll_user')).toBeNull();
  });
});
