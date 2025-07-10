import { Router } from "express";
import { body, param, query } from "express-validator";
import { validate } from "@/middleware/validation";
import { authenticateToken, authorize } from "@/middleware/auth";
import { apiRateLimiter } from "@/middleware/rateLimiter";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderHistory,
  getAllOrders,
  getOrderStats,
} from "@/controllers/orderController";

const router = Router();

// Validation rules
const createOrderValidation = [
  body("shippingAddress")
    .isObject()
    .withMessage("Shipping address is required"),
  body("shippingAddress.street")
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Street address must be between 5 and 200 characters"),
  body("shippingAddress.city")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("City must be between 2 and 100 characters"),
  body("shippingAddress.state")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("State must be between 2 and 100 characters"),
  body("shippingAddress.zipCode")
    .trim()
    .isLength({ min: 5, max: 10 })
    .withMessage("ZIP code must be between 5 and 10 characters"),
  body("shippingAddress.country")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Country must be between 2 and 100 characters"),
  body("paymentMethod")
    .isIn(["stripe", "paypal", "cash_on_delivery"])
    .withMessage("Invalid payment method"),
  body("paymentIntentId")
    .optional()
    .isString()
    .withMessage("Payment intent ID must be a string"),
];

const orderIdValidation = [
  param("id").isMongoId().withMessage("Invalid order ID"),
];

const updateOrderStatusValidation = [
  param("id").isMongoId().withMessage("Invalid order ID"),
  body("status")
    .isIn(["pending", "processing", "shipped", "delivered", "cancelled"])
    .withMessage("Invalid order status"),
  body("trackingNumber")
    .optional()
    .isString()
    .withMessage("Tracking number must be a string"),
];

const orderHistoryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("status")
    .optional()
    .isIn(["pending", "processing", "shipped", "delivered", "cancelled"])
    .withMessage("Invalid order status"),
];

// Order routes
router.post(
  "/",
  authenticateToken,
  apiRateLimiter,
  validate(createOrderValidation),
  createOrder
);
router.get("/", authenticateToken, validate(orderHistoryValidation), getOrders);
router.get(
  "/history",
  authenticateToken,
  validate(orderHistoryValidation),
  getOrderHistory
);
router.get(
  "/:id",
  authenticateToken,
  validate(orderIdValidation),
  getOrderById
);
router.put(
  "/:id/cancel",
  authenticateToken,
  validate(orderIdValidation),
  cancelOrder
);

// Admin routes
router.get("/admin/all", authenticateToken, authorize("admin"), getAllOrders);
router.get(
  "/admin/stats",
  authenticateToken,
  authorize("admin"),
  getOrderStats
);
router.put(
  "/admin/:id/status",
  authenticateToken,
  authorize("admin"),
  validate(updateOrderStatusValidation),
  updateOrderStatus
);

export default router;
