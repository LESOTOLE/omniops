export interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  city?: string | null;
}

export interface InventoryRecord {
  id: string;
  warehouseId: string;
  productId: string;
  quantity: number;
  minStock: number;
  warehouse?: WarehouseItem;
}

export interface ProductItem {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  category: string;
  unit: string;
  buyPrice: number | string;
  sellPrice: number | string;
  totalStock?: number;
  inventories?: InventoryRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StockTransferRecord {
  id: string;
  transferNumber: string;
  fromWarehouseId: string;
  fromWarehouse: WarehouseItem;
  toWarehouseId: string;
  toWarehouse: WarehouseItem;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  notes?: string | null;
  createdBy: { id: string; fullName: string; email: string };
  approvedBy?: { id: string; fullName: string; email: string } | null;
  items: Array<{
    id: string;
    productId: string;
    product: ProductItem;
    quantity: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogRecord {
  _id: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  performedBy: string;
  userRole?: string | null;
  ipAddress?: string | null;
  timestamp: string;
  createdAt: string;
}

export interface ApiResponseWrapper<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}
