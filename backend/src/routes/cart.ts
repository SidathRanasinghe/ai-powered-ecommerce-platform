import { Router } from "express";
import { body, param } from "express-validator";
import { validate } from "@/middleware/validation";
import { authenticateToken } from "@/middleware/auth";
import { apiRateLimiter } from "@/middleware/rateLimiter";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon,
} from "@/controllers/cartController";

const router = Router();

// Validation rules
const addToCartValidation = [
  body("productId").isMongoId().withMessage("Invalid product ID"),
  body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  body("variant")
    .optional()
    .isObject()
    .withMessage("Variant must be an object"),
];

const updateCartItemValidation = [
  param("itemId").isMongoId().withMessage("Invalid item ID"),
  body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
];

const removeFromCartValidation = [
  param("itemId").isMongoId().withMessage("Invalid item ID"),
];

const couponValidation = [
  body("couponCode")
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Coupon code must be between 3 and 20 characters"),
];

// Cart routes
router.get("/", authenticateToken, getCart);
router.post(
  "/add",
  authenticateToken,
  apiRateLimiter,
  validate(addToCartValidation),
  addToCart
);
router.put(
  "/item/:itemId",
  authenticateToken,
  validate(updateCartItemValidation),
  updateCartItem
);
router.delete(
  "/item/:itemId",
  authenticateToken,
  validate(removeFromCartValidation),
  removeFromCart
);
router.delete("/clear", authenticateToken, clearCart);
router.post(
  "/coupon",
  authenticateToken,
  validate(couponValidation),
  applyCoupon
);
router.delete("/coupon", authenticateToken, removeCoupon);

export default router;
