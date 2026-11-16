import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import RegisterPage from '../pages/RegisterPage';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const register = vi.fn();

function CurrentPath() {
  const { pathname } = useLocation();
  return <output aria-label="Current path">{pathname}</output>;
}

function renderRegisterPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
      <CurrentPath />
    </MemoryRouter>
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    register.mockReset();
    useAuth.mockReturnValue({ register });
  });

  it('renders the registration form with all required fields', () => {
    renderRegisterPage();

    expect(screen.getByRole('heading', { name: /Payroll\s*Pro/i })).toBeVisible();
    expect(screen.getByPlaceholderText('Acme Technologies')).toBeVisible();
    expect(screen.getByPlaceholderText('admin@company.com')).toBeVisible();
    expect(screen.getByPlaceholderText('At least 8 characters')).toBeVisible();
    expect(screen.getByPlaceholderText('Repeat your password')).toBeVisible();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeEnabled();
    expect(screen.getByRole('link', { name: /Sign in/i })).toHaveAttribute('href', '/login');
  });

  it('submits registration and navigates to dashboard on success', async () => {
    const user = userEvent.setup();
    register.mockResolvedValue({});
    renderRegisterPage();

    await user.type(screen.getByPlaceholderText('Acme Technologies'), 'Test Corp');
    await user.type(screen.getByPlaceholderText('admin@company.com'), 'newuser@test.com');
    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'password123');
    await user.type(screen.getByPlaceholderText('Repeat your password'), 'password123');
    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(register).toHaveBeenCalledWith('Test Corp', 'newuser@test.com', 'password123');
    expect(toast.success).toHaveBeenCalledWith(
      'Account created! Welcome to your 7-day free trial.'
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Current path')).toHaveTextContent('/dashboard')
    );
  });

  it('shows toast error when passwords do not match', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByPlaceholderText('Acme Technologies'), 'Test Corp');
    await user.type(screen.getByPlaceholderText('admin@company.com'), 'newuser@test.com');
    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'password123');
    await user.type(screen.getByPlaceholderText('Repeat your password'), 'different456');
    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(toast.error).toHaveBeenCalledWith('Passwords do not match.');
    expect(register).not.toHaveBeenCalled();
  });

  it('shows API error when registration fails', async () => {
    const user = userEvent.setup();
    register.mockRejectedValue({
      response: { data: { message: 'An account with this email already exists.' } },
    });
    renderRegisterPage();

    await user.type(screen.getByPlaceholderText('Acme Technologies'), 'Test Corp');
    await user.type(screen.getByPlaceholderText('admin@company.com'), 'existing@test.com');
    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'password123');
    await user.type(screen.getByPlaceholderText('Repeat your password'), 'password123');
    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'An account with this email already exists.'
      )
    );
    expect(screen.getByLabelText('Current path')).toHaveTextContent('/register');
  });
});
