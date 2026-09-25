# Product Requirement Document (PRD)
## Project Name: OmniOps — B2B Operations & Multi-Store Inventory Platform

### 1. Overview & Objective
OmniOps adalah sistem internal/admin dashboard terintegrasi untuk bisnis operasional dan distribusi ritel. Sistem ini dibangun untuk menangani inventaris multi-gudang, transaksi Point of Sale (POS), dan pelacakan audit log secara real-time.

### 2. User Personas & Roles (RBAC)
- **Super Admin:** Memiliki akses penuh terhadap konfigurasi sistem, manajemen cabang/gudang, hak akses staf, dan laporan global.
- **Store / Warehouse Manager:** Mengelola stok masuk/keluar (*stock transfer*), penyesuaian stok (*stock adjustment*), dan persetujuan pesanan.
- **Cashier / Operator:** Memproses transaksi checkout penjualan harian di terminal POS kasir dan mencetak struk.

### 3. Functional Requirements
- **Authentication & RBAC:**
  - Login aman berbasis JWT (Access & Refresh Token).
  - Pembatasan rute dan aksi berdasarkan peran (*role-based authorization*).
- **Multi-Warehouse Inventory:**
  - Manajemen katalog master produk (SKU, barcode, kategori, harga beli, harga jual).
  - Pelacakan stok terpisah per cabang/gudang.
  - Fitur transfer stok antar-gudang dengan status *pending/approved/completed*.
- **POS & Checkout Engine:**
  - Antarmuka kasir yang responsif dan cepat dengan fitur pencarian instan (nama/SKU/barcode).
  - Kalkulasi subtotal, diskon item/global, pajak, dan kembalian.
  - Integrasi pencetakan nota/faktur transaksi.
- **Audit Trail & Activity Logging:**
  - Setiap perubahan data sensitif (perubahan harga, koreksi manual stok, penghapusan data) otomatis tercatat beserta ID user, timestamp, IP, dan payload sebelum/sesudah perubahan.
- **Executive Analytics Dashboard:**
  - Ringkasan metrik kunci (Total Revenue, Low Stock Alerts, Top 5 Products, Transaction Volume).
  - Visualisasi grafik tren penjualan mingguan/bulanan.

### 4. Non-Functional Requirements
- **Performance:** Response time API rata-rata < 200 ms untuk endpoint transaksional.
- **Security:** Proteksi terhadap SQL Injection, XSS, CSRF, dan brute force (rate limiting).
- **Responsiveness:** Tampilan web responsif di layar tablet (POS terminal) dan desktop (admin dashboard).
- **Code Quality:** Type-safety penuh menggunakan TypeScript di sisi frontend dan backend.