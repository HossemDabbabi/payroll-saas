// @ts-check
import { test, expect } from '@playwright/test';

// Credentials come from the environment, never from the source code.
const email = process.env.PLAYWRIGHT_TEST_EMAIL;
const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

test.beforeEach(() => {
  test.skip(
    !email || !password,
    'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD to run the authenticated login test.'
  );
});

test('signs in and opens the dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(String(email));
  await page.locator('input[type="password"]').fill(String(password));
  await page.getByRole('button', { name: /Sign In/ }).click();

  // Admins land on /admin, other users on /dashboard
  await expect(page).toHaveURL(/\/(dashboard|admin)$/);
  await expect(
    page.getByText(/Login failed|Invalid email or password|Account is deactivated/i)
  ).toHaveCount(0);
});