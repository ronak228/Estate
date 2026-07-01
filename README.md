# Real Estate CRM — Phase 1 Foundation

## Overview
Multi-tenant Real Estate CRM built with Node.js/Express/PostgreSQL/Prisma (backend) and React/Tailwind/Vite (frontend).

---

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

---

## Environment Setup

### Backend — `backend/.env`
```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/real_estate_crm?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="8h"
PORT=5000
NODE_ENV=development
CLIENT_URL="http://localhost:5173"
```

Replace `YOUR_USER` and `YOUR_PASSWORD` with your PostgreSQL credentials.

---

## Installation & Setup

### 1. Create the database
```sql
CREATE DATABASE real_estate_crm;
```

### 2. Install backend dependencies
```bash
cd backend
npm install
```

### 3. Run database migrations
```bash
cd backend
npx prisma migrate dev --name init
```

### 4. Seed development data
```bash
cd backend
npx prisma db seed
```

### 5. Install frontend dependencies
```bash
cd frontend
npm install
```

---

## Running the Project

### Backend (Terminal 1)
```bash
cd backend
npm run dev
```
Backend runs on: `http://localhost:5000`

### Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
Frontend runs on: `http://localhost:5173`

---

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | admin@system.local | Admin@123 |
| ADMIN | admin@demoestate.local | Admin@123 |
| MANAGER | manager@demoestate.local | Manager@123 |
| SALES_EXECUTIVE | sales@demoestate.local | Sales@123 |

---

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma       # Prisma schema (Company, User models + enums)
│   └── seed.js             # Development seed data
├── src/
│   ├── controllers/
│   │   ├── authController.js       # Login, me, change-password, logout
│   │   └── companyController.js    # Company CRUD + Employee management
│   ├── middleware/
│   │   ├── authMiddleware.js       # authenticate + authorize(roles)
│   │   ├── errorMiddleware.js      # Centralized error handler
│   │   └── uploadMiddleware.js     # Multer file upload configs
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── companyRoutes.js
│   │   └── index.js                # Route aggregator
│   ├── utils/
│   │   ├── response.js             # sendSuccess / sendError helpers
│   │   └── slugify.js
│   ├── db.js                       # Shared Prisma client
│   └── server.js                   # Express app entry point
├── uploads/
│   ├── companies/                  # Company logos
│   └── documents/                  # Booking documents (future)
└── .env

frontend/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx       # Sidebar + Topbar shell
│   │   │   ├── Sidebar.jsx         # Role-filtered navigation
│   │   │   └── Topbar.jsx          # Company name + user menu
│   │   └── shared/                 # All reusable primitives
│   │       ├── Button.jsx
│   │       ├── ConfirmDialog.jsx
│   │       ├── DataTable.jsx
│   │       ├── Drawer.jsx
│   │       ├── EmptyState.jsx
│   │       ├── ErrorState.jsx
│   │       ├── FileUploader.jsx
│   │       ├── FilterBar.jsx
│   │       ├── FormLayout.jsx
│   │       ├── Input.jsx
│   │       ├── LoadingState.jsx
│   │       ├── Modal.jsx
│   │       ├── PageHeader.jsx
│   │       ├── PageLayout.jsx
│   │       ├── Pagination.jsx
│   │       ├── ProtectedRoute.jsx
│   │       ├── SearchBar.jsx
│   │       ├── Select.jsx
│   │       └── StatusBadge.jsx
│   ├── context/
│   │   └── AuthContext.jsx         # JWT auth state + login/logout
│   ├── pages/
│   │   ├── Auth/
│   │   │   ├── LoginPage.jsx
│   │   │   └── ForbiddenPage.jsx
│   │   ├── Company/
│   │   │   ├── CompanyListPage.jsx     # SUPER_ADMIN company list
│   │   │   ├── CompanyForm.jsx         # Create company + admin
│   │   │   └── CompanySettingsPage.jsx # ADMIN settings/branding
│   │   ├── Dashboard/
│   │   │   └── DashboardPage.jsx
│   │   ├── Employee/
│   │   │   ├── EmployeePage.jsx        # Employee list + actions
│   │   │   ├── EmployeeForm.jsx        # Create/edit employee
│   │   │   └── ResetPasswordForm.jsx
│   │   └── Profile/
│   │       └── ProfilePage.jsx         # Change password
│   ├── services/
│   │   ├── authService.js
│   │   └── companyService.js
│   ├── utils/
│   │   ├── axios.js                # Axios instance + auth interceptors
│   │   └── format.js               # Date/currency/string formatters
│   ├── App.jsx
│   └── AppRoutes.jsx               # All routes with ProtectedRoute guards
└── index.html
```

---

## API Endpoints Implemented

### Auth
| Method | Path | Auth |
|--------|------|------|
| POST | /api/auth/login | Public |
| GET | /api/auth/me | Any authenticated |
| POST | /api/auth/change-password | Any authenticated |
| POST | /api/auth/logout | Any authenticated |

### Companies
| Method | Path | Roles |
|--------|------|-------|
| POST | /api/companies | SUPER_ADMIN |
| GET | /api/companies | SUPER_ADMIN |
| GET | /api/companies/:id | SUPER_ADMIN |
| PATCH | /api/companies/:id/status | SUPER_ADMIN |
| PATCH | /api/companies/:id/admin | SUPER_ADMIN |
| GET | /api/companies/me | ADMIN, MANAGER, SALES_EXECUTIVE |
| PUT | /api/companies/me/settings | ADMIN |
| POST | /api/companies/me/employees | ADMIN |
| GET | /api/companies/me/employees | ADMIN, MANAGER |
| PUT | /api/companies/me/employees/:id | ADMIN |
| PATCH | /api/companies/me/employees/:id/status | ADMIN |
| PATCH | /api/companies/me/employees/:id/reset-password | ADMIN |

---

## Prisma Models
- `Company` — tenant, CompanyStatus enum (ACTIVE/SUSPENDED), slug, timezone, currency, branding
- `User` — Role enum (SUPER_ADMIN/ADMIN/MANAGER/SALES_EXECUTIVE), bcrypt password, company FK

---

## Phase 2 Notes
To add a new CRM module:
1. Add models to `prisma/schema.prisma` with `companyId` FK
2. Run `npx prisma migrate dev --name add-{module}`
3. Create `src/controllers/{module}Controller.js`
4. Create `src/routes/{module}Routes.js`
5. Register in `src/routes/index.js`
6. Build frontend pages under `frontend/src/pages/{Module}/`
7. Add route to `AppRoutes.jsx` and sidebar nav entry to `Sidebar.jsx`
