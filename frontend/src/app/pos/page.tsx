'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  Printer,
  CheckCircle2,
  X,
  CreditCard,
  QrCode,
  Banknote,
  Store,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useCartStore } from '@/lib/cart-store';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { ProductItem, WarehouseItem, ApiResponseWrapper } from '@/types';

interface CompletedOrder {
  id: string;
  orderNumber: string;
  subtotal: number | string;
  discountAmount: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  amountPaid: number | string;
  changeAmount: number | string;
  createdAt: string;
  warehouse?: WarehouseItem;
  cashier?: { fullName: string; email: string };
  items?: Array<{
    id: string;
    quantity: number;
    unitPrice: number | string;
    subtotal: number | string;
    product?: ProductItem;
  }>;
}

interface ProductsListResponse {
  items: ProductItem[];
}

export default function PosPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Checkout modal & payment state
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'QRIS' | 'TRANSFER'>('CASH');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer');
  const [isProcessing, setIsProcessing] = useState(false);

  // Completed receipt state
  const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    items,
    setWarehouseId,
    addItem,
    removeItem,
    updateQuantity,
    discountAmount,
    setDiscount,
    taxRate,
    setTaxRate,
    clearCart,
    getSubtotal,
    getTaxAmount,
    getTotal,
    getItemCount,
  } = useCartStore();

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [whRes, prodRes] = await Promise.all([
        api.get<never, ApiResponseWrapper<WarehouseItem[]>>('/warehouses'),
        api.get<never, ApiResponseWrapper<ProductsListResponse>>('/products?limit=100'),
      ]);

      const whList = whRes.data || [];
      setWarehouses(whList);

      const defaultWh = user?.warehouseId || (whList.length > 0 ? whList[0].id : '');
      setSelectedWarehouseId(defaultWh);
      setWarehouseId(defaultWh);

      setProducts(prodRes.data?.items || []);
    } catch (err: unknown) {
      console.error('Failed to load POS data', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.warehouseId, setWarehouseId]);

  useEffect(() => {
    fetchInitialData();
    searchInputRef.current?.focus();
  }, [fetchInitialData]);

  const handleWarehouseChange = (id: string) => {
    setSelectedWarehouseId(id);
    setWarehouseId(id);
    clearCart();
  };

  const getProductStockForWarehouse = (product: ProductItem, whId: string) => {
    const inv = product.inventories?.find((i) => i.warehouseId === whId);
    return inv ? inv.quantity : 0;
  };

  const handleBarcodeSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = search.trim();
      if (!query) return;

      const exactMatch = products.find(
        (p) =>
          (p.barcode && p.barcode === query) ||
          p.sku.toLowerCase() === query.toLowerCase(),
      );

      if (exactMatch) {
        const availableStock = getProductStockForWarehouse(exactMatch, selectedWarehouseId);
        if (availableStock <= 0) {
          alert(`Product "${exactMatch.name}" is out of stock in this branch!`);
        } else {
          addItem(
            {
              productId: exactMatch.id,
              sku: exactMatch.sku,
              name: exactMatch.name,
              unitPrice: Number(exactMatch.sellPrice),
              availableStock,
            },
            1,
          );
          setSearch('');
        }
      }
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search));
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const openCheckout = () => {
    if (items.length === 0) return;
    const total = getTotal();
    setAmountPaidInput(total.toString());
    setIsCheckoutModalOpen(true);
  };

  const handleCompleteCheckout = async () => {
    const total = getTotal();
    const amountPaid = Number(amountPaidInput);

    if (amountPaid < total) {
      alert(`Amount tendered is insufficient! Must be at least ${formatIDR(total)}`);
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        warehouseId: selectedWarehouseId,
        paymentMethod,
        discountAmount,
        taxAmount: getTaxAmount(),
        amountPaid,
        customerName,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      };

      const res = await api.post<never, ApiResponseWrapper<CompletedOrder>>('/orders/checkout', payload);
      setCompletedOrder(res.data);
      clearCart();
      setIsCheckoutModalOpen(false);
      setIsReceiptModalOpen(true);

      const prodRes = await api.get<never, ApiResponseWrapper<ProductsListResponse>>('/products?limit=100');
      setProducts(prodRes.data?.items || []);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Transaction checkout failed';
      alert(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout title="Point of Sale (POS) Terminal">
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6.5rem)]">
        {/* Left Side: Product Browser & Instant Search */}
        <div className="flex-1 flex flex-col min-w-0 bg-white rounded-3xl border border-slate-200 shadow-xs p-5 overflow-hidden">
          {/* Warehouse and Search Header */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-indigo-600" />
              <select
                value={selectedWarehouseId}
                onChange={(e) => handleWarehouseChange(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleBarcodeSearch}
                placeholder="Scan Barcode or Search Product (Press Enter to add)..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-3 border-b border-slate-100">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === ''
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Items ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Loading products catalog...
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((prod) => {
                  const stock = getProductStockForWarehouse(prod, selectedWarehouseId);
                  const isOutOfStock = stock <= 0;

                  return (
                    <button
                      key={prod.id}
                      disabled={isOutOfStock}
                      onClick={() =>
                        addItem({
                          productId: prod.id,
                          sku: prod.sku,
                          name: prod.name,
                          unitPrice: Number(prod.sellPrice),
                          availableStock: stock,
                        })
                      }
                      className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all duration-150 relative group ${
                        isOutOfStock
                          ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                          : 'bg-white border-slate-200 hover:border-indigo-500 hover:shadow-md active:scale-98'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-mono text-slate-400 truncate">{prod.sku}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-700'
                                : stock <= 10
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {stock} {prod.unit}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug">
                          {prod.name}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-extrabold text-indigo-700">
                          {formatIDR(Number(prod.sellPrice))}
                        </span>
                        {!isOutOfStock && (
                          <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No products found matching your search.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: POS Shopping Cart & Receipt Engine */}
        <div className="w-full lg:w-96 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">Checkout Cart</h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs">
                {getItemCount()} items
              </span>
            </div>
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] text-rose-600 font-semibold hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {items.length > 0 ? (
              items.map((item) => (
                <div
                  key={item.productId}
                  className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.sku}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-slate-400 hover:text-rose-600 p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700">
                      {formatIDR(item.unitPrice * item.quantity)}
                    </span>

                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.availableStock}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <ShoppingCart className="w-10 h-10 stroke-1 text-slate-300 mb-2" />
                <p className="text-xs font-semibold">Cart is currently empty</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Scan barcode or click items from catalog to start transaction
                </p>
              </div>
            )}
          </div>

          {/* Pricing Calculation Summary */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-800">{formatIDR(getSubtotal())}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Discount (Rp)</span>
              <input
                type="number"
                min={0}
                value={discountAmount || ''}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-24 px-2 py-1 text-right text-xs font-semibold rounded border border-slate-200 bg-white"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxRate > 0}
                  onChange={(e) => setTaxRate(e.target.checked ? 0.11 : 0)}
                  className="rounded text-indigo-600"
                />
                <span>Include PPN (11%)</span>
              </label>
              <span className="font-semibold text-slate-800">{formatIDR(getTaxAmount())}</span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
              <span className="text-sm font-bold text-slate-900">Total Payable</span>
              <span className="text-lg font-black text-indigo-600">{formatIDR(getTotal())}</span>
            </div>

            <button
              disabled={items.length === 0}
              onClick={openCheckout}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              <DollarSign className="w-4 h-4" />
              <span>Proceed to Checkout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Process Payment */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Complete POS Payment</h3>
              <button onClick={() => setIsCheckoutModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex justify-between items-center">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Total Amount Due</span>
                <span className="text-xl font-extrabold text-indigo-700">{formatIDR(getTotal())}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['CASH', 'QRIS', 'CARD', 'TRANSFER'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-colors flex flex-col items-center gap-1 ${
                        paymentMethod === method
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {method === 'CASH' && <Banknote className="w-4 h-4" />}
                      {method === 'QRIS' && <QrCode className="w-4 h-4" />}
                      {method === 'CARD' && <CreditCard className="w-4 h-4" />}
                      {method === 'TRANSFER' && <DollarSign className="w-4 h-4" />}
                      <span>{method}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name (Optional)</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  placeholder="Walk-in Customer / PT Name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cash / Amount Tendered (Rp)</label>
                <input
                  type="number"
                  value={amountPaidInput}
                  onChange={(e) => setAmountPaidInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  placeholder="e.g. 500000"
                />

                {/* Quick Cash Buttons */}
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {[getTotal(), 50000, 100000, 200000, 500000, 1000000].map((amt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAmountPaidInput(amt.toString())}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold"
                    >
                      {idx === 0 ? 'Exact' : `${amt / 1000}k`}
                    </button>
                  ))}
                </div>
              </div>

              {Number(amountPaidInput) >= getTotal() && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-900">Kembalian (Change):</span>
                  <span className="font-black text-emerald-700 text-sm">
                    {formatIDR(Number(amountPaidInput) - getTotal())}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing || Number(amountPaidInput) < getTotal()}
                  onClick={handleCompleteCheckout}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-40"
                >
                  {isProcessing ? 'Processing Transaction...' : 'Finish & Print Receipt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Receipt Printing */}
      {isReceiptModalOpen && completedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="text-sm font-bold">Transaction Successful</h3>
              </div>
              <button onClick={() => setIsReceiptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Content */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-300 font-mono text-[11px] text-slate-800 space-y-2">
              <div className="text-center border-b border-dashed border-slate-300 pb-2">
                <p className="font-bold text-xs uppercase">OMNIOPS RETAIL POS</p>
                <p className="text-[10px] text-slate-500">{completedOrder.warehouse?.name}</p>
                <p className="text-[10px] text-slate-500">{new Date(completedOrder.createdAt).toLocaleString()}</p>
                <p className="text-[10px] font-bold text-indigo-600 mt-1">Receipt #{completedOrder.orderNumber}</p>
              </div>

              <div className="space-y-1.5 border-b border-dashed border-slate-300 py-2">
                {completedOrder.items?.map((it) => (
                  <div key={it.id} className="flex justify-between">
                    <div>
                      <p className="font-bold">{it.product?.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {it.quantity} x {formatIDR(Number(it.unitPrice))}
                      </p>
                    </div>
                    <p className="font-bold">{formatIDR(Number(it.subtotal))}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-1 pt-1 text-[10px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatIDR(Number(completedOrder.subtotal))}</span>
                </div>
                {Number(completedOrder.discountAmount) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span>-{formatIDR(Number(completedOrder.discountAmount))}</span>
                  </div>
                )}
                {Number(completedOrder.taxAmount) > 0 && (
                  <div className="flex justify-between">
                    <span>Tax (PPN 11%):</span>
                    <span>{formatIDR(Number(completedOrder.taxAmount))}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                  <span>Total Paid:</span>
                  <span className="text-indigo-700">{formatIDR(Number(completedOrder.totalAmount))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Tendered:</span>
                  <span>{formatIDR(Number(completedOrder.amountPaid))}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Change:</span>
                  <span>{formatIDR(Number(completedOrder.changeAmount))}</span>
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 pt-1">
                  <span>Cashier:</span>
                  <span>{completedOrder.cashier?.fullName}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Struk Nota</span>
              </button>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
