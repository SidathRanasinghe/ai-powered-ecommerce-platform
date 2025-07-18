export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: "customer" | "admin" | "vendor";
  isActive: boolean;
  isEmailVerified: boolean;
  addresses: Address[];
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  _id?: string;
  type: "home" | "work" | "other";
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export interface UserPreferences {
  categories: string[];
  brands: string[];
  priceRange: {
    min: number;
    max: number;
  };
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  shortDescription?: string;
  sku: string;
  brand: string;
  category: string;
  price: number;
  comparePrice?: number;
  currency: string;
  images: ProductImage[];
  specifications: Record<string, string>;
  variants: ProductVariant[];
  inventory: ProductInventory;
  shipping: ProductShipping;
  seo: ProductSEO;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  averageRating: number;
  totalReviews: number;
  reviews?: ReviewSummary;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  _id?: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
}

export interface ProductVariant {
  _id?: string;
  name: string;
  sku: string;
  price: number;
  comparePrice?: number;
  attributes: Record<string, string>;
  inventory: {
    quantity: number;
    lowStockThreshold: number;
  };
  images: string[];
  isActive: boolean;
}

export interface ProductInventory {
  quantity: number;
  lowStockThreshold: number;
  trackQuantity: boolean;
  allowBackorders: boolean;
  stockStatus: "in_stock" | "out_of_stock" | "limited_stock";
}

export interface ProductShipping {
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: "cm" | "in";
  };
  shippingClass?: string;
  requiresShipping: boolean;
}

export interface ProductSEO {
  title?: string;
  description?: string;
  keywords: string[];
  slug: string;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}

export interface Review {
  _id: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string;
  title?: string;
  images?: string[];
  isVerified: boolean;
  isApproved: boolean;
  helpfulVotes: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

export interface CartItem {
  _id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  product: Product;
  variant?: ProductVariant;
}

export interface Cart {
  _id: string;
  userId: string;
  items: CartItem[];
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customer: string;
  items: OrderItem[];
  billing: OrderAddress;
  shipping: OrderAddress;
  payment: OrderPayment;
  totals: OrderTotals;
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded";
  shippingMethod: string;
  shippingCost: number;
  shippedAt?: string;
  deliveredAt?: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  _id?: string;
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  total: number;
  image?: string;
}

export interface OrderAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface OrderPayment {
  method: "stripe" | "paypal" | "cod";
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  transactionId?: string;
  stripePaymentIntentId?: string;
  amount: number;
  currency: string;
  paidAt?: string;
  refundedAt?: string;
  refundAmount?: number;
}

export interface OrderTotals {
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalProducts: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ProductsResponse {
  products: Product[];
  pagination: PaginationInfo;
}

export interface SearchFilters {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  rating?: number;
  sortBy?: "price" | "rating" | "newest" | "popularity";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export interface Recommendation {
  productId: string;
  score: number;
  reason: string;
  product?: Product;
}
