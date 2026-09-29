# PayrollPro — Automated Payroll Processing & SaaS Platform

A full-stack SaaS application for automating payroll calculations for SMBs.

## Quick Start

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)
- npm or yarn

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend runs on http://localhost:5173 and proxies `/api` to http://localhost:5000.

---

## File Upload Format

Upload `.xlsx` or `.csv` files with these columns:

| Column | Required | Description |
|---|---|---|
| `Matricule` | ✅ | Employee ID |
| `Nom_Prenom` | ✅ | Full name |
| `Salaire_Base` | ✅ | Base salary |
| `Taux_Horaire` | ✅ | Hourly rate |
| `Heures_Retard` | ⬜ | Late hours |
| `Heures_Absence` | ⬜ | Absent hours |
| `Heures_Supp` | ⬜ | Overtime hours |
| `Prime` | ⬜ | Bonus |

## Payroll Formulas

```
Late Deduction      = Heures_Retard × Taux_Horaire
Absence Deduction   = Heures_Absence × Taux_Horaire
Overtime Bonus      = Heures_Supp × Taux_Horaire × 1.25
Net Salary          = Salaire_Base + Prime + Overtime Bonus - (Late + Absence Deductions)
```

## Subscription Tiers

| Plan | Employees | Price |
|---|---|---|
| Starter | ≤ 20 | Free |
| Business | ≤ 30 | $29/mo |
| Pro | ≤ 50 | $59/mo |
| Enterprise | Unlimited | Custom |

## API Endpoints

### Auth
- `POST /api/auth/register` — Register company
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user (auth required)
- `PUT /api/auth/change-password` — Change password (auth required)

### Payroll
- `POST /api/payroll/upload` — Upload & process payroll file (auth required)
- `GET /api/payroll` — List payroll records (auth required)
- `GET /api/payroll/:id` — Get single record (auth required)
- `DELETE /api/payroll/:id` — Delete record (auth required)
- `GET /api/payroll/dashboard/stats` — Dashboard stats (auth required)

### Reports
- `GET /api/reports/:payrollId/excel` — Download Excel report (auth required)
- `GET /api/reports/:payrollId/payslip/:matricule` — Download PDF payslip (auth required)

### Subscriptions
- `GET /api/subscriptions/plans` — List all plans
- `GET /api/subscriptions/current` — Get current subscription (auth required)
- `POST /api/subscriptions/upgrade` — Upgrade plan (auth required)

### Admin (role: `admin` required)
- `GET /api/admin/stats` — Admin dashboard aggregates (accounts, plans, revenue, activity)
- `GET /api/admin/users` — List all users
- `PATCH /api/admin/users/:id` — Update user (`isActive`, `role`, `companyName`)
- `DELETE /api/admin/users/:id` — Delete user + their payroll/payment history
- `GET /api/admin/companies` — List all companies with plan info
- `GET /api/admin/companies/:id` — Get one company
- `PATCH /api/admin/companies/:id/subscription` — Override plan/status/limit/expiry/trial (`extendDays` supported)
- `GET /api/admin/payments` — Global payment history (`?status=&plan=&page=&limit=`)
- `PATCH /api/admin/payments/:id` — Update payment status/notes

### Admin frontend routes
- `/dashboard` — Admins see the **Admin Dashboard**, other users see the payroll dashboard
- `/admin` — Admin dashboard overview
- `/admin/users` — User management (activate/deactivate, role, delete)
- `/admin/accounts` — Account management (plans, limits, trial/expiry)
- `/admin/payments` — Payment management (refund/fail/complete transactions)

---

## Tech Stack

**Backend:** Node.js, Express, MongoDB/Mongoose, JWT, Multer, XLSX, PDFKit

**Frontend:** React 18, Vite, Tailwind CSS, React Router, Chart.js, Lucide Icons, Axios
