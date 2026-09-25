'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  X,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { api } from '@/lib/api';
import { StockTransferRecord, WarehouseItem, ProductItem, ApiResponseWrapper } from '@/types';

interface ProductsListResponse {
  items: ProductItem[];
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<StockTransferRecord[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New transfer modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [transferItems, setTransferItems] = useState<Array<{ productId: string; quantity: number }>>([
    { productId: '', quantity: 1 },
  ]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [transfersRes, warehousesRes, productsRes] = await Promise.all([
        api.get<never, ApiResponseWrapper<StockTransferRecord[]>>('/inventory/transfers'),
        api.get<never, ApiResponseWrapper<WarehouseItem[]>>('/warehouses'),
        api.get<never, ApiResponseWrapper<ProductsListResponse>>('/products?limit=100'),
      ]);
      setTransfers(transfersRes.data || []);
      setWarehouses(warehousesRes.data || []);
      setProducts(productsRes.data?.items || []);
    } catch (err: unknown) {
      console.error('Failed to load transfers', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'COMPLETED' | 'REJECTED') => {
    try {
      await api.patch(`/inventory/transfers/${id}/status`, { status });
      fetchData();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : `Failed to update status to ${status}`;
      alert(msg);
    }
  };

  const handleAddItemRow = () => {
    setTransferItems([...transferItems, { productId: '', quantity: 1 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setTransferItems(transferItems.filter((_, i) => i !== idx));
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWarehouseId || !toWarehouseId) {
      alert('Please select both source and destination warehouses');
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      alert('Source and destination warehouses cannot be the same');
      return;
    }
    const validItems = transferItems.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      alert('Please add at least one product with quantity > 0');
      return;
    }

    try {
      await api.post('/inventory/transfers', {
        fromWarehouseId,
        toWarehouseId,
        notes,
        items: validItems,
      });
      setIsCreateModalOpen(false);
      setTransferItems([{ productId: '', quantity: 1 }]);
      setNotes('');
      fetchData();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Error initiating stock transfer';
      alert(msg);
    }
  };

  return (
    <DashboardLayout title="Inter-Warehouse Stock Transfers" allowedRoles={['SUPER_ADMIN', 'WAREHOUSE_MANAGER']}>
      {/* Top Action Bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stock Transfer Orders</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-branch inventory replenishment with approval & verification gates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors shadow-xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              if (warehouses.length >= 2) {
                setFromWarehouseId(warehouses[0].id);
                setToWarehouseId(warehouses[1].id);
              }
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Transfer Request</span>
          </button>
        </div>
      </div>

      {/* Transfers List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">Transfer #</th>
                <th className="py-3 px-5">From Hub</th>
                <th className="py-3 px-5">To Destination</th>
                <th className="py-3 px-5">Items Transferred</th>
                <th className="py-3 px-5">Created By</th>
                <th className="py-3 px-5 text-center">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                    <span>Loading transfer requests...</span>
                  </td>
                </tr>
              ) : transfers.length > 0 ? (
                transfers.map((trf) => (
                  <tr key={trf.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-bold text-indigo-700">
                      {trf.transferNumber}
                      <div className="text-[10px] text-slate-400 font-sans">
                        {new Date(trf.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-slate-900">{trf.fromWarehouse.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{trf.fromWarehouse.code}</div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-slate-900">{trf.toWarehouse.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{trf.toWarehouse.code}</div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="space-y-1">
                        {trf.items.map((it) => (
                          <div key={it.id} className="text-[11px] flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900">{it.product.name}:</span>
                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold">
                              {it.quantity} {it.product.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500">
                      <div>{trf.createdBy.fullName}</div>
                      <div className="text-[10px] text-slate-400">{trf.createdBy.email}</div>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          trf.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : trf.status === 'APPROVED'
                            ? 'bg-blue-100 text-blue-800'
                            : trf.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {trf.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3" />}
                        {trf.status === 'PENDING' && <Clock className="w-3 h-3" />}
                        {trf.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                        <span>{trf.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      {trf.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleUpdateStatus(trf.id, 'APPROVED')}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(trf.id, 'REJECTED')}
                            className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {trf.status === 'APPROVED' && (
                        <button
                          onClick={() => handleUpdateStatus(trf.id, 'COMPLETED')}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                        >
                          Complete & Move Stock
                        </button>
                      )}
                      {trf.status === 'COMPLETED' && (
                        <span className="text-[11px] text-emerald-600 font-semibold">Fulfilled</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No stock transfer requests recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Stock Transfer */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Initiate Inter-Warehouse Transfer</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Source Warehouse (From) *</label>
                  <select
                    value={fromWarehouseId}
                    onChange={(e) => setFromWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Destination (To) *</label>
                  <select
                    value={toWarehouseId}
                    onChange={(e) => setToWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-700">Products & Quantities *</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {transferItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const updated = [...transferItems];
                          updated[idx].productId = e.target.value;
                          setTransferItems(updated);
                        }}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                      >
                        <option value="">Select product to transfer...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...transferItems];
                          updated[idx].quantity = Number(e.target.value);
                          setTransferItems(updated);
                        }}
                        className="w-20 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-center focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                        placeholder="Qty"
                      />
                      {transferItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for transfer or logistics reference..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                >
                  Submit Transfer Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
