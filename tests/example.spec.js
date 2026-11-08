// @ts-check
import { test, expect } from '@playwright/test';

test('displays the PayrollPro sign-in form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /PayrollPro/ })).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Sign In/ })).toBeVisible();
});

test('redirects unauthenticated users from payroll to login', async ({ page }) => {
  await page.goto('/payroll');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /PayrollPro/ })).toBeVisible();
});
