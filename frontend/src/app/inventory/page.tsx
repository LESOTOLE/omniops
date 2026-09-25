'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { api } from '@/lib/api';
import { ProductItem, PaginationMeta, ApiResponseWrapper } from '@/types';

const productSchema = z.object({
  sku: z.string().min(2, 'SKU must be at least 2 characters'),
  barcode: z.string().optional(),
  name: z.string().min(2, 'Name is required'),
  category: z.string().min(2, 'Category is required'),
  description: z.string().optional(),
  unit: z.string().default('pcs'),
  buyPrice: z.number().min(0, 'Buy price must be non-negative'),
  sellPrice: z.number().positive('Sell price must be greater than zero'),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductsResponseData {
  items: ProductItem[];
  pagination: PaginationMeta;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<{ productId: string; warehouseId: string; productName: string; currentQty: number } | null>(null);
  const [newStockQty, setNewStockQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Stock opname discrepancy');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      unit: 'pcs',
      buyPrice: 0,
      sellPrice: 0,
    },
  });

  const fetchProducts = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      let query = `/products?page=${page}&limit=20`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (category) query += `&category=${encodeURIComponent(category)}`;

      const res = await api.get<never, ApiResponseWrapper<ProductsResponseData>>(query);
      setProducts(res.data.items || []);
      setPagination(res.data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 });
    } catch (err: unknown) {
      console.error('Failed to fetch products', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    fetchProducts(1);
  }, [category, fetchProducts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(1);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    reset({
      sku: '',
      barcode: '',
      name: '',
      category: '',
      description: '',
      unit: 'pcs',
      buyPrice: 0,
      sellPrice: 0,
    });
    setIsProductModalOpen(true);
  };

  const openEditModal = (product: ProductItem) => {
    setEditingProduct(product);
    setValue('sku', product.sku);
    setValue('barcode', product.barcode || '');
    setValue('name', product.name);
    setValue('category', product.category);
    setValue('description', product.description || '');
    setValue('unit', product.unit);
    setValue('buyPrice', Number(product.buyPrice));
    setValue('sellPrice', Number(product.sellPrice));
    setIsProductModalOpen(true);
  };

  const onSubmitProduct = async (data: ProductFormData) => {
    try {
      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, data);
      } else {
        await api.post('/products', data);
      }
      setIsProductModalOpen(false);
      fetchProducts(pagination.page);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Error saving product';
      alert(msg);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete product "${name}"?`)) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts(pagination.page);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Error deleting product';
      alert(msg);
    }
  };

  const handleAdjustStock = async () => {
    if (!adjustItem) return;
    try {
      await api.post('/inventory/adjust', {
        warehouseId: adjustItem.warehouseId,
        productId: adjustItem.productId,
        newQuantity: Number(newStockQty),
        reason: adjustReason,
      });
      setIsAdjustModalOpen(false);
      fetchProducts(pagination.page);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Error adjusting stock';
      alert(msg);
    }
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <DashboardLayout title="Inventory & Product Master" allowedRoles={['SUPER_ADMIN', 'WAREHOUSE_MANAGER']}>
      {/* Search and Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU, Barcode, or Product Name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Furniture">Furniture</option>
            <option value="Accessories">Accessories</option>
          </select>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">SKU & Barcode</th>
                <th className="py-3 px-5">Product Name</th>
                <th className="py-3 px-5">Category</th>
                <th className="py-3 px-5 text-right">Buy Price</th>
                <th className="py-3 px-5 text-right">Sell Price</th>
                <th className="py-3 px-5">Stock by Warehouse</th>
                <th className="py-3 px-5 text-center">Total Stock</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                      <span>Loading products...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length > 0 ? (
                products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-mono font-bold text-slate-900">{prod.sku}</div>
                      {prod.barcode && (
                        <div className="text-[10px] text-slate-400 font-mono">Barcode: {prod.barcode}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-slate-900">{prod.name}</div>
                      {prod.description && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{prod.description}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {prod.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right text-slate-500 font-medium">
                      {formatIDR(Number(prod.buyPrice))}
                    </td>
                    <td className="py-3.5 px-5 text-right text-indigo-700 font-bold">
                      {formatIDR(Number(prod.sellPrice))}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {prod.inventories && prod.inventories.length > 0 ? (
                          prod.inventories.map((inv) => (
                            <button
                              key={inv.id}
                              onClick={() => {
                                setAdjustItem({
                                  productId: prod.id,
                                  warehouseId: inv.warehouseId,
                                  productName: prod.name,
                                  currentQty: inv.quantity,
                                });
                                setNewStockQty(inv.quantity);
                                setIsAdjustModalOpen(true);
                              }}
                              className={`px-2 py-0.5 rounded-md text-[10px] border transition-colors flex items-center gap-1 ${
                                inv.quantity <= inv.minStock
                                  ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                              title="Click to adjust stock"
                            >
                              <span>{inv.warehouse?.code || 'WH'}:</span>
                              <strong>{inv.quantity}</strong>
                              {inv.quantity <= inv.minStock && (
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                              )}
                            </button>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No inventory records</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                          (prod.totalStock ?? 0) <= 10
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {prod.totalStock ?? 0} {prod.unit}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(prod)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No products matched your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong>{products.length}</strong> of <strong>{pagination.total}</strong> products
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchProducts(pagination.page - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 font-semibold text-slate-800">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchProducts(pagination.page + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Create or Edit Product */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                {editingProduct ? 'Edit Master Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmitProduct)} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SKU *</label>
                  <input
                    type="text"
                    {...register('sku')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    placeholder="SKU-PROD-001"
                  />
                  {errors.sku && <p className="text-[10px] text-rose-600 mt-1">{errors.sku.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    {...register('barcode')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    placeholder="899..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  placeholder="e.g. Ergonomic Keyboard"
                />
                {errors.name && <p className="text-[10px] text-rose-600 mt-1">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <input
                    type="text"
                    {...register('category')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    placeholder="Electronics, Furniture, etc."
                  />
                  {errors.category && <p className="text-[10px] text-rose-600 mt-1">{errors.category.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    {...register('unit')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    placeholder="pcs / unit / box"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Buy Price (Rp) *</label>
                  <input
                    type="number"
                    {...register('buyPrice', { valueAsNumber: true })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sell Price (Rp) *</label>
                  <input
                    type="number"
                    {...register('sellPrice', { valueAsNumber: true })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                  {errors.sellPrice && <p className="text-[10px] text-rose-600 mt-1">{errors.sellPrice.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  {...register('description')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  placeholder="Optional product specifications..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Stock Adjustment */}
      {isAdjustModalOpen && adjustItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-800 mb-1">Manual Stock Adjustment</h3>
            <p className="text-xs text-slate-500 mb-4">
              Correct physical stock for: <strong>{adjustItem.productName}</strong>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Stock: <span className="font-bold">{adjustItem.currentQty}</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={newStockQty}
                  onChange={(e) => setNewStockQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none font-bold"
                  placeholder="New stock count"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Adjustment</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  placeholder="e.g. Stock opname, damaged goods"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdjustStock}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
                >
                  Save Stock Correction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
