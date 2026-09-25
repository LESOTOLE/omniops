# Engineering Rules & Coding Standards

### 1. General Principles
- **Strict TypeScript:** Dilarang menggunakan `any`. Selalu definisikan tipe data, `interface`, atau generic types secara eksplisit.
- **Clean Architecture:** Terapkan pemisahan tanggung jawab (Separation of Concerns). Controller hanya menangani routing/HTTP, Service menangani business logic murni, Repository/ORM menangani database access.
- **Defensive Programming:** Lakukan validasi input di level DTO sebelum payload menyentuh layer database.

### 2. Backend Rules (NestJS)
- Gunakan DTO (*Data Transfer Object*) dengan `class-validator` untuk semua request body dan query parameters.
- Selalu gunakan asynchronous programming (`async/await`) untuk setiap operasi I/O database.
- Error handling wajib menggunakan NestJS built-in Exceptions (misal: `NotFoundException`, `BadRequestException`, `UnauthorizedException`).
- Format respon API harus konsisten menggunakan interceptor transformasi response global.

### 3. Frontend Rules (Next.js & React)
- Gunakan App Router (`app/` directory).
- Pisahkan Server Components (default) untuk fetch data awal dari Client Components (`'use client'`) yang membutuhkan event listener atau state.
- Hindari prop drilling yang melebihi dua tingkat; gunakan React Context API atau store terpusat.
- Semua form input wajib divalidasi menggunakan Zod dan React Hook Form.
- Styling wajib menggunakan utility classes Tailwind CSS (hindari inline styles).

### 4. Database & Migration Rules
- Setiap perubahan skema database relasional (MySQL) wajib dilakukan melalui migrasi resmi Prisma (`npx prisma migrate dev`).
- Jangan pernah menyimpan plain-text password; wajib di-hash menggunakan Argon2 atau Bcrypt (salt round >= 10).
- Query mutasi stok multi-tabel wajib dibungkus dalam mekanisme database transaction (`$transaction`).

### 5. Git & Collaboration Workflow
- Gunakan Conventional Commits:
  - `feat: <pesan>` untuk penambahan fitur.
  - `fix: <pesan>` untuk perbaikan bug.
  - `refactor: <pesan>` untuk restrukturisasi kode tanpa mengubah fungsionalitas.
  - `docs: <pesan>` untuk update dokumentasi.
- Bahasa pengantar dokumentasi, commit message, dan penamaan variabel/fungsi harus 100% menggunakan Bahasa Inggris.