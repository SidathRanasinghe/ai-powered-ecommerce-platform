import mongoose, { Document, Schema } from "mongoose";

export interface ICoupon extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  applicableProducts?: mongoose.Types.ObjectId[];
  applicableCategories?: string[];
  excludedProducts?: mongoose.Types.ObjectId[];
  userRestrictions?: {
    userType?: "new" | "existing" | "all";
    specificUsers?: mongoose.Types.ObjectId[];
  };
  createdAt: Date;
  updatedAt: Date;
  isValid(): boolean;
  canBeUsedBy(userId: mongoose.Types.ObjectId): boolean;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      min: 0,
    },
    validFrom: {
      type: Date,
      required: true,
      index: true,
    },
    validUntil: {
      type: Date,
      required: true,
      index: true,
    },
    usageLimit: {
      type: Number,
      required: true,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    applicableProducts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    applicableCategories: [
      {
        type: String,
        trim: true,
      },
    ],
    excludedProducts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    userRestrictions: {
      userType: {
        type: String,
        enum: ["new", "existing", "all"],
        default: "all",
      },
      specificUsers: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
couponSchema.index({ code: 1, isActive: 1 });
couponSchema.index({ validFrom: 1, validUntil: 1, isActive: 1 });
couponSchema.index({ usageLimit: 1, usedCount: 1, isActive: 1 });

// Methods
// Methods
couponSchema.methods["isValid"] = function (): boolean {
  const now = new Date();
  return (
    this["isActive"] &&
    this["validFrom"] <= now &&
    this["validUntil"] >= now &&
    this["usedCount"] < this["usageLimit"]
  );
};

couponSchema.methods["canBeUsedBy"] = function (
  userId: mongoose.Types.ObjectId
): boolean {
  if (!this["userRestrictions"]) return true;

  if (this["userRestrictions"].userType === "all") return true;

  if (
    this["userRestrictions"].specificUsers &&
    this["userRestrictions"].specificUsers.length > 0
  ) {
    return this["userRestrictions"].specificUsers.includes(userId);
  }

  return true;
};

export default mongoose.model<ICoupon>("Coupon", couponSchema);
