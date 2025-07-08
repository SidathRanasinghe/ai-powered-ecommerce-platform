import mongoose from "mongoose";

export const createIndexes = async (): Promise<void> => {
  try {
    // User indexes
    await Promise.all([
      (mongoose.model("User") as any).createIndex({ email: 1 }),
      (mongoose.model("User") as any).createIndex({ "addresses.zipCode": 1 }),
      (mongoose.model("User") as any).createIndex({ role: 1 }),
      (mongoose.model("User") as any).createIndex({ isActive: 1 }),
      (mongoose.model("User") as any).createIndex({ createdAt: -1 }),
    ]);

    // Product indexes
    await Promise.all([
      (mongoose.model("Product") as any).createIndex({
        name: "text",
        description: "text",
        brand: "text",
        tags: "text",
      }),
      (mongoose.model("Product") as any).createIndex({ sku: 1 }),
      (mongoose.model("Product") as any).createIndex({ "seo.slug": 1 }),
      (mongoose.model("Product") as any).createIndex({ category: 1 }),
      (mongoose.model("Product") as any).createIndex({ brand: 1 }),
      (mongoose.model("Product") as any).createIndex({ price: 1 }),
      (mongoose.model("Product") as any).createIndex({ isActive: 1 }),
      (mongoose.model("Product") as any).createIndex({ isFeatured: 1 }),
      (mongoose.model("Product") as any).createIndex({ averageRating: -1 }),
      (mongoose.model("Product") as any).createIndex({ createdAt: -1 }),
      (mongoose.model("Product") as any).createIndex({ vendor: 1 }),
      (mongoose.model("Product") as any).createIndex({
        "inventory.quantity": 1,
      }),
      (mongoose.model("Product") as any).createIndex({
        "inventory.stockStatus": 1,
      }),
    ]);

    // Order indexes
    await Promise.all([
      (mongoose.model("Order") as any).createIndex({ orderNumber: 1 }),
      (mongoose.model("Order") as any).createIndex({ customer: 1 }),
      (mongoose.model("Order") as any).createIndex({ status: 1 }),
      (mongoose.model("Order") as any).createIndex({ "payment.status": 1 }),
      (mongoose.model("Order") as any).createIndex({ createdAt: -1 }),
      (mongoose.model("Order") as any).createIndex({ "items.product": 1 }),
    ]);

    // Cart indexes
    await Promise.all([
      (mongoose.model("Cart") as any).createIndex({ customer: 1 }),
      (mongoose.model("Cart") as any).createIndex({ sessionId: 1 }),
      (mongoose.model("Cart") as any).createIndex({ expiresAt: 1 }),
      (mongoose.model("Cart") as any).createIndex({ "items.product": 1 }),
    ]);

    // Review indexes
    await Promise.all([
      (mongoose.model("Review") as any).createIndex({ product: 1 }),
      (mongoose.model("Review") as any).createIndex({ customer: 1 }),
      (mongoose.model("Review") as any).createIndex({ rating: 1 }),
      (mongoose.model("Review") as any).createIndex({ isApproved: 1 }),
      (mongoose.model("Review") as any).createIndex({ createdAt: -1 }),
      (mongoose.model("Review") as any).createIndex({ helpfulVotes: -1 }),
    ]);

    // Category indexes
    await Promise.all([
      (mongoose.model("Category") as any).createIndex({ slug: 1 }),
      (mongoose.model("Category") as any).createIndex({ parent: 1 }),
      (mongoose.model("Category") as any).createIndex({ isActive: 1 }),
      (mongoose.model("Category") as any).createIndex({ sortOrder: 1 }),
    ]);

    console.log("Database indexes created successfully");
  } catch (error) {
    console.error("Error creating database indexes:", error);
  }
};
