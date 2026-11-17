// @ts-check
import { test, expect } from '@playwright/test';
import { mockJson } from './helpers/mockApi.js';

// Negative login scenarios (AUTH-02). The API is mocked: no backend needed.

test.describe('login: negative cases', () => {
  test('wrong credentials: stays on /login, no session stored', async ({ page }) => {
    await mockJson(page, '**/api/auth/login', 401, { success: false, message: 'Invalid email or password.' }, 'POST');
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('nobody@example.test');
    await page.locator('input[type="password"]').fill('wrong-password-1');
    await page.getByRole('button', { name: /Sign In/ }).click();

    await expect(page.getByText('Invalid email or password.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    const token = await page.evaluate(() => localStorage.getItem('payroll_token'));
    expect(token).toBeNull();
  });

  test('deactivated account: error shown, no redirect', async ({ page }) => {
    await mockJson(page, '**/api/auth/login', 403, { success: false, message: 'Account is deactivated. Contact support.' }, 'POST');
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('off@example.test');
    await page.locator('input[type="password"]').fill('whatever-123');
    await page.getByRole('button', { name: /Sign In/ }).click();

    await expect(page.getByText('Account is deactivated. Contact support.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('empty form: no request is sent', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/auth/login', (route) => { calls += 1; return route.abort(); });
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign In/ }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(calls).toBe(0);
  });

  test('malformed email: no request is sent', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/auth/login', (route) => { calls += 1; return route.abort(); });
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('not-an-email');
    await page.locator('input[type="password"]').fill('password-123');
    await page.getByRole('button', { name: /Sign In/ }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(calls).toBe(0);
  });

  test('protected page without a session redirects to /login', async ({ page }) => {
    await page.goto('/upload');
    await expect(page).toHaveURL(/\/login$/);
  });
});
