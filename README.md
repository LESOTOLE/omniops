# OmniOps — B2B Operations & Multi-Store Inventory Platform

OmniOps is an integrated enterprise operational and retail distribution management system designed to handle multi-warehouse inventory, Point of Sale (POS) checkouts, and real-time audit trail telemetry.

---

## 🏗️ Architecture Overview

The system adopts a decoupled client-server architecture:
- **Client Tier (`frontend/`):** Next.js 15 (React 19 App Router), TypeScript, Tailwind CSS, Lucide Icons, and Zustand state store.
- **API Tier (`backend/`):** NestJS modular enterprise API, TypeScript, Validation Pipes (class-validator), global interceptors, and Swagger OpenAPI documentation.
- **Relational Persistence (ACID):** MySQL via Prisma ORM for structured transactional business logic (Users, Roles, Warehouses, Products, Inventories, Orders, Stock Transfers).
- **Document / Log Persistence:** MongoDB (Atlas / non-blocking fallback buffer) via Mongoose for high-throughput audit logging.

```
                    ┌─────────────────────────┐
                    │   Next.js 15 Frontend   │
                    │  (Dashboard, POS, Cat)  │
                    └───────────┬─────────────┘
                                │ HTTP / REST (JWT)
                                ▼
                    ┌─────────────────────────┐
                    │      NestJS Engine      │
                    │  (Guards, Pipes, Auth)  │
                    └─────┬─────────────┬─────┘
                          │             │
       Prisma Transactions│             │Async Audit Logs
                          ▼             ▼
                 ┌──────────────┐ ┌──────────────┐
                 │ MySQL 8 / DB │ │MongoDB Atlas │
                 │  (omniops_db)│ │ (Audit Logs) │
                 └──────────────┘ └──────────────┘
```

---

## 👥 Demo Accounts & Role-Based Access Control (RBAC)

All accounts share the default password: **`admin123`**

| Role | Email Address | Access Level & Scopes |
|---|---|---|
| **Super Admin** | `admin@omniops.com` | Full administrative control, warehouse configuration, user management, global reports, and audit logs. |
| **Warehouse Manager** | `manager@omniops.com` | Inter-warehouse stock transfers, stock adjustments (opname), inventory monitoring. |
| **Cashier / Operator** | `cashier@omniops.com` | Daily retail POS terminal operations, product barcode lookup, receipt printing. |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v20.x or higher
- **MySQL Server**: Running on `localhost:3306` (e.g. XAMPP, Laragon, or standalone MySQL) with database `omniops_db`
- **MongoDB**: (Optional) MongoDB Atlas connection string in `.env` (a fallback in-memory buffer is active if not configured)

### 2. Backend Setup (`backend/`)
```bash
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Ensure DATABASE_URL="mysql://root:@localhost:3306/omniops_db" matches your MySQL credentials

# Run database migrations
npx prisma migrate dev

# Seed database with initial roles, users, warehouses, and product catalog
npx prisma db seed

# Run NestJS in development watch mode (Port 4000)
npm run start:dev
```
- API Base URL: `http://localhost:4000/api`
- Interactive Swagger OpenAPI Docs: `http://localhost:4000/api/docs`

### 3. Frontend Setup (`frontend/`)
```bash
cd frontend

# Install dependencies
npm install

# Run Next.js in development mode (Port 3000)
npm run dev
```
- Open your browser at: `http://localhost:3000`
- Use the 1-click **Quick Login Demo Accounts** on the login page to sign in immediately.

### 4. Running from Root
From the root repository directory:
```bash
# Start backend
npm run dev:backend

# Start frontend (in a separate terminal)
npm run dev:frontend
```

---

## 📦 Key Functional Modules

### 1. Executive Analytics Dashboard (`/dashboard`)
- Real-time gross revenue telemetry, completed transaction counts, low stock warnings, and total registered SKUs.
- Interactive 7-day revenue trend chart powered by Recharts.
- Top 5 best-selling products leaderboard.
- Filter metrics globally or drill down by individual warehouse branch.

### 2. Inventory & Product Master (`/inventory`)
- Master catalog management with SKU, Barcode, Category, Buy/Sell Pricing.
- Instant search bar and category filters.
- Stock breakdown per warehouse branch with automated Low Stock warning badges.
- Stock Opname modal for manual stock adjustments with recorded audit reasons.
- Full product CRUD modal validated with Zod and React Hook Form.

### 3. Inter-Warehouse Stock Transfers (`/transfers`)
- Transfer inventory between distribution centers and retail stores.
- Status lifecycle: `PENDING` ➔ `APPROVED` ➔ `COMPLETED` / `REJECTED`.
- Atomic `$transaction` on completion ensures source stock is deducted and destination stock is increased simultaneously without discrepancies.

### 4. Point of Sale (POS) Terminal (`/pos`)
- Responsive cash register interface designed for barcode scanners and touchscreen tablets.
- Instant barcode lookup: scanning adds products directly to the cart.
- Zustand reactive shopping cart with item quantity adjustments.
- Subtotal, global discount deductions, and 11% PPN tax calculations.
- Cash tendered buttons with automatic change calculation.
- Thermal receipt generator modal ready for printing.

### 5. Audit Trail & Activity Logs (`/audit-logs`)
- Asynchronous immutable logging for every sensitive operation (login, product mutations, manual stock adjustments, POS sales, and stock transfers).
- Filter by entity type or user email.
- Built-in JSON Payload Inspector displaying exact before/after state diffs.

---

## 🔒 Security & Code Standards

- **Strict TypeScript:** No `any` type annotations; strict type checking across both frontend and backend.
- **Defensive DTO Validation:** All request payloads are validated via `class-validator` pipes before reaching controllers.
- **Password Protection:** Cryptographically hashed passwords using `bcrypt` (salt rounds = 10).
- **Security Headers:** HTTP security headers provided by `helmet`.
- **CORS:** Controlled origin policy enabled for decoupled client communication.
