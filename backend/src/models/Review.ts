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

// Ensure one review per customer per product
ReviewSchema.index({ customer: 1, product: 1 }, { unique: true });

export default mongoose.model<IReview>("Review", ReviewSchema);
