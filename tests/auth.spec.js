// @ts-check
import { test, expect } from '@playwright/test';

const email = process.env.PLAYWRIGHT_TEST_EMAIL;
const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

test.beforeEach(() => {
  test.skip(!email || !password, 'Set dedicated test-account credentials to run authenticated browser tests.');
});

test('signs in and opens the dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /Sign In/ }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(/Login failed|Invalid email or password|Account is deactivated/i)).toHaveCount(0);
});
