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
  reviews: IProductReview[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductImage {
  _id?: mongoose.Types.ObjectId; // Optional ID for the image
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
  createdAt?: Date; // Optional creation date
  updatedAt?: Date; // Optional update date
}

export interface IProductVariant {
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
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInventory {
  quantity: number;
  lowStockThreshold: number;
  trackQuantity: boolean;
  allowBackorders: boolean;
  stockStatus: "in_stock" | "out_of_stock" | "limited_stock";
}

export interface IShipping {
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

export interface ISEO {
  title?: string;
  description?: string;
  keywords: string[];
  slug: string;
}

export interface IProductReview {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  rating?: number;
  product?: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId;
  title?: string;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
  images?: string[];
  isVerified?: boolean;
  isApproved?: boolean;
  helpfulVotes?: number;
  reportedCount?: number;
}

const ProductImageSchema = new Schema<IProductImage>({
  url: { type: String, required: true },
  alt: { type: String, required: true },
  isPrimary: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const ProductReviewsSchema = new Schema<IProductReview>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, min: 1, max: 5 },
  product: { type: Schema.Types.ObjectId, ref: "Product" },
  order: { type: Schema.Types.ObjectId, ref: "Order" },
  title: { type: String, maxlength: 100 },
  comment: { type: String, required: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  images: [{ type: String }],
  isVerified: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false },
  helpfulVotes: { type: Number, default: 0 },
  reportedCount: { type: Number, default: 0 },
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
    reviews: [ProductReviewsSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
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
