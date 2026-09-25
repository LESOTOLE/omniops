import { create } from 'zustand';

export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  availableStock: number;
}

interface CartState {
  items: CartItem[];
  warehouseId: string;
  discountAmount: number;
  taxRate: number; // e.g. 0.11 for 11% PPN
  setWarehouseId: (id: string) => void;
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setDiscount: (discount: number) => void;
  setTaxRate: (rate: number) => void;
  clearCart: () => void;

  getSubtotal: () => number;
  getTaxAmount: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  warehouseId: '',
  discountAmount: 0,
  taxRate: 0,

  setWarehouseId: (warehouseId) => set({ warehouseId }),

  addItem: (item, qty = 1) => {
    set((state) => {
      const existing = state.items.find((i) => i.productId === item.productId);
      if (existing) {
        const newQty = Math.min(existing.availableStock, existing.quantity + qty);
        return {
          items: state.items.map((i) =>
            i.productId === item.productId ? { ...i, quantity: newQty } : i,
          ),
        };
      }
      return {
        items: [...state.items, { ...item, quantity: Math.min(item.availableStock, qty) }],
      };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.min(i.availableStock, quantity) }
          : i,
      ),
    }));
  },

  setDiscount: (discountAmount) => set({ discountAmount }),
  setTaxRate: (taxRate) => set({ taxRate }),

  clearCart: () => set({ items: [], discountAmount: 0 }),

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  },

  getTaxAmount: () => {
    const subtotal = get().getSubtotal();
    const discount = get().discountAmount;
    const taxable = Math.max(0, subtotal - discount);
    return Math.round(taxable * get().taxRate);
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = get().discountAmount;
    const tax = get().getTaxAmount();
    return Math.max(0, subtotal - discount + tax);
  },

  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));
