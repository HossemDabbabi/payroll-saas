// @ts-check
import { test, expect } from '@playwright/test';
import { signInWithMock, mockJson } from './helpers/mockApi.js';

// Negative upload scenarios (PAY-04). Session and API are mocked.

const csv = (name, body, mimeType = 'text/csv') => ({ name, mimeType, buffer: Buffer.from(body) });

test.describe('payroll upload: negative cases', () => {
  test.beforeEach(async ({ page }) => {
    await signInWithMock(page);
    await page.goto('/upload');
    await expect(page.getByRole('heading', { name: 'Upload Payroll File' })).toBeVisible();
  });

  test('unsupported extension (.pdf) is refused client-side', async ({ page }) => {
    let uploads = 0;
    await page.route('**/api/payroll/upload', (route) => { uploads += 1; return route.abort(); });

    let dialogMessage = '';
    page.once('dialog', async (d) => { dialogMessage = d.message(); await d.dismiss(); });
    await page.locator('input[type="file"]').setInputFiles(csv('payroll.pdf', '%PDF-1.4', 'application/pdf'));
    await expect.poll(() => dialogMessage).toMatch(/Only \.xlsx, \.xls, or \.csv/);

    await expect(page.getByText('Drop your payroll file here')).toBeVisible();
    await expect(page.getByRole('button', { name: /Process Payroll Batch/ })).toBeDisabled();
    expect(uploads).toBe(0);
  });

  test('file with missing required column: server error is displayed', async ({ page }) => {
    await mockJson(page, '**/api/payroll/upload', 400,
      { success: false, message: 'Missing required column: Taux_Horaire' }, 'POST');
    await page.locator('input[type="file"]').setInputFiles(csv('bad.csv', 'Matricule,Nom_Prenom,Salaire_Base\nQA-001,Test,1000\n'));
    await page.getByRole('button', { name: /Process Payroll Batch/ }).click();

    await expect(page.getByText('Processing Error')).toBeVisible();
    await expect(page.getByText('Missing required column: Taux_Horaire').first()).toBeVisible();
    await expect(page).toHaveURL(/\/upload$/);
  });

  test('file too large (413) shows an error and stays on the page', async ({ page }) => {
    await mockJson(page, '**/api/payroll/upload', 413, { success: false, message: 'File too large.' }, 'POST');
    await page.locator('input[type="file"]').setInputFiles(csv('big.csv', 'Matricule,Nom_Prenom,Salaire_Base,Taux_Horaire\nQA-001,Test,1000,10\n'));
    await page.getByRole('button', { name: /Process Payroll Batch/ }).click();

    await expect(page.getByText('Processing Error')).toBeVisible();
    await expect(page.getByText('File too large.').first()).toBeVisible();
  });

  test('duplicate matricule (409) is reported', async ({ page }) => {
    await mockJson(page, '**/api/payroll/upload', 409, { success: false, message: 'Duplicate matricule: QA-001' }, 'POST');
    await page.locator('input[type="file"]').setInputFiles(
      csv('dup.csv', 'Matricule,Nom_Prenom,Salaire_Base,Taux_Horaire\nQA-001,A,1000,10\nQA-001,B,1000,10\n'));
    await page.getByRole('button', { name: /Process Payroll Batch/ }).click();

    await expect(page.getByText('Duplicate matricule: QA-001').first()).toBeVisible();
    await expect(page.getByText('Payroll Batch Processed Successfully!')).toHaveCount(0);
  });
});
