// @ts-check
import { test, expect } from '@playwright/test';

const email = "llllll@company.com";
const password = "123123123aA@";

test('signs in and opens the dashboard', async ({ page }) => {
  test.skip(
    !email || !password,
    'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD to run the authenticated login test.'
  );

  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /Sign In/ }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(/Login failed|Invalid email or password|Account is deactivated/i)).toHaveCount(0);
});
