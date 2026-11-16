# PayrollPro Test Plan

## Purpose and setup

This plan covers payroll calculation/import, authentication and authorization, payroll access, and the payroll assistant. It is intended for both manual testing and regression automation.

Prerequisites: Node.js 18+, dependencies installed in `backend`, `frontend`, and the repository root. The automated Jest and Vitest suites do not require MongoDB. Authenticated browser workflows require the backend, MongoDB, and a dedicated synthetic test account. Do not use production accounts or upload real employee or payroll information to AI tools.

Run the frontend component tests from the repository root:

```bash
npm run test:frontend
```

Run the backend tests from the repository root:

```bash
npm run test:backend
```

The frontend tests cover the existing login page render, successful submission/navigation, and displayed API errors. Backend route tests use Supertest against the existing Express routes without connecting to MongoDB; existing calculation and copilot controller tests remain in place.

Run the unauthenticated browser smoke tests in Chromium:

```bash
npm run test:e2e -- tests/example.spec.js --project=chromium
```

Run the frontend build from `frontend/`:

```bash
npm run build
```

The Playwright configuration starts the Vite development server. MongoDB is not required for these unauthenticated smoke tests. The HTML report and failure screenshots are written under `reports/playwright/` and are git-ignored.

For authenticated browser flows, set `PLAYWRIGHT_TEST_EMAIL` and `PLAYWRIGHT_TEST_PASSWORD` to a dedicated synthetic test account, start the backend and MongoDB, then run:

```bash
npm run test:e2e -- tests/auth.spec.js tests/payroll-flow.spec.js --project=chromium
```

The authenticated tests are skipped when either variable is missing. Never commit test credentials or use a production account.

## Test cases

| ID | Type | Scenario and steps | Expected result | Result / evidence |
|---|---|---|---|---|
| UI-01 | Automated | Open `/login` in Chromium. | PayrollPro login heading, email/password fields, sign-in button, and registration link are visible. | TBD |
| UI-02 | Automated | Open `/payroll` with a clean browser context and no saved token. | App redirects to `/login`; protected payroll content is not shown. | TBD |
| AUTH-04 | Automated | With a valid test account and backend/database running, fill in email and password on `/login` and submit. | Browser redirects to `/dashboard` and shows no login error. | TBD |
| PAY-01 | Automated | Calculate Tunisian tax for 1,000 TND gross with no advance. | CNSS 91.8, IRPP 104.185, net 804.015, matching the current unit test. | TBD |
| PAY-02 | Automated | Calculate Tunisian tax for 3,000 TND gross with no advance. | CNSS 275.4, IRPP 576.872, net 2,147.728, matching the current unit test. | TBD |
| PAY-03 | Automated | Calculate employee payroll with base 2,000, hourly rate 10, one late hour, four overtime hours, and 150 bonus. | Late deduction is 10, overtime bonus is 50, and net salary uses the calculated tax; matching the current unit test. | TBD |
| PAY-04 | Manual / add automation | Upload an empty file, a file with no data rows, and a file missing a required column. | Each invalid file is rejected with a useful error; no payroll record is created. | TBD |
| PAY-05 | Manual / add automation | Upload valid CSV and XLSX files, including optional blank fields and numeric strings with decimal/thousands separators. | Rows are parsed consistently and the summary agrees with employee-level amounts. | TBD |
| PAY-06 | Manual / add automation | Upload a row with a negative or malformed number and a row with missing employee identity. | Invalid numbers default to zero with a row error; missing identity is flagged and represented with a fallback value; errors identify the row. | TBD |
| PAY-07 | Manual / add automation | Supply positive CNSS/IRPP overrides and a salary advance. | Overrides are used, advance reduces net salary, and totals remain internally consistent. | TBD |
| AUTH-01 | Manual / add automation | Register with missing fields, a short password, a valid account, then the same email again. | Invalid requests are rejected; valid registration succeeds; duplicate email is rejected. | TBD |
| AUTH-02 | Manual / add automation | Sign in with wrong credentials and with a deactivated account. | Wrong credentials are rejected; deactivated account is denied. | TBD |
| AUTH-03 | Manual / add automation | As a normal company user, call an admin endpoint; then call it as an administrator. | Normal user is denied; administrator is allowed. | TBD |
| DATA-01 | Manual / add automation | Create two company accounts; as each, list and request the other company's payroll record. | A company can access only its own payroll records; other-company data is not disclosed. | TBD |
| REPORT-01 | Manual / add automation | Download an Excel report and PDF payslip for a valid payroll record, then request an unknown ID/employee. | Valid downloads open and contain the selected record; unknown resources return a not-found response. | TBD |
| COP-01 | Automated | Submit a blank assistant query. | HTTP/controller response indicates the query is required; matching the current unit test. | TBD |
| COP-02 | Automated | Ask for a known employee from the latest record and an unknown employee. | The known employee is summarized from the record; unknown employee receives a clear not-found answer; matching current controller tests. | TBD |
| COP-03 | Manual / add automation | Ask a payroll/tax question when there is no payroll record. | The assistant returns a relevant fallback and does not invent company-specific figures. | TBD |

## Execution and defect tracking

For every run, record date, tester, commit, environment, exact command or manual steps, pass/fail/blocked status, and a link or sanitized screenshot/log. For each defect, record reproduction steps, expected and actual behavior, severity, issue/commit reference, and retest result. Replace `TBD` only with observed results; keep failures and blocked cases visible.

## Current automation gaps

The checked-in automated suites cover login UI behavior, payroll calculations, selected payroll-assistant controller responses, subscription plan listing, registration input validation, JWT authentication with mocked user lookups, unauthenticated route protection, admin-role middleware, and not-found handling. Playwright covers unauthenticated smoke behavior and credential-gated navigation/payroll UI flows. Database-backed authentication/authorization, payroll persistence and tenant isolation, report downloads, subscription upgrades, and file-upload processing still require isolated database-backed test infrastructure or manual execution. No integration test connects to MongoDB because server startup currently connects to the configured database on import.