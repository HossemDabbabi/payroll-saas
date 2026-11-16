import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const login = vi.fn();

function CurrentPath() {
  const { pathname } = useLocation();
  return <output aria-label="Current path">{pathname}</output>;
}

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
      <CurrentPath />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    login.mockReset();
    useAuth.mockReturnValue({ login });
  });

  it('renders the sign-in form and registration link', () => {
    renderLoginPage();

    expect(screen.getByRole('heading', { name: /Payroll\s*Pro/i })).toBeVisible();
    expect(screen.getByPlaceholderText('admin@company.com')).toBeVisible();
    expect(screen.getByPlaceholderText('••••••••')).toBeVisible();
    expect(screen.getByRole('button', { name: /Sign In/ })).toBeEnabled();
    expect(screen.getByRole('link', { name: /Start 7-Day Free Trial/ })).toHaveAttribute('href', '/register');
  });

  it('submits credentials and navigates to the dashboard', async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({});
    renderLoginPage();

    await user.type(screen.getByPlaceholderText('admin@company.com'), 'qa@example.test');
    await user.type(screen.getByPlaceholderText('••••••••'), 'synthetic-test-password');
    await user.click(screen.getByRole('button', { name: /Sign In/ }));

    expect(login).toHaveBeenCalledWith('qa@example.test', 'synthetic-test-password');
    expect(toast.success).toHaveBeenCalledWith('Welcome back!');
    await waitFor(() => expect(screen.getByLabelText('Current path')).toHaveTextContent('/dashboard'));
  });

  it('shows the API error when sign-in fails', async () => {
    const user = userEvent.setup();
    login.mockRejectedValue({ response: { data: { message: 'Authentication failed.' } } });
    renderLoginPage();

    await user.type(screen.getByPlaceholderText('admin@company.com'), 'qa@example.test');
    await user.type(screen.getByPlaceholderText('••••••••'), 'synthetic-test-password');
    await user.click(screen.getByRole('button', { name: /Sign In/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Authentication failed.'));
    expect(screen.getByLabelText('Current path')).toHaveTextContent('/login');
  });
});