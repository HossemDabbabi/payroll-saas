<!-- Update branch -->
# PayrollPro — Automated Payroll Processing & SaaS Platform

A full-stack SaaS application designed to automate payroll calculations, streamline employee file management, and provide administrative oversight for Small and Medium Enterprises (SMBs).

---

## Core Features

- **Automated Payroll Processing**: Bulk processing of employee payroll via `.xlsx` or `.csv` file uploads.
- **Dynamic Salary Calculations**: Automated computation of late deductions, absence deductions, overtime bonuses, and net salaries based on configured rates.
- **Tiered Subscription Plans**: Access control and feature limits tied to subscription tiers (Starter, Business, Pro, Enterprise).
- **Report & Document Generation**: Export detailed Excel reports for entire payroll batches and individual PDF payslips for employees.
- **Admin Management Portal**: High-level platform dashboard with user account management, company plan overrides, subscription controls, and global transaction management.
- **Role-Based Access Control (RBAC)**: Secure routes and features segmented by user roles (Standard Users vs. Platform Admins).

---

## Quick Start

### Prerequisites

- **Node.js**: >= 18.x
- **npm**: >= 9.x
- **MongoDB**: 7.x (local service or MongoDB Atlas cluster)
- **Docker & Docker Compose**: (optional, for containerized run)

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env     # Configure MONGODB_URI and JWT_SECRET
npm run dev              # Runs on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev              # Runs on http://localhost:5173 (proxies API to :5000)
```

### 3. Docker Compose (All-in-one)

```bash
# Provide a secure JWT secret for containerized environment
export JWT_SECRET="your_secure_random_jwt_secret_key"

# Build and start all services (MongoDB, Backend, Frontend)
docker compose up --build

# Services:
# - Frontend: http://localhost:5173
# - Backend:  http://localhost:5000
# - MongoDB:  mongodb://localhost:27017
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` before launching the application. **Never commit `.env` to version control.**

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Port on which Express API server listens |
| `NODE_ENV` | No | `development` | Runtime environment (`development`, `production`, `test`) |
| `MONGODB_URI` | **Yes** | — | MongoDB connection string (e.g. `mongodb://localhost:27017/payroll_saas`) |
| `JWT_SECRET` | **Yes** | — | Secret string used to sign and verify JSON Web Tokens (min 32 chars recommended) |
| `JWT_EXPIRES_IN` | No | `7d` | Lifetime of issued JWT authentication tokens (e.g. `7d`, `24h`) |
| `FRONTEND_URL` | No | `http://localhost:5173` | Allowed origin for CORS headers |
| `MAX_FILE_SIZE` | No | `10485760` | Maximum upload size in bytes (default 10 MB) |
| `UPLOAD_PATH` | No | `./uploads` | Filesystem directory storing uploaded Excel/CSV files |
| `STRIPE_SECRET_KEY` | No | — | Stripe API secret key for payment processing |
| `STRIPE_WEBHOOK_SECRET` | No | — | Stripe webhook secret signature for validating billing events |

---

## User Stories & Acceptance Criteria

> `[x]` = verified by automated tests (see `TEST_PLAN.md`). `[ ]` = not verified yet.

### 1. Authentication & Security
- **User Story**: As a company manager, I want to register an account and log in securely so that I can access my company's payroll operations.
- **Acceptance Criteria**:
  - [x] Users can register with company details and log in using email/password.
  - [x] JWT tokens are issued upon login and required for all protected endpoints.
  - [x] Authenticated users can retrieve their profile details (`GET /api/auth/me`) and change their password (`PUT /api/auth/change-password`).

### 2. Payroll Upload & Calculation
- **User Story**: As a payroll manager, I want to upload monthly employee work files so that net salaries are calculated automatically without manual errors.
- **Acceptance Criteria**:
  - [x] System accepts `.xlsx` and `.csv` files containing mandatory columns (`Matricule`, `Nom_Prenom`, `Salaire_Base`, `Taux_Horaire`) and optional columns (`Heures_Retard`, `Heures_Absence`, `Heures_Supp`, `Prime`).
  - [x] Calculates Late Deduction ($Heures\_Retard \times Taux\_Horaire$), Absence Deduction ($Heures\_Absence \times Taux\_Horaire$), Overtime Bonus ($Heures\_Supp \times Taux\_Horaire \times 1.25$), and Net Salary.
  - [ ] Standard user can list, view, and delete their processed payroll records.

### 3. Reports & Payslip Exports
- **User Story**: As a manager, I want to download payroll reports and individual payslips so that I can distribute them to employees and accounting.
- **Acceptance Criteria**:
  - [ ] Users can download a summary Excel report for a full payroll batch (`GET /api/reports/:payrollId/excel`).
  - [ ] Users can download an individual PDF payslip per employee (`GET /api/reports/:payrollId/payslip/:matricule`).

### 4. Subscription Tiering & Upgrades
- **User Story**: As a growing business owner, I want to upgrade my subscription plan so that I can process payroll for more employees.
- **Acceptance Criteria**:
  - [x] System enforces employee limits per plan (Starter: ≤20, Business: ≤30, Pro: ≤50, Enterprise: Unlimited).
  - [ ] Users can view available plans and upgrade their current tier (`POST /api/subscriptions/upgrade`).

### 5. Administrative Oversight
- **User Story**: As a system administrator, I want to manage platform users, companies, and subscriptions so that I can maintain platform health and support clients.
- **Acceptance Criteria**:
  - [ ] Admins accessing `/dashboard` or `/admin` are routed to the Admin Dashboard featuring aggregate stats (revenue, active accounts, plans).
  - [ ] Admins can activate/deactivate users, change user roles, delete accounts, and update payment transaction statuses.
  - [ ] Admins can override company plan limits, trial periods, and expiration dates (`PATCH /api/admin/companies/:id/subscription`).

---

## Business Rules Found During Testing

These rules were not written in the first version of this specification. They were discovered while testing and are now implemented and covered by tests.

- **Tunisian number format**: TND has three decimals, so `7.500` means 7.5. A dot is a thousands separator only in `1.234.567` or `1.234,50`.
- **Taxes**: CNSS and IRPP are calculated from the gross salary unless the file provides positive overrides.
- **Negative net salary**: it is capped at 0 and the row gets a warning.
- **Duplicate matricules**: every repeated row is flagged in the processing errors.
- **Upload**: only `.xlsx`, `.xls` and `.csv` are accepted (extension AND mimetype must match); an invalid file returns 400, a file that is too large returns 413. Rejected files are deleted from disk.
- **Period**: `month` and `year` must be integers (month 1 to 12, year 2000 to 2100).
- **Pagination**: `page` is at least 1 and `limit` is between 1 and 100 (10 by default).
- **Errors**: stack traces are only returned when `NODE_ENV` is `development`.

---

## Technology Stack

- **Backend**: Node.js, Express.js, MongoDB / Mongoose, JWT (Authentication), Multer (File Handling), XLSX (Excel Parsing/Generation), PDFKit (PDF Generation)
- **Frontend**: React 18, Vite, Tailwind CSS, React Router, Chart.js, Lucide Icons, Axios

---

## Quick Start

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)
- npm or yarn

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env # Edit .env with your MongoDB URI and JWT secret
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173 (proxies /api to http://localhost:5000)
```

---

## Testing

| Layer | Tool | Command |
|---|---|---|
| Backend unit / API | Jest + Supertest | `cd backend && npm test -- --runInBand` (includes coverage report in `backend/coverage/`) |
| Browser (E2E) | Playwright | `npx playwright test --project=chromium` (from the repo root) |
| Lint | ESLint | `npx eslint tests` |

Tests that need a real account (`tests/auth.spec.js`, `tests/payroll-flow.spec.js`) read `PLAYWRIGHT_TEST_EMAIL` and `PLAYWRIGHT_TEST_PASSWORD` from the environment and are skipped when they are not set. Never commit credentials.

See `TEST_PLAN.md` for the test plan and results, `AI_LOG.md` for the AI interaction log, and `PERFORMANCE_REVIEW.md` for the performance review.
