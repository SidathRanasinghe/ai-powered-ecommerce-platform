# Database Design Guide - MongoDB Schemas & Redis Setup

## Table of Contents

1. [MongoDB Schema Design](#mongodb-schema-design)
2. [Redis Configuration](#redis-configuration)
3. [Database Connection Setup](#database-connection-setup)
4. [Indexing Strategy](#indexing-strategy)
5. [Data Validation](#data-validation)

## MongoDB Schema Design

### 1. User Schema

```typescript
// backend/src/models/User.ts
import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other";
  avatar?: string;
  addresses: IAddress[];
  preferences: {
    categories: string[];
    brands: string[];
    priceRange: {
      min: number;
      max: number;
    };
  };
  role: "customer" | "admin" | "vendor";
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

interface IAddress {
  _id?: mongoose.Types.ObjectId;
  type: "home" | "work" | "other";
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

const AddressSchema = new Schema<IAddress>({
  type: {
    type: String,
    enum: ["home", "work", "other"],
    required: true,
  },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
});

const UserSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number"],
    },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    avatar: { type: String },
    addresses: [AddressSchema],
    preferences: {
      categories: [{ type: String }],
      brands: [{ type: String }],
      priceRange: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 10000 },
      },
    },
    role: {
      type: String,
      enum: ["customer", "admin", "vendor"],
      default: "customer",
    },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    lastLogin: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>("User", UserSchema);
```

### 2. Product Schema

```typescript
// backend/src/models/Product.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  shortDescription: string;
  sku: string;
  barcode?: string;
  brand: string;
  category: mongoose.Types.ObjectId;
  subcategory?: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  currency: string;
  images: IProductImage[];
  specifications: Map<string, string>;
  variants: IProductVariant[];
  inventory: IInventory;
  shipping: IShipping;
  seo: ISEO;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  averageRating: number;
  totalReviews: number;
  vendor: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IProductImage {
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
}

interface IProductVariant {
  _id?: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  price: number;
  comparePrice?: number;
  attributes: Map<string, string>; // e.g., { "color": "red", "size": "M" }
  inventory: {
    quantity: number;
    lowStockThreshold: number;
  };
  images: string[];
  isActive: boolean;
}

interface IInventory {
  quantity: number;
  lowStockThreshold: number;
  trackQuantity: boolean;
  allowBackorders: boolean;
  stockStatus: "in_stock" | "out_of_stock" | "limited_stock";
}

interface IShipping {
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

interface ISEO {
  title?: string;
  description?: string;
  keywords: string[];
  slug: string;
}

const ProductImageSchema = new Schema<IProductImage>({
  url: { type: String, required: true },
  alt: { type: String, required: true },
  isPrimary: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
});

const ProductVariantSchema = new Schema<IProductVariant>({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  comparePrice: { type: Number },
  attributes: {
    type: Map,
    of: String,
  },
  inventory: {
    quantity: { type: Number, required: true, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
  },
  images: [{ type: String }],
  isActive: { type: Boolean, default: true },
});

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
    },
    shortDescription: {
      type: String,
      maxlength: [500, "Short description cannot exceed 500 characters"],
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    barcode: { type: String },
    brand: {
      type: String,
      required: [true, "Brand is required"],
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    subcategory: { type: String },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    comparePrice: { type: Number },
    costPrice: { type: Number },
    currency: {
      type: String,
      required: true,
      default: "USD",
      uppercase: true,
    },
    images: [ProductImageSchema],
    specifications: {
      type: Map,
      of: String,
    },
    variants: [ProductVariantSchema],
    inventory: {
      quantity: { type: Number, required: true, default: 0 },
      lowStockThreshold: { type: Number, default: 5 },
      trackQuantity: { type: Boolean, default: true },
      allowBackorders: { type: Boolean, default: false },
      stockStatus: {
        type: String,
        enum: ["in_stock", "out_of_stock", "limited_stock"],
        default: "in_stock",
      },
    },
    shipping: {
      weight: { type: Number, required: true },
      dimensions: {
        length: { type: Number, required: true },
        width: { type: Number, required: true },
        height: { type: Number, required: true },
        unit: { type: String, enum: ["cm", "in"], default: "cm" },
      },
      shippingClass: { type: String },
      requiresShipping: { type: Boolean, default: true },
    },
    seo: {
      title: { type: String },
      description: { type: String },
      keywords: [{ type: String }],
      slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
      },
    },
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate slug from product name
ProductSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.seo.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  next();
});

export default mongoose.model<IProduct>("Product", ProductSchema);
```

### 3. Order Schema

```typescript
// backend/src/models/Order.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  customer: mongoose.Types.ObjectId;
  items: IOrderItem[];
  billing: IOrderAddress;
  shipping: IOrderAddress;
  payment: IPayment;
  totals: IOrderTotals;
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
  trackingNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IOrderItem {
  _id?: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  variant?: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  total: number;
  image?: string;
}

interface IOrderAddress {
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

interface IPayment {
  method: "stripe" | "paypal" | "cod";
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  transactionId?: string;
  stripePaymentIntentId?: string;
  amount: number;
  currency: string;
  paidAt?: Date;
  refundedAt?: Date;
  refundAmount?: number;
}

interface IOrderTotals {
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
}

const OrderItemSchema = new Schema<IOrderItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variant: {
    type: Schema.Types.ObjectId,
  },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  total: { type: Number, required: true },
  image: { type: String },
});

const OrderAddressSchema = new Schema<IOrderAddress>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true },
});

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [OrderItemSchema],
    billing: { type: OrderAddressSchema, required: true },
    shipping: { type: OrderAddressSchema, required: true },
    payment: {
      method: {
        type: String,
        enum: ["stripe", "paypal", "cod"],
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed", "refunded"],
        default: "pending",
      },
      transactionId: { type: String },
      stripePaymentIntentId: { type: String },
      amount: { type: Number, required: true },
      currency: { type: String, required: true, default: "USD" },
      paidAt: { type: Date },
      refundedAt: { type: Date },
      refundAmount: { type: Number },
    },
    totals: {
      subtotal: { type: Number, required: true },
      tax: { type: Number, default: 0 },
      shipping: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      total: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },
    shippingMethod: { type: String, required: true },
    shippingCost: { type: Number, default: 0 },
    trackingNumber: { type: String },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

// Generate order number
OrderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderNumber = `ORD-${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

export default mongoose.model<IOrder>("Order", OrderSchema);
```

### 4. Cart Schema

```typescript
// backend/src/models/Cart.ts
import mongoose, { Document, Schema } from "mongoose";

export interface ICart extends Document {
  _id: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  items: ICartItem[];
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
  };
  sessionId?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ICartItem {
  _id?: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  variant?: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  total: number;
  addedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variant: {
    type: Schema.Types.ObjectId,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"],
  },
  price: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const CartSchema = new Schema<ICart>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [CartItemSchema],
    totals: {
      subtotal: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      shipping: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    sessionId: { type: String },
    expiresAt: {
      type: Date,
      default: Date.now,
      expires: 7 * 24 * 60 * 60, // 7 days
    },
  },
  {
    timestamps: true,
  }
);

// Calculate totals before saving
CartSchema.pre("save", function (next) {
  this.totals.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
  this.totals.tax = this.totals.subtotal * 0.1; // 10% tax
  this.totals.total =
    this.totals.subtotal + this.totals.tax + this.totals.shipping;
  next();
});

export default mongoose.model<ICart>("Cart", CartSchema);
```

### 5. Review Schema

```typescript
// backend/src/models/Review.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  order: mongoose.Types.ObjectId;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  isVerified: boolean;
  isApproved: boolean;
  helpfulVotes: number;
  reportedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
    images: [{ type: String }],
    isVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    helpfulVotes: { type: Number, default: 0 },
    reportedCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Ensure one review per customer per product
ReviewSchema.index({ customer: 1, product: 1 }, { unique: true });

export default mongoose.model<IReview>("Review", ReviewSchema);
```

### 6. Category Schema

```typescript
// backend/src/models/Category.ts
import mongoose, { Document, Schema } from "mongoose";

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  slug: string;
  image?: string;
  parent?: mongoose.Types.ObjectId;
  children: mongoose.Types.ObjectId[];
  isActive: boolean;
  sortOrder: number;
  seo: {
    title?: string;
    description?: string;
    keywords: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Category name cannot exceed 100 characters"],
    },
    description: { type: String },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    image: { type: String },
    parent: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
    children: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    seo: {
      title: { type: String },
      description: { type: String },
      keywords: [{ type: String }],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICategory>("Category", CategorySchema);
```

## Redis Configuration

### 1. Redis Connection Setup

```typescript
// backend/src/config/redis.ts
import Redis from "ioredis";
import { config } from "./config";

class RedisClient {
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;

  constructor() {
    const redisConfig = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    };

    this.client = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.client.on("connect", () => {
      console.log("Redis client connected");
    });

    this.client.on("error", (err) => {
      console.error("Redis client error:", err);
    });

    this.client.on("ready", () => {
      console.log("Redis client ready");
    });

    this.client.on("close", () => {
      console.log("Redis client connection closed");
    });
  }

  // Session Management
  async setSession(
    sessionId: string,
    data: any,
    ttl: number = 3600
  ): Promise<void> {
    await this.client.setex(`session:${sessionId}`, ttl, JSON.stringify(data));
  }

  async getSession(sessionId: string): Promise<any> {
    const data = await this.client.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.del(`session:${sessionId}`);
  }

  // Caching
  async setCache(key: string, data: any, ttl: number = 3600): Promise<void> {
    await this.client.setex(`cache:${key}`, ttl, JSON.stringify(data));
  }

  async getCache(key: string): Promise<any> {
    const data = await this.client.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteCache(key: string): Promise<void> {
    await this.client.del(`cache:${key}`);
  }

  async deleteCachePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  // Cart Management
  async setCart(
    userId: string,
    cartData: any,
    ttl: number = 7 * 24 * 3600
  ): Promise<void> {
    await this.client.setex(`cart:${userId}`, ttl, JSON.stringify(cartData));
  }

  async getCart(userId: string): Promise<any> {
    const data = await this.client.get(`cart:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteCart(userId: string): Promise<void> {
    await this.client.del(`cart:${userId}`);
  }

  // Rate Limiting
  async checkRateLimit(
    key: string,
    limit: number,
    window: number
  ): Promise<boolean> {
    const current = await this.client.incr(`rate:${key}`);
    if (current === 1) {
      await this.client.expire(`rate:${key}`, window);
    }
    return current <= limit;
  }

  // Pub/Sub for real-time features
  async publish(channel: string, message: any): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  async subscribe(
    channel: string,
    callback: (message: any) => void
  ): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on("message", (receivedChannel, message) => {
      if (receivedChannel === channel) {
        callback(JSON.parse(message));
      }
    });
  }

  // Get Redis client for advanced operations
  getClient(): Redis {
    return this.client;
  }

  // Close connections
  async close(): Promise<void> {
    await this.client.quit();
    await this.subscriber.quit();
    await this.publisher.quit();
  }
}

export default new RedisClient();
```

## Database Connection Setup

### 1. MongoDB Connection

```typescript
// backend/src/config/database.ts
import mongoose from "mongoose";
import { config } from "./config";

class Database {
  private connection: mongoose.Connection | null = null;

  async connect(): Promise<void> {
    try {
      const conn = await mongoose.connect(config.mongodb.uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0,
      });

      this.connection = conn.connection;

      console.log(`MongoDB connected: ${conn.connection.host}`);

      // Handle connection events
      this.connection.on("connected", () => {
        console.log("MongoDB connected successfully");
      });

      this.connection.on("error", (err) => {
        console.error("MongoDB connection error:", err);
      });

      this.connection.on("disconnected", () => {
        console.log("MongoDB disconnected");
      });

      // Handle application termination
      process.on("SIGINT", async () => {
        await this.close();
        process.exit(0);
      });
    } catch (error) {
      console.error("Database connection failed:", error);
      process.exit(1);
    }
  }

  async close(): Promise<void> {
    if (this.connection) {
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
    }
  }

  getConnection(): mongoose.Connection | null {
    return this.connection;
  }
}

export default new Database();
```

### 2. Configuration File

```typescript
// backend/src/config/config.ts
import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || "development",

  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce",
  },

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0"),
  },

  jwt: {
    secret: process.env.JWT_SECRET || "your-super-secret-jwt-key",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    region: process.env.AWS_REGION || "us-west-2",
    s3Bucket: process.env.AWS_S3_BUCKET || "ecommerce-images",
  },

  email: {
    service: process.env.EMAIL_SERVICE || "gmail",
    user: process.env.EMAIL_USER || "",
    password: process.env.EMAIL_PASS || "",
  },
};
```

## Indexing Strategy

### 1. Database Indexes

```typescript
// backend/src/config/indexes.ts
import mongoose from "mongoose";

export const createIndexes = async (): Promise<void> => {
  try {
    // User indexes
    await mongoose
      .model("User")
      .createIndexes([
        { email: 1 },
        { "addresses.zipCode": 1 },
        { role: 1 },
        { isActive: 1 },
        { createdAt: -1 },
      ]);

    // Product indexes
    await mongoose
      .model("Product")
      .createIndexes([
        { name: "text", description: "text", brand: "text", tags: "text" },
        { sku: 1 },
        { "seo.slug": 1 },
        { category: 1 },
        { brand: 1 },
        { price: 1 },
        { isActive: 1 },
        { isFeatured: 1 },
        { averageRating: -1 },
        { createdAt: -1 },
        { vendor: 1 },
        { "inventory.quantity": 1 },
        { "inventory.stockStatus": 1 },
      ]);

    // Order indexes
    await mongoose
      .model("Order")
      .createIndexes([
        { orderNumber: 1 },
        { customer: 1 },
        { status: 1 },
        { "payment.status": 1 },
        { createdAt: -1 },
        { "items.product": 1 },
      ]);

    // Cart indexes
    await mongoose
      .model("Cart")
      .createIndexes([
        { customer: 1 },
        { sessionId: 1 },
        { expiresAt: 1 },
        { "items.product": 1 },
      ]);

    // Review indexes
    await mongoose
      .model("Review")
      .createIndexes([
        { product: 1 },
        { customer: 1 },
        { rating: 1 },
        { isApproved: 1 },
        { createdAt: -1 },
        { helpfulVotes: -1 },
      ]);

    // Category indexes
    await mongoose
      .model("Category")
      .createIndexes([
        { slug: 1 },
        { parent: 1 },
        { isActive: 1 },
        { sortOrder: 1 },
      ]);

    console.log("Database indexes created successfully");
  } catch (error) {
    console.error("Error creating database indexes:", error);
  }
};
```

## Data Validation

### 1. Mongoose Validation Helpers

```typescript
// backend/src/utils/validators.ts
import mongoose from "mongoose";

export const validators = {
  // Email validation
  email: {
    validator: (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },
    message: "Please enter a valid email address",
  },

  // Phone validation
  phone: {
    validator: (phone: string): boolean => {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      return phoneRegex.test(phone);
    },
    message: "Please enter a valid phone number",
  },

  // URL validation
  url: {
    validator: (url: string): boolean => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    },
    message: "Please enter a valid URL",
  },

  // SKU validation
  sku: {
    validator: (sku: string): boolean => {
      const skuRegex = /^[A-Z0-9]{3,20}$/;
      return skuRegex.test(sku);
    },
    message:
      "SKU must be 3-20 characters long and contain only uppercase letters and numbers",
  },

  // Price validation
  price: {
    validator: (price: number): boolean => {
      return price >= 0 && price <= 999999.99;
    },
    message: "Price must be between 0 and 999999.99",
  },

  // ObjectId validation
  objectId: {
    validator: (id: string): boolean => {
      return mongoose.Types.ObjectId.isValid(id);
    },
    message: "Invalid ObjectId",
  },
};
```

### 2. Custom Validation Middleware

```typescript
// backend/src/middleware/validation.ts
import { Request, Response, NextFunction } from "express";
import { validationResult, ValidationChain } from "express-validator";

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    next();
  };
};
```

## Database Operations Examples

### 1. User Operations

```typescript
// backend/src/services/userService.ts
import User, { IUser } from "../models/User";
import redisClient from "../config/redis";

export class UserService {
  async createUser(userData: Partial<IUser>): Promise<IUser> {
    const user = new User(userData);
    const savedUser = await user.save();

    // Cache user data
    await redisClient.setCache(`user:${savedUser._id}`, savedUser, 3600);

    return savedUser;
  }

  async getUserById(userId: string): Promise<IUser | null> {
    // Try cache first
    const cachedUser = await redisClient.getCache(`user:${userId}`);
    if (cachedUser) {
      return cachedUser;
    }

    // Fetch from database
    const user = await User.findById(userId).select("-password");
    if (user) {
      await redisClient.setCache(`user:${userId}`, user, 3600);
    }

    return user;
  }

  async updateUser(
    userId: string,
    updateData: Partial<IUser>
  ): Promise<IUser | null> {
    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (user) {
      // Update cache
      await redisClient.setCache(`user:${userId}`, user, 3600);
    }

    return user;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(userId);

    if (result) {
      // Remove from cache
      await redisClient.deleteCache(`user:${userId}`);
    }

    return !!result;
  }
}
```

### 2. Product Operations

```typescript
// backend/src/services/productService.ts
import Product, { IProduct } from "../models/Product";
import redisClient from "../config/redis";

export class ProductService {
  async getProducts(
    filters: any = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{
    products: IProduct[];
    total: number;
    pages: number;
  }> {
    const cacheKey = `products:${JSON.stringify(filters)}:${page}:${limit}`;

    // Try cache first
    const cachedResult = await redisClient.getCache(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const query = Product.find(filters)
      .populate("category", "name slug")
      .populate("vendor", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const [products, total] = await Promise.all([
      query.exec(),
      Product.countDocuments(filters),
    ]);

    const result = {
      products,
      total,
      pages: Math.ceil(total / limit),
    };

    // Cache result for 10 minutes
    await redisClient.setCache(cacheKey, result, 600);

    return result;
  }

  async getProductBySlug(slug: string): Promise<IProduct | null> {
    const cacheKey = `product:slug:${slug}`;

    // Try cache first
    const cachedProduct = await redisClient.getCache(cacheKey);
    if (cachedProduct) {
      return cachedProduct;
    }

    const product = await Product.findOne({ "seo.slug": slug, isActive: true })
      .populate("category", "name slug")
      .populate("vendor", "firstName lastName");

    if (product) {
      await redisClient.setCache(cacheKey, product, 1800); // 30 minutes
    }

    return product;
  }

  async updateProductInventory(
    productId: string,
    quantity: number
  ): Promise<IProduct | null> {
    const product = await Product.findByIdAndUpdate(
      productId,
      {
        "inventory.quantity": quantity,
        "inventory.stockStatus": quantity > 0 ? "in_stock" : "out_of_stock",
      },
      { new: true }
    );

    if (product) {
      // Clear product cache
      await redisClient.deleteCachePattern(`product:*${productId}*`);
      await redisClient.deleteCachePattern(`products:*`);
    }

    return product;
  }
}
```

### 3. Session Management

```typescript
// backend/src/services/sessionService.ts
import { v4 as uuidv4 } from "uuid";
import redisClient from "../config/redis";

export class SessionService {
  async createSession(userId: string, userData: any): Promise<string> {
    const sessionId = uuidv4();
    const sessionData = {
      userId,
      ...userData,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    await redisClient.setSession(sessionId, sessionData, 24 * 3600); // 24 hours
    return sessionId;
  }

  async getSession(sessionId: string): Promise<any> {
    const sessionData = await redisClient.getSession(sessionId);

    if (sessionData) {
      // Update last activity
      sessionData.lastActivity = new Date();
      await redisClient.setSession(sessionId, sessionData, 24 * 3600);
    }

    return sessionData;
  }

  async updateSession(sessionId: string, updateData: any): Promise<void> {
    const sessionData = await redisClient.getSession(sessionId);

    if (sessionData) {
      const updatedData = {
        ...sessionData,
        ...updateData,
        lastActivity: new Date(),
      };

      await redisClient.setSession(sessionId, updatedData, 24 * 3600);
    }
  }

  async destroySession(sessionId: string): Promise<void> {
    await redisClient.deleteSession(sessionId);
  }

  async cleanupExpiredSessions(): Promise<void> {
    // This would typically be handled by Redis TTL
    // But you can implement custom cleanup logic here
  }
}
```

## Environment Variables

```bash
# Update your .env file with these database-specific variables

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/ecommerce

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Database Connection Pool
MONGODB_MAX_POOL_SIZE=10
MONGODB_SERVER_SELECTION_TIMEOUT=5000
MONGODB_SOCKET_TIMEOUT=45000

# Session Configuration
SESSION_SECRET=your-session-secret-key
SESSION_TIMEOUT=86400

# Cache Configuration
CACHE_DEFAULT_TTL=3600
CACHE_PRODUCTS_TTL=1800
CACHE_USERS_TTL=3600
```

## Installation Commands

```bash
# Install required dependencies
cd backend
npm install mongoose ioredis @types/ioredis dotenv express-validator bcryptjs @types/bcryptjs uuid @types/uuid

# For development
npm install --save-dev @types/mongoose nodemon ts-node
```

This comprehensive database design provides a solid foundation for your e-commerce platform with proper schemas, Redis integration, caching strategies, and data validation. The schemas are designed to be scalable and include all necessary fields for a modern e-commerce application.
