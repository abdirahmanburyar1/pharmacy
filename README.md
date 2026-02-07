# Advanced Pharmacy POS System

A comprehensive Pharmacy Point of Sale and Inventory Management System with RBAC, workflow approvals, batch-based inventory, and audit logging.

## Features

- **RBAC**: Database-driven roles and permissions
- **Workflow Approvals**: Purchases, disposals, stock adjustments require approval
- **Batch Inventory**: FIFO batch tracking with expiry dates
- **POS**: Fast sales with barcode support, multiple payment methods
- **Audit Logging**: Complete audit trail for all actions
- **Reports**: Sales, profit, inventory valuation, expiry, disposal, and more

## Tech Stack

- **Backend**: NestJS, Prisma, PostgreSQL
- **Frontend**: React, TypeScript, Vite, Tailwind CSS

## Quick Start

1. **Prerequisites**: Node.js 20+, PostgreSQL 14+

2. **Install dependencies**:
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Configure database**: Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`

4. **Run migrations**:
   ```bash
   npm run db:migrate
   ```

5. **Seed initial data** (roles, permissions, admin user):
   ```bash
   npm run db:seed
   ```

6. **Start development**:
   ```bash
   npm run dev
   ```

- Backend: http://localhost:3000
- Frontend: http://localhost:5173

## Default Login

- Email: `admin@pharmacy.com`
- Password: `Admin123!`
