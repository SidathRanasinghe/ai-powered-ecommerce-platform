import { Router } from "express";
import authRoutes from "./auth";
import userRoutes from "./users";
import productRoutes from "./products";
import cartRoutes from "./cart";
import orderRoutes from "./orders";

const router = Router();

// Route definitions
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);

// API info endpoint
router.get("/", (_req, res) => {
  res.json({
    message: "AI-Powered E-commerce Platform API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/v1/auth",
      users: "/api/v1/users",
      products: "/api/v1/products",
      cart: "/api/v1/cart",
      orders: "/api/v1/orders",
    },
  });
});

export default router;
