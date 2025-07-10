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
  shippedAt: Date | null; // Nullable for pending orders
  deliveredAt: Date | null; // Nullable for pending orders
  trackingNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IOrderItem {
  _id?: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  variantId?: mongoose.Types.ObjectId;
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
  metadata?: any;
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
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variantId: {
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
      metadata: { type: Schema.Types.Mixed },
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
    shippedAt: { type: Date, default: null }, // Nullable for pending orders
    deliveredAt: { type: Date, default: null }, // Nullable for pending orders
    trackingNumber: { type: String },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
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
