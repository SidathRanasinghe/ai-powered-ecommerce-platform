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

export default mongoose.model<ICategory>("Category", CategorySchema);
