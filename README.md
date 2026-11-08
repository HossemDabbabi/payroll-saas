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

## User Stories & Acceptance Criteria

### 1. Authentication & Security
- **User Story**: As a company manager, I want to register an account and log in securely so that I can access my company's payroll operations.
- **Acceptance Criteria**:
  - [ ] Users can register with company details and log in using email/password.
  - [ ] JWT tokens are issued upon login and required for all protected endpoints.
  - [ ] Authenticated users can retrieve their profile details (`GET /api/auth/me`) and change their password (`PUT /api/auth/change-password`).

### 2. Payroll Upload & Calculation
- **User Story**: As a payroll manager, I want to upload monthly employee work files so that net salaries are calculated automatically without manual errors.
- **Acceptance Criteria**:
  - [ ] System accepts `.xlsx` and `.csv` files containing mandatory columns (`Matricule`, `Nom_Prenom`, `Salaire_Base`, `Taux_Horaire`) and optional columns (`Heures_Retard`, `Heures_Absence`, `Heures_Supp`, `Prime`).
  - [ ] Calculates Late Deduction ($Heures\_Retard \times Taux\_Horaire$), Absence Deduction ($Heures\_Absence \times Taux\_Horaire$), Overtime Bonus ($Heures\_Supp \times Taux\_Horaire \times 1.25$), and Net Salary.
  - [ ] Standard user can list, view, and delete their processed payroll records.

### 3. Reports & Payslip Exports
- **User Story**: As a manager, I want to download payroll reports and individual payslips so that I can distribute them to employees and accounting.
- **Acceptance Criteria**:
  - [ ] Users can download a summary Excel report for a full payroll batch (`GET /api/reports/:payrollId/excel`).
  - [ ] Users can download an individual PDF payslip per employee (`GET /api/reports/:payrollId/payslip/:matricule`).

### 4. Subscription Tiering & Upgrades
- **User Story**: As a growing business owner, I want to upgrade my subscription plan so that I can process payroll for more employees.
- **Acceptance Criteria**:
  - [ ] System enforces employee limits per plan (Starter: ≤20, Business: ≤30, Pro: ≤50, Enterprise: Unlimited).
  - [ ] Users can view available plans and upgrade their current tier (`POST /api/subscriptions/upgrade`).

### 5. Administrative Oversight
- **User Story**: As a system administrator, I want to manage platform users, companies, and subscriptions so that I can maintain platform health and support clients.
- **Acceptance Criteria**:
  - [ ] Admins accessing `/dashboard` or `/admin` are routed to the Admin Dashboard featuring aggregate stats (revenue, active accounts, plans).
  - [ ] Admins can activate/deactivate users, change user roles, delete accounts, and update payment transaction statuses.
  - [ ] Admins can override company plan limits, trial periods, and expiration dates (`PATCH /api/admin/companies/:id/subscription`).

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