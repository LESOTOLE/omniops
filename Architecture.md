# System Architecture Document
## Project: OmniOps Platform

### 1. High-Level Architecture
Sistem mengadopsi pola arsitektur decoupled client-server via RESTful API:
- **Client Tier:** Next.js (App Router) yang memanfaatkan Server-Side Rendering (SSR) untuk data agregasi dashboard dan Client Components untuk interaktivitas POS.
- **API Tier:** NestJS modular application bertindak sebagai core business logic engine, validation layer, dan auth provider.
- **Persistence Tier (Dual-Database Strategy):**
  - **MySQL (Relational):** Menyimpan entitas terstruktur transaksional (Users, Roles, Products, Warehouses, Inventories, Orders, OrderItems).
  - **MongoDB (Document-based):** Menyimpan time-series log dan dokumen tidak terstruktur (System Audit Trail, Webhook Logs, Raw Event Payload).

### 2. Tech Stack Detail
| Layer | Teknologi | Alasan Pemilihan |
|---|---|---|
| **Frontend** | Next.js (React 19), TypeScript, Tailwind CSS | Standar industri SSR/SSG, performa tinggi, styling modular |
| **UI Components** | Shadcn UI / Radix UI, Lucide Icons | Aksesibilitas tinggi, fleksibel, mudah dikustomisasi |
| **State Management**| Context API / Zustand | Ringan untuk mengelola keranjang transaksi POS |
| **Backend** | NestJS, TypeScript, Node.js | Arsitektur Enterprise (DI, Modules, DTO), clean & scalable |
| **Relational DB** | MySQL via Prisma ORM | Integritas ACID untuk data inventaris dan keuangan |
| **NoSQL DB** | MongoDB via Mongoose | Performa write tinggi untuk write-heavy audit logging |
| **Cache / Rate Limit** | In-Memory / Redis (opsional) | Proteksi endpoint login dari brute force |

### 3. Data Flow & Security Layer
1. Client mengirim request HTTP via Axios/Fetch API dengan header `Authorization: Bearer <token>`.
2. NestJS Global Guards memvalidasi JWT dan Role pengguna.
3. NestJS Validation Pipe memvalidasi payload menggunakan `class-validator` / DTO.
4. Service memproses logika bisnis:
   - Jika query transaksional: dieksekusi via Prisma ke PostgreSQL.
   - Jika event mutasi data: trigger asynchronous logging ke MongoDB via Mongoose.
5. Response dikembalikan dalam format standard JSON API:
   `{ success: boolean, statusCode: number, message: string, data: any }`.

### 4. Entity Relationship Summary (MySQL Relational Core)
- `User` 1:N `Order`
- `Role` 1:N `User`
- `Warehouse` 1:N `Inventory` N:1 `Product`
- `Order` 1:N `OrderItem` N:1 `Product`