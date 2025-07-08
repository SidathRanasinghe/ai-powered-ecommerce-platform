import { Router } from "express";
import authRoutes from "./auth";
import cartRoutes from "./cart";
import ordersRoutes from "./orders";
import productsRoutes from "./products";
import userRoutes from "./users";

const router = Router();

router.use("/auth", authRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", ordersRoutes);
router.use("/products", productsRoutes);
router.use("/users", userRoutes);

export default router;
