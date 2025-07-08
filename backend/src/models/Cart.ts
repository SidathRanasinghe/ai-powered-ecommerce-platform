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
