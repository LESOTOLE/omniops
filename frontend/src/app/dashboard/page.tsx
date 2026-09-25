'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Package,
  Building2,
  ShoppingCart,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { api } from '@/lib/api';
import { ApiResponseWrapper, WarehouseItem } from '@/types';

interface AnalyticsData {
  metrics: {
    totalRevenue: number;
    transactionVolume: number;
    lowStockCount: number;
    productCount: number;
    warehouseCount: number;
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    sku: string;
    category: string;
    totalQuantitySold: number;
    totalRevenue: number;
  }>;
  salesTrend: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async (warehouseId?: string) => {
    setIsLoading(true);
    try {
      const url = warehouseId
        ? `/analytics/summary?warehouseId=${warehouseId}`
        : '/analytics/summary';
      const [analyticsRes, warehousesRes] = await Promise.all([
        api.get<never, ApiResponseWrapper<AnalyticsData>>(url),
        api.get<never, ApiResponseWrapper<WarehouseItem[]>>('/warehouses'),
      ]);
      setData(analyticsRes.data);
      setWarehouses(warehousesRes.data || []);
    } catch (err: unknown) {
      console.error('Failed to load analytics data', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(selectedWarehouse);
  }, [fetchDashboardData, selectedWarehouse]);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <DashboardLayout title="Executive Analytics & Operations" allowedRoles={['SUPER_ADMIN', 'WAREHOUSE_MANAGER']}>
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Operational Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time financial and multi-warehouse inventory telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-xs"
          >
            <option value="">All Warehouses & Stores (Global)</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchDashboardData(selectedWarehouse)}
            className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors shadow-xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-800">
              {data ? formatIDR(data.metrics.totalRevenue) : '...'}
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Real-time POS revenue</span>
            </p>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transactions</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-800">
              {data ? `${data.metrics.transactionVolume} Orders` : '...'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Completed checkout volume</p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Low Stock Alerts</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-amber-600">
              {data ? `${data.metrics.lowStockCount} Items` : '...'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Stock ≤ minimum threshold</p>
          </div>
        </div>

        {/* Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Master Catalog</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-800">
              {data ? `${data.metrics.productCount} SKUs` : '...'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Active registered products</p>
          </div>
        </div>

        {/* Warehouses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Facilities</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-800">
              {data ? `${data.metrics.warehouseCount} Branches` : '...'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Hubs and retail branches</p>
          </div>
        </div>
      </div>

      {/* Charts & Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Sales Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Weekly Revenue Trend</h3>
              <p className="text-xs text-slate-400">Total gross daily sales in Indonesian Rupiah</p>
            </div>
          </div>

          <div className="h-72 w-full">
            {data && data.salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.salesTrend}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-xs">
                            <p className="text-slate-500 font-semibold mb-1">Date: {label}</p>
                            <p className="text-indigo-600 font-bold">
                              Revenue: {formatIDR(Number(payload[0].value || 0))}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No recent transaction telemetry available
              </div>
            )}
          </div>
        </div>

        {/* Quick Launch & Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 mb-1">OmniOps Quick Actions</h3>
            <p className="text-xs text-slate-400 mb-4">Direct workflow shortcuts</p>

            <div className="space-y-3">
              <Link
                href="/pos"
                className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-100 text-indigo-900 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-600 text-white">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Open POS Terminal</p>
                    <p className="text-[11px] text-indigo-600">Scan & process retail transactions</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/inventory"
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-700 text-white">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Manage Product Catalog</p>
                    <p className="text-[11px] text-slate-500">Update SKUs, pricing & stocks</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/transfers"
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-600 text-white">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Transfer Stock Antar-Gudang</p>
                    <p className="text-[11px] text-slate-500">Approve & dispatch transfer orders</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/70 text-amber-800 text-xs flex items-center justify-between mt-4">
            <span className="font-semibold">{data?.metrics.lowStockCount || 0} items need re-ordering</span>
            <Link href="/inventory" className="text-amber-900 font-bold underline hover:text-amber-950">
              View Items
            </Link>
          </div>
        </div>
      </div>

      {/* Top 5 Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">Top 5 Best-Selling Products</h3>
            <p className="text-xs text-slate-400">Ranked by aggregate units sold across all branches</p>
          </div>
          <Link
            href="/inventory"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>View All Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">Product Name</th>
                <th className="py-3 px-5">SKU</th>
                <th className="py-3 px-5">Category</th>
                <th className="py-3 px-5 text-right">Units Sold</th>
                <th className="py-3 px-5 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {data && data.topProducts.length > 0 ? (
                data.topProducts.map((p, idx) => (
                  <tr key={p.productId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span>{p.productName}</span>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-slate-500">{p.sku}</td>
                    <td className="py-3.5 px-5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold text-slate-800">
                      {p.totalQuantitySold} pcs
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold text-emerald-600">
                      {formatIDR(p.totalRevenue)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No sales recorded yet. Process checkouts in the POS Terminal to see ranking!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
