import { z } from "zod";

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ─── Checkout ────────────────────────────────────────────────────────────────

export const checkoutSchema = z.object({
  poReference: z
    .string()
    .min(1, "PO reference is required")
    .max(50, "PO reference is too long"),
  requestedDeliveryDate: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return date >= new Date();
      },
      { message: "Delivery date must be in the future" }
    ),
  deliveryNotes: z.string().max(500, "Notes must be under 500 characters").optional(),
  deliveryAddressId: z.string().optional(),
});

// ─── Products ────────────────────────────────────────────────────────────────

export const productFiltersSchema = z.object({
  search: z.string().optional(),
  brandId: z.string().optional(),
  type: z.enum(["BLIND_BOX", "VINYL_FIGURE", "PLUSH", "ACCESSORIES", "BUNDLE"]).optional(),
  inStock: z.coerce.boolean().optional(),
  badge: z
    .enum(["NEW", "BEST_SELLER", "EXCLUSIVE", "LOW_STOCK", "COMING_SOON"])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  sortBy: z.enum(["name", "createdAt", "unitCostPence", "stock"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const createProductSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(50),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  brandId: z.string().min(1, "Brand is required"),
  type: z.enum(["BLIND_BOX", "VINYL_FIGURE", "PLUSH", "ACCESSORIES", "BUNDLE"]),
  unitCostPence: z.number().int().positive("Unit cost must be positive"),
  rrpPence: z.number().int().positive("RRP must be positive"),
  cduSize: z.number().int().positive("CDU size must be positive"),
  status: z.enum(["ACTIVE", "DISCONTINUED", "COMING_SOON"]).default("ACTIVE"),
  badges: z
    .array(z.enum(["NEW", "BEST_SELLER", "EXCLUSIVE", "LOW_STOCK", "COMING_SOON"]))
    .default([]),
  stockUnits: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(10),
  weight: z.number().positive().optional(),
  dimensions: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial().omit({ sku: true });

// ─── Retailers ───────────────────────────────────────────────────────────────

export const createRetailerSchema = z.object({
  // User fields
  email: z.string().email("Enter a valid email address"),
  name: z.string().min(1, "Contact name is required").max(100),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // Retailer fields
  companyName: z.string().min(1, "Company name is required").max(200),
  phone: z.string().optional(),
  accountCode: z.string().min(1, "Account code is required").max(20),
  paymentTerms: z.enum(["PREPAY", "NET_14", "NET_30", "NET_60"]).default("NET_30"),
  creditLimitPence: z.number().int().min(0).default(0),
  pricingTier: z.enum(["STANDARD", "PREFERRED", "VIP"]).default("STANDARD"),
  // Primary address
  address: z.object({
    line1: z.string().min(1, "Address line 1 is required"),
    line2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    county: z.string().optional(),
    postcode: z.string().min(1, "Postcode is required"),
    country: z.string().default("GB"),
  }),
});

export const updateRetailerSchema = createRetailerSchema
  .partial()
  .omit({ password: true, email: true });

// ─── Brands ──────────────────────────────────────────────────────────────────

export const createBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required").max(100),
  slug: z.string().optional(),
  logoUrl: z.string().url().optional(),
  description: z.string().max(500).optional(),
});

// ─── Orders ──────────────────────────────────────────────────────────────────

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PLACED",
    "CONFIRMED",
    "PAYMENT_RECEIVED",
    "PICKING",
    "PACKED",
    "DISPATCHED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
  ]),
  note: z.string().max(500).optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  estimatedDelivery: z.string().optional(),
  invoiceUrl: z.string().url().optional(),
  invoiceNumber: z.string().optional(),
});

// ─── Basket ──────────────────────────────────────────────────────────────────

export const addToBasketSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive("Quantity must be at least 1"),
});

export const updateBasketItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(0),
});

// ─── Bulk Import ─────────────────────────────────────────────────────────────

export const bulkImportRowSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  brand: z.string().min(1, "Brand is required"),
  type: z.string(),
  unitCost: z.coerce.number().positive("Unit cost must be positive"),
  rrp: z.coerce.number().positive("RRP must be positive"),
  cduSize: z.coerce.number().int().positive("CDU size must be positive"),
  stock: z.coerce.number().int().min(0).default(0),
  status: z.string().default("ACTIVE"),
});

// ─── Account ─────────────────────────────────────────────────────────────────

export const updateAccountSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().optional(),
});

export const updateAddressSchema = z.object({
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  county: z.string().optional(),
  postcode: z.string().min(1, "Postcode is required"),
  country: z.string().default("GB"),
  isPrimary: z.boolean().default(false),
});

// ─── Announcements ───────────────────────────────────────────────────────────

export const createAnnouncementSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required"),
  type: z.enum(["INFO", "WARNING", "PROMOTION", "NEW_ARRIVAL"]).default("INFO"),
  publishedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  isPinned: z.boolean().default(false),
  targetRetailerId: z.string().optional(),
});

// ─── Inferred types ──────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ProductFiltersInput = z.infer<typeof productFiltersSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateRetailerInput = z.infer<typeof createRetailerSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type AddToBasketInput = z.infer<typeof addToBasketSchema>;
export type BulkImportRowInput = z.infer<typeof bulkImportRowSchema>;
