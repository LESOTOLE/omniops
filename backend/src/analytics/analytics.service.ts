import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getExecutiveSummary(warehouseId?: string) {
    const whereOrder: any = { status: 'COMPLETED' };
    const whereInv: any = {};

    if (warehouseId) {
      whereOrder.warehouseId = warehouseId;
      whereInv.warehouseId = warehouseId;
    }

    // 1. Total Revenue and Transaction Volume
    const orders = await this.prisma.order.findMany({
      where: whereOrder,
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const transactionVolume = orders.length;

    // 2. Low Stock Alerts count
    const inventories = await this.prisma.inventory.findMany({
      where: whereInv,
      select: {
        quantity: true,
        minStock: true,
      },
    });

    const lowStockCount = inventories.filter((i) => i.quantity <= i.minStock).length;

    // 3. Total Warehouses & Products count
    const [warehouseCount, productCount] = await Promise.all([
      this.prisma.warehouse.count(),
      this.prisma.product.count(),
    ]);

    // 4. Top 5 Products by Sales Quantity
    const topOrderItems = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    });

    const topProductDetails = await Promise.all(
      topOrderItems.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, sku: true, category: true },
        });
        return {
          productId: item.productId,
          productName: product?.name || 'Unknown',
          sku: product?.sku || '',
          category: product?.category || '',
          totalQuantitySold: item._sum.quantity || 0,
          totalRevenue: Number(item._sum.subtotal || 0),
        };
      }),
    );

    // 5. Weekly Sales Trend (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentOrders = await this.prisma.order.findMany({
      where: {
        ...whereOrder,
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    const salesByDayMap = new Map<string, { revenue: number; transactions: number }>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateKey = d.toISOString().slice(0, 10);
      salesByDayMap.set(dateKey, { revenue: 0, transactions: 0 });
    }

    recentOrders.forEach((ord) => {
      const dateKey = ord.createdAt.toISOString().slice(0, 10);
      if (salesByDayMap.has(dateKey)) {
        const curr = salesByDayMap.get(dateKey)!;
        curr.revenue += Number(ord.totalAmount);
        curr.transactions += 1;
      }
    });

    const salesTrend = Array.from(salesByDayMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      transactions: data.transactions,
    }));

    return {
      metrics: {
        totalRevenue,
        transactionVolume,
        lowStockCount,
        productCount,
        warehouseCount,
      },
      topProducts: topProductDetails,
      salesTrend,
    };
  }
}
