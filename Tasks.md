# Project Implementation Tasks (Backlog)

### Phase 1: Environment & Project Scaffolding
- [x] Inisialisasi Git repository dan siapkan `.gitignore` multi-tier (frontend & backend).
- [x] Setup proyek backend NestJS dengan TypeScript dan instal dependensi inti (Prisma, Mongoose, class-validator).
- [x] Setup proyek frontend Next.js (App Router, Tailwind CSS, Lucide Icons, Zustand).
- [x] Konfigurasi koneksi dual-database: MySQL (Lokal `omniops_db`) dan MongoDB Atlas / Audit Service.

### Phase 2: Database Schema & Authentication (Backend)
- [x] Buat skema Prisma untuk entitas: `User`, `Role`, `Product`, `Warehouse`, `Inventory`, `Order`, `OrderItem`, `StockTransfer`.
- [x] Jalankan database migration awal MySQL dan seeder data awal.
- [x] Buat skema Mongoose untuk entitas: `AuditLog` (`action`, `entity`, `entityId`, `oldValue`, `newValue`, `performedBy`, `timestamp`).
- [x] Implementasikan modul Auth di NestJS: Sign In, JWT Access/Refresh Token generation, dan Password Hashing (Bcrypt).
- [x] Buat Guard untuk Authentication (`JwtAuthGuard`) dan Authorization (`RolesGuard`).

### Phase 3: Core Business API & Dual-DB Logic
- [x] Buat modul CRUD Product & Warehouse (MySQL).
- [x] Buat modul Inventory Management (Stock Adjustment & Stock Transfer antar-gudang) dengan Prisma Transaction.
- [x] Buat Order Processing API (POS Checkout) yang otomatis mengurangi stok produk secara transaksional.
- [x] Pasang Audit Log Service untuk mencatat mutasi data secara asynchronous.
- [x] Siapkan Swagger/OpenAPI documentation di endpoint `/api/docs`.

### Phase 4: Frontend Admin Dashboard & SSR
- [x] Bangun layouting dashboard responsif: Sidebar, Header, Active Branch context, dan User Profile Menu.
- [x] Implementasikan autentikasi frontend (Login page, secure cookie/token storage, 1-click demo role switches).
- [x] Buat halaman Katalog Inventaris dengan pagination, search bar, dan modal form tambah/edit produk (Zod + React Hook Form).
- [x] Buat halaman Analytics Dashboard untuk metrik utama dan integrasikan grafik tren pendapatan mingguan (Recharts).

### Phase 5: POS Interface & Audit Log Viewer
- [x] Bangun halaman terminal POS kasir dengan shopping cart state (Zustand).
- [x] Implementasikan kalkulasi diskon, subtotal, PPN 11%, dan integrasi modal checkout & cetak struk nota.
- [x] Bangun halaman Audit Trail Viewer yang membaca log aktivitas dengan filter entitas, user, dan JSON payload inspector.

### Phase 6: Web Security Audit, Testing & Deployment
- [x] Pasang Helmet security headers dan CORS policy di NestJS.
- [x] Lakukan API verification testing pada seluruh skenario endpoint transaksional (Login, Products, Analytics, Checkout, Audit).
- [ ] Deploy MySQL dan MongoDB di cloud provider (Supabase/Neon/Atlas).
- [ ] Deploy backend NestJS di cloud platform (Railway/Render) dan frontend Next.js di Vercel.
- [x] Tulis dokumentasi komprehensif pada `README.md` utama repository (arsitektur, kredensial akun demo, modul fitur, dan setup guide).

### Phase 7: Security Hardening & Stability (Post-Audit Priority Fixes)
- [x] Pasang rate limiting (@nestjs/throttler) dengan pembatasan ketat pada endpoint auth (5 req/min).
- [x] Perketat CORS whitelist origin via `CORS_ORIGINS` environment variable.
- [x] Pasang HTTP compression middleware (gzip) di NestJS backend.
- [x] Tambahkan database performance indexes di Prisma schema (Product category, Inventory quantity, StockTransfer status, Order createdAt/warehouseId).
- [x] Setup linting dan formatting tools (ESLint, Prettier) di backend dan root level.
- [x] Buat Next.js error boundaries (`global-error.tsx`, `error.tsx`), custom 404 page (`not-found.tsx`), dan global loading skeleton (`loading.tsx`).
- [x] Externalize Next.js API client base URL melalui `NEXT_PUBLIC_API_URL` dengan template `.env.example`.