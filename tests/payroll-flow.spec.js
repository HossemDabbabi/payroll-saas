// @ts-check
import { test, expect } from '@playwright/test';

const email = "llllll@company.com";
const password = "123123123aA@";
// @ts-check




test('verifies sidebar navigation and settings pages', async ({ page }) => {
  // 1. تسجيل الدخول أولاً
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /Sign In/ }).click();

  // التأكد من الوصول للـ Dashboard
  await expect(page).toHaveURL(/\/dashboard$/);

  // 2. الانتقال إلى صفحة الاشتراك (Subscription) عبر القائمة الجانبية
  const subscriptionLink = page.getByRole('link', { name: 'Subscription' });
  await expect(subscriptionLink).toBeVisible();
  await subscriptionLink.click();
  await expect(page).toHaveURL(/\/subscription$/);
  await expect(page.getByRole('heading', { name: /Subscription|Plan/i })).toBeVisible();

  // 3. الانتقال إلى صفحة الإعدادات (Settings)
  const settingsLink = page.getByRole('link', { name: 'Settings' }).first();
  await expect(settingsLink).toBeVisible();
  await settingsLink.click();
  await expect(page).toHaveURL(/\/settings$/);

  // 4. العودة للـ Dashboard عبر الشعار أو الرابط الرئيسي
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('signs in, opens payroll records, and prepares a payroll upload', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /Sign In/ }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(/Dashboard Overview|Admin Dashboard/).first()).toBeVisible();
  await expect(page.getByRole('navigation')).toBeVisible();

  const payrollLink = page.getByRole('link', { name: 'Payroll Records' });
  await expect(payrollLink).toBeVisible();
  await payrollLink.click();

  await expect(page).toHaveURL(/\/payroll$/);
  await expect(page.getByRole('heading', { name: 'Payroll Records' })).toBeVisible();
  await page.getByRole('button', { name: 'New Payroll Batch' }).click();

  await expect(page).toHaveURL(/\/upload$/);
  await expect(page.getByRole('heading', { name: 'Upload Payroll File' })).toBeVisible();
  await expect(page.getByText('Expected Column Headers:')).toBeVisible();

  const periodSelectors = page.locator('select');
  await expect(periodSelectors).toHaveCount(2);
  await periodSelectors.nth(0).selectOption('2');
  await periodSelectors.nth(1).selectOption(String(new Date().getFullYear()));

  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeEnabled();
  await fileInput.setInputFiles({
    name: 'playwright-payroll.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'Matricule,Nom_Prenom,Salaire_Base,Taux_Horaire\nQA-001,Test Employee,1000,10\n'
    ),
  });

  await expect(page.getByText('playwright-payroll.csv')).toBeVisible();
  await expect(page.getByRole('button', { name: /Process Payroll Batch/ })).toBeVisible();
  await page.getByRole('button', { name: /Remove/ }).click();
  await expect(page.getByText('Drop your payroll file here')).toBeVisible();
});