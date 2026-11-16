// @ts-check
import { test, expect } from '@playwright/test';

const email = process.env.PLAYWRIGHT_TEST_EMAIL;
const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

test.beforeEach(() => {
  test.skip(!email || !password, 'Set dedicated test-account credentials to run authenticated browser tests.');
});

test('verifies sidebar navigation and settings pages', async ({ page }) => {
  // تسجيل الدخول أولاً
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
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByText('Drop your payroll file here')).toBeVisible();
});

// --- Test 3: تسجيل الخروج (Logout) ---
test('signs in successfully and logs out', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /Sign In/ }).click();

  await expect(page).toHaveURL(/\/dashboard$/);

  const logoutButton = page.getByRole('button', { name: /Logout|Sign Out/i }).first();
  await expect(logoutButton).toBeVisible();
  await logoutButton.click();

  await expect(page).toHaveURL(/\/login$/);
});

// --- Test 4: تغيير كلمة المرور (Settings Password Update) ---
test('navigates to settings and checks password inputs', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /Sign In/ }).click();

  await expect(page).toHaveURL(/\/dashboard$/);

  const settingsLink = page.getByRole('link', { name: 'Settings' }).first();
  await settingsLink.click();
  await expect(page).toHaveURL(/\/settings$/);

  const currentPassInput = page.locator('input[name="currentPassword"], input[type="password"]').first();
  await expect(currentPassInput).toBeVisible();
});

// --- Test 5: تفقد خطط الاشتراكات (Subscription Plans) ---
test('views subscription plans and checks pricing options', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /Sign In/ }).click();

  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole('link', { name: 'Subscription' }).click();
  await expect(page).toHaveURL(/\/subscription$/);

  await expect(page.getByRole('heading', { name: 'Business' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pro' })).toBeVisible();
});