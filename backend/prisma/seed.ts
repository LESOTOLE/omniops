import { PrismaClient, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Seed Roles
  const roles = [
    {
      name: RoleName.SUPER_ADMIN,
      description: 'Full system control, warehouse management, user management, and global reports',
    },
    {
      name: RoleName.WAREHOUSE_MANAGER,
      description: 'Manage stock transfer, stock adjustments, and inventory approval',
    },
    {
      name: RoleName.CASHIER,
      description: 'Process POS checkout transactions and print receipts',
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }
  console.log('✓ Roles seeded');

  // 2. Seed Warehouses
  const warehouseCentral = await prisma.warehouse.upsert({
    where: { code: 'WH-CENTRAL' },
    update: {},
    create: {
      code: 'WH-CENTRAL',
      name: 'Main Central Distribution Hub',
      address: 'Jl. Industri Raya No. 88, Kawasan Pergudangan',
      city: 'Jakarta Utara',
    },
  });

  const warehouseStore1 = await prisma.warehouse.upsert({
    where: { code: 'STORE-JKT-01' },
    update: {},
    create: {
      code: 'STORE-JKT-01',
      name: 'OmniOps Retail Store Jakarta Selatan',
      address: 'Jl. Fatmawati No. 12',
      city: 'Jakarta Selatan',
    },
  });

  const warehouseStore2 = await prisma.warehouse.upsert({
    where: { code: 'STORE-BDG-01' },
    update: {},
    create: {
      code: 'STORE-BDG-01',
      name: 'OmniOps Retail Store Bandung',
      address: 'Jl. Riau No. 45',
      city: 'Bandung',
    },
  });
  console.log('✓ Warehouses seeded');

  // 3. Seed Users
  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.SUPER_ADMIN },
  });
  const managerRole = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.WAREHOUSE_MANAGER },
  });
  const cashierRole = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.CASHIER },
  });

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash('admin123', saltRounds);

  await prisma.user.upsert({
    where: { email: 'admin@omniops.com' },
    update: { password: passwordHash, roleId: superAdminRole.id },
    create: {
      email: 'admin@omniops.com',
      password: passwordHash,
      fullName: 'Super Administrator',
      phoneNumber: '081234567890',
      roleId: superAdminRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'manager@omniops.com' },
    update: {
      password: passwordHash,
      roleId: managerRole.id,
      warehouseId: warehouseCentral.id,
    },
    create: {
      email: 'manager@omniops.com',
      password: passwordHash,
      fullName: 'Budi Warehouse Manager',
      phoneNumber: '081234567891',
      roleId: managerRole.id,
      warehouseId: warehouseCentral.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'cashier@omniops.com' },
    update: {
      password: passwordHash,
      roleId: cashierRole.id,
      warehouseId: warehouseStore1.id,
    },
    create: {
      email: 'cashier@omniops.com',
      password: passwordHash,
      fullName: 'Siti Cashier Operator',
      phoneNumber: '081234567892',
      roleId: cashierRole.id,
      warehouseId: warehouseStore1.id,
    },
  });
  console.log('✓ Users seeded (admin@omniops.com / admin123, etc.)');

  // 4. Seed Products
  const productsData = [
    {
      sku: 'SKU-LOGI-MX3S',
      barcode: '899123400001',
      name: 'Logitech MX Master 3S Wireless Mouse',
      category: 'Electronics',
      description: 'Performance wireless mouse with 8K DPI sensor and quiet clicks.',
      unit: 'pcs',
      buyPrice: 1250000,
      sellPrice: 1699000,
      initialStocks: [
        { warehouseId: warehouseCentral.id, qty: 150 },
        { warehouseId: warehouseStore1.id, qty: 25 },
        { warehouseId: warehouseStore2.id, qty: 15 },
      ],
    },
    {
      sku: 'SKU-KEYCH-K2',
      barcode: '899123400002',
      name: 'Keychron K2 V2 Wireless Mechanical Keyboard',
      category: 'Electronics',
      description: '75% layout compact Bluetooth mechanical keyboard with Gateron switches.',
      unit: 'pcs',
      buyPrice: 900000,
      sellPrice: 1250000,
      initialStocks: [
        { warehouseId: warehouseCentral.id, qty: 80 },
        { warehouseId: warehouseStore1.id, qty: 12 },
        { warehouseId: warehouseStore2.id, qty: 8 },
      ],
    },
    {
      sku: 'SKU-DELL-U2723QE',
      barcode: '899123400003',
      name: 'Dell UltraSharp 27 4K USB-C Hub Monitor',
      category: 'Electronics',
      description: '27 inch 4K IPS Black monitor with 98% DCI-P3 and RJ45 Ethernet connectivity.',
      unit: 'unit',
      buyPrice: 7800000,
      sellPrice: 9500000,
      initialStocks: [
        { warehouseId: warehouseCentral.id, qty: 30 },
        { warehouseId: warehouseStore1.id, qty: 4 },
        { warehouseId: warehouseStore2.id, qty: 3 },
      ],
    },
    {
      sku: 'SKU-ERG-CHAIR-P1',
      barcode: '899123400004',
      name: 'Ergonomic Mesh Office Chair Pro',
      category: 'Furniture',
      description: 'Breathable full mesh ergonomic chair with dynamic lumbar support and 3D armrests.',
      unit: 'unit',
      buyPrice: 1800000,
      sellPrice: 2450000,
      initialStocks: [
        { warehouseId: warehouseCentral.id, qty: 45 },
        { warehouseId: warehouseStore1.id, qty: 6 },
        { warehouseId: warehouseStore2.id, qty: 5 },
      ],
    },
    {
      sku: 'SKU-THERM-MUG-500',
      barcode: '899123400005',
      name: 'Stainless Steel Insulated Tumbler 500ml',
      category: 'Accessories',
      description: 'Double wall vacuum insulated water bottle keep hot 12h, cold 24h.',
      unit: 'pcs',
      buyPrice: 75000,
      sellPrice: 135000,
      initialStocks: [
        { warehouseId: warehouseCentral.id, qty: 300 },
        { warehouseId: warehouseStore1.id, qty: 40 },
        { warehouseId: warehouseStore2.id, qty: 35 },
      ],
    },
  ];

  for (const item of productsData) {
    const { initialStocks, ...productData } = item;
    const product = await prisma.product.upsert({
      where: { sku: productData.sku },
      update: productData,
      create: productData,
    });

    for (const stock of initialStocks) {
      await prisma.inventory.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: stock.warehouseId,
            productId: product.id,
          },
        },
        update: { quantity: stock.qty },
        create: {
          warehouseId: stock.warehouseId,
          productId: product.id,
          quantity: stock.qty,
          minStock: 10,
        },
      });
    }
  }
  console.log('✓ Products & Inventories seeded');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
