# Advanced Pharmacy POS System

A comprehensive Pharmacy Point of Sale and Inventory Management System built with **Next.js** and **PostgreSQL** (Neon).

## Features

- **RBAC**: Database-driven roles and permissions
- **Workflow Approvals**: Purchases, disposals, stock adjustments require approval
- **Batch Inventory**: FIFO batch tracking with expiry dates
- **POS**: Fast sales with barcode support, cart, multiple payment methods
- **Audit Logging**: Complete audit trail for all actions
- **Reports**: Daily sales, profit, inventory valuation, expiry, low stock, top-selling

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: JWT (jose)

## Quick Start

1. **Install**: `npm install`
2. **Configure**: Copy `.env.example` to `.env` and set `DATABASE_URL`, `JWT_SECRET`
3. **Database**: `npm run db:migrate` then `npm run db:seed`
4. **Run**: `npm run dev` → http://localhost:3000

## Default Login

- **Email**: admin@pharmacy.com
- **Password**: Admin123!

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Sign in |
| `/dashboard` | Overview stats |
| `/dashboard/pos` | Point of sale (barcode, cart, payments) |
| `/dashboard/products` | Product management |
| `/dashboard/purchases` | Create & approve purchases |
| `/dashboard/disposals` | Create & approve disposals |
| `/dashboard/adjustments` | Stock adjustments |
| `/dashboard/reports` | Sales, profit, inventory reports |
| `/dashboard/users` | User list |
| `/dashboard/roles` | Roles & permissions |

## API Routes

All API routes require `Authorization: Bearer <token>` except `POST /api/auth/login`.

- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user
- `GET/POST /api/products` - Products
- `GET /api/products/barcode/[barcode]` - Lookup by barcode
- `GET /api/suppliers` - Suppliers
- `GET/POST /api/purchases` - Purchases + submit/approve/reject
- `GET/POST /api/sales` - Sales (POS)
- `GET/POST /api/disposals` - Disposals + submit/approve/reject
- `GET/POST /api/adjustments` - Adjustments + submit/approve/reject
- `GET /api/reports/*` - Reports
- `GET /api/users` - Users
- `GET /api/roles` - Roles
- `GET /api/audit` - Audit logs

## Permissions

- `sell_medicine` - POS sales
- `view_sales` - View sales
- `create_purchase` - Create purchases
- `approve_purchase` - Approve purchases
- `dispose_stock` - Create disposals
- `approve_disposal` - Approve disposals
- `adjust_stock` - Create adjustments
- `approve_adjustment` - Approve adjustments
- `view_reports` - Reports
- `manage_products` - Products
- `manage_users` - Users
- `manage_roles` - Roles
- `view_audit_logs` - Audit logs
