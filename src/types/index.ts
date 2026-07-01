// ============================================================
// collect&display Portal — TypeScript Types
// ============================================================

import type {
  User, Retailer, Product, Order, OrderItem,
  Brand, Address, Announcement, BulkImport,
} from "@prisma/client";

// ── Re-exports with relations ────────────────────────────────

export type RetailerWithUser = Retailer & {
  user: User;
  deliveryAddress: Address | null;
  billingAddress: Address | null;
};

export type ProductWithBrand = Product & {
  brand: Brand;
  images: ProductImage[];
};

export type ProductImage = {
  id: string;
  productId: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

export type OrderWithItems = Order & {
  items: (OrderItem & { product: ProductWithBrand })[];
  retailer: RetailerWithUser;
  statusHistory: OrderStatusHistory[];
};

export type OrderStatusHistory = {
  id: string;
  orderId: string;
  status: import("@prisma/client").OrderStatus;
  note: string | null;
  changedBy: string | null;
  createdAt: Date;
};

// ── API Response types ───────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// ── Basket ───────────────────────────────────────────────────

export interface BasketItem {
  productId: string;
  product: ProductWithBrand;
  quantity: number; // in CDUs
  unitCost: number; // per CDU
  lineTotal: number;
}

export interface BasketSummary {
  items: BasketItem[];
  totalCDUs: number;
  totalUnits: number;
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  estimatedBoxes: number;
  estimatedPallets: number;
}

// ── Checkout ─────────────────────────────────────────────────

export interface CheckoutPayload {
  poReference: string;
  deliveryNotes?: string;
  requestedDeliveryDate?: string;
  items: {
    productId: string;
    quantity: number;
  }[];
}

// ── Product filters ─────────────────────────────────────────

export interface ProductFilters {
  search?: string;
  brandId?: string;
  type?: import("@prisma/client").ProductType;
  status?: import("@prisma/client").ProductStatus;
  badge?: import("@prisma/client").ProductBadge;
  inStockOnly?: boolean;
  sortBy?: "name" | "price" | "stock" | "newest" | "brand";
  sortDir?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

// ── Order filters ────────────────────────────────────────────

export interface OrderFilters {
  search?: string;
  status?: import("@prisma/client").OrderStatus;
  retailerId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
}

// ── Bulk import ──────────────────────────────────────────────

export interface BulkImportRow {
  rowNumber: number;
  sku: string;
  barcode?: string;
  brand: string;
  name: string;
  type: string;
  cduSize: number;
  unitCost: number;
  cduCost: number;
  unitRrp: number;
  availableStock: number;
  imageUrl?: string;
  status?: string;
  // Validation
  _valid: boolean;
  _errors: string[];
  _action: "create" | "update" | "skip";
}

export interface BulkImportPreview {
  rows: BulkImportRow[];
  summary: {
    total: number;
    toCreate: number;
    toUpdate: number;
    invalid: number;
  };
}

// ── Admin dashboard stats ────────────────────────────────────

export interface AdminStats {
  todayOrders: number;
  todayRevenue: number;
  monthRevenue: number;
  ordersAwaitingProcessing: number;
  ordersAwaitingDispatch: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  activeRetailers: number;
}

// ── Auth ─────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: import("@prisma/client").UserRole;
  retailerId?: string;
}

// ── Email templates ──────────────────────────────────────────

export type EmailTemplate =
  | "order-confirmation"
  | "order-status-update"
  | "invoice-uploaded"
  | "tracking-added"
  | "password-reset"
  | "welcome"
  | "admin-new-order";

export interface EmailPayload {
  template: EmailTemplate;
  to: string;
  data: Record<string, unknown>;
}
