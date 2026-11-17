# PayrollPro Test Plan

## Purpose and setup

This plan covers payroll calculation/import, authentication and authorization, payroll access, and the payroll assistant. It is intended for both manual testing and regression automation.

Prerequisites: Node.js 18+, dependencies installed in `backend`, `frontend`, and the repository root, and MongoDB running for database-backed scenarios. Use a disposable test database and synthetic employee data only. Do not upload real employee or payroll information to AI tools.

Run the backend unit tests from `backend/`:

```bash
npm test -- --runInBand
```

Run the frontend build from `frontend/`:

```bash
npm run build
```

Run the local browser smoke tests from the repository root:

```bash
npx playwright test --project=chromium
```

The Playwright configuration starts the Vite development server. MongoDB and the backend are not required for the smoke tests and for the negative tests (`auth-negative.spec.js`, `upload-negative.spec.js`), because those mock the API with `page.route`.

For the authenticated login test, start the backend and MongoDB, and provide a valid test account through `PLAYWRIGHT_TEST_EMAIL` and `PLAYWRIGHT_TEST_PASSWORD` in the shell or CI secret store. Then run:

```bash
npx playwright test tests/auth.spec.js --project=chromium
```

The authenticated tests (`auth.spec.js`, `payroll-flow.spec.js`) are skipped when either variable is missing. Never commit test credentials or use a production account.

## Test cases

| ID | Type | Scenario and steps | Expected result | Result / evidence |
|---|---|---|---|---|
| UI-01 | Automated | Open `/login` in Chromium. | PayrollPro login heading, email/password fields, sign-in button, and registration link are visible. | Pass (2026-11-17, Chromium, `example.spec.js`) |
| UI-02 | Automated | Open `/payroll` with a clean browser context and no saved token. | App redirects to `/login`; protected payroll content is not shown. | Pass (2026-11-17, Chromium, `example.spec.js`) |
| UI-03 | Automated | Submit wrong credentials (mocked 401) on `/login`. | Error message stays visible, URL stays `/login`, no token stored. | Pass (`auth-negative.spec.js`) |
| UI-04 | Automated | Submit an empty form and a malformed email. | Browser validation blocks the submit; no API request is sent. | Pass (`auth-negative.spec.js`) |
| UI-05 | Automated | Select a `.pdf` file on `/upload`. | Client refuses the file (alert), submit button stays disabled, no request sent. | Pass (`upload-negative.spec.js`) |
| UI-06 | Automated | Upload with API errors 400 (missing column), 413 (too large), 409 (duplicate). | "Processing Error" card shows the server message; user stays on `/upload`. | Pass (`upload-negative.spec.js`) |
| AUTH-04 | Automated | With a valid test account and backend/database running, fill in email and password on `/login` and submit. | Browser redirects to `/dashboard` and shows no login error. | Not executed in CI: skipped unless `PLAYWRIGHT_TEST_EMAIL/PASSWORD` and a live backend are provided (`auth.spec.js`) |
| PAY-01 | Automated | Calculate Tunisian tax for 1,000 TND gross with no advance. | CNSS 91.8, IRPP 104.185, net 804.015, matching the current unit test. | Pass (Jest, `payroll.unit.test.js`) |
| PAY-02 | Automated | Calculate Tunisian tax for 3,000 TND gross with no advance. | CNSS 275.4, IRPP 576.872, net 2,147.728, matching the current unit test. | Pass (Jest, `payroll.unit.test.js`) |
| PAY-03 | Automated | Calculate employee payroll with base 2,000, hourly rate 10, one late hour, four overtime hours, and 150 bonus. | Late deduction is 10, overtime bonus is 50, and net salary uses the calculated tax; matching the current unit test. | Pass (Jest, `payroll.unit.test.js`) |
| PAY-04 | Manual / add automation | Upload an empty file, a file with no data rows, and a file missing a required column. | Each invalid file is rejected with a useful error; no payroll record is created. | Partial. Pass for wrong extension, missing column, oversize (413), duplicate (409): `upload-negative.spec.js` (mocked API) + `payroll.middleware/controller.test.js`. Truly empty XLSX not automated |
| PAY-05 | Manual / add automation | Upload valid CSV and XLSX files, including optional blank fields and numeric strings with decimal/thousands separators. | Rows are parsed consistently and the summary agrees with employee-level amounts. | Not run |
| PAY-06 | Manual / add automation | Upload a row with a negative or malformed number and a row with missing employee identity. | Invalid numbers default to zero with a row error; missing identity is flagged and represented with a fallback value; errors identify the row. | Partial. Pass for malformed numbers and TND format (bugs #3, #5 fixed), Jest. Missing-identity row not automated |
| PAY-07 | Manual / add automation | Supply positive CNSS/IRPP overrides and a salary advance. | Overrides are used, advance reduces net salary, and totals remain internally consistent. | Not run |
| AUTH-01 | Manual / add automation | Register with missing fields, a short password, a valid account, then the same email again. | Invalid requests are rejected; valid registration succeeds; duplicate email is rejected. | Pass (Supertest, `auth.api.test.js`: missing fields, 7/8-char boundary, duplicate email) |
| AUTH-02 | Manual / add automation | Sign in with wrong credentials and with a deactivated account. | Wrong credentials are rejected; deactivated account is denied. | Pass. API (`auth.api.test.js`) and UI (`auth-negative.spec.js`). The UI test found bug #12 (page reload hid the error message), now fixed |
| AUTH-03 | Manual / add automation | As a normal company user, call an admin endpoint; then call it as an administrator. | Normal user is denied; administrator is allowed. | Partial. `adminOnly` middleware unit-tested (hr_manager 403, admin next); no end-to-end admin route call |
| DATA-01 | Manual / add automation | Create two company accounts; as each, list and request the other company's payroll record. | A company can access only its own payroll records; other-company data is not disclosed. | Not run |
| REPORT-01 | Manual / add automation | Download an Excel report and PDF payslip for a valid payroll record, then request an unknown ID/employee. | Valid downloads open and contain the selected record; unknown resources return a not-found response. | Not run |
| COP-01 | Automated | Submit a blank assistant query. | HTTP/controller response indicates the query is required; matching the current unit test. | Pass (Jest, `copilot.controller.test.js`, now executed by `npm test`) |
| COP-02 | Automated | Ask for a known employee from the latest record and an unknown employee. | The known employee is summarized from the record; unknown employee receives a clear not-found answer; matching current controller tests. | Pass (Jest, `copilot.controller.test.js`) |
| COP-03 | Manual / add automation | Ask a payroll/tax question when there is no payroll record. | The assistant returns a relevant fallback and does not invent company-specific figures. | Not run |

## Execution and defect tracking

For every run, record date, tester, commit, environment, exact command or manual steps, pass/fail/blocked status, and a link or sanitized screenshot/log. For each defect, record reproduction steps, expected and actual behavior, severity, issue/commit reference, and retest result. Replace `TBD` only with observed results; keep failures and blocked cases visible.

## Latest run (2026-11-17)

| Suite | Result |
|---|---|
| Jest (backend, `npm test`) | 8 suites, 135 tests: all pass. Coverage: statements 54.84 %, branches 38.39 %, functions 44.68 %, lines 56.2 % |
| Playwright (Chromium) | 11 passed, 3 skipped (credential-gated: `auth.spec.js`, `payroll-flow.spec.js` x2) |
| ESLint (`tests/`) | no error |
| Frontend `vite build` | OK |

## Current automation gaps

- Low coverage: `admin.controller.js` (10 %), `report.controller.js` (9 %), `subscription.controller.js` (11 %), `adminGuard.js` (19 %), `User.js` model (32 %).
- Not automated: valid CSV/XLSX happy path end to end, Excel/PDF downloads, data isolation between companies (DATA-01), subscription upgrade, assistant fallback (COP-03).
- Authenticated browser tests need a live backend, MongoDB and a test account; they are not run in CI yet (a MongoDB service container would be needed).
- Only Chromium is exercised in CI; Firefox and WebKit projects exist but are not run.
