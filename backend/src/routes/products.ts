import { Router } from "express";
import { body, param, query } from "express-validator";
import { validate } from "@/middleware/validation";
import { authenticateToken, authorize, optionalAuth } from "@/middleware/auth";
import { apiRateLimiter } from "@/middleware/rateLimiter";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductsByCategory,
  uploadProductImages,
  getProductReviews,
  addProductReview,
  updateProductReview,
  deleteProductReview,
} from "@/controllers/productController";

const router = Router();

// Validation rules
const createProductValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage("Product name must be between 2 and 200 characters"),
  body("description")
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("category").notEmpty().withMessage("Category is required"),
  body("brand")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Brand name must be between 2 and 100 characters"),
  body("sku")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("SKU must be between 2 and 50 characters"),
  body("stock")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
  body("weight")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Weight must be a positive number"),
  body("dimensions.length")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Length must be a positive number"),
  body("dimensions.width")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Width must be a positive number"),
  body("dimensions.height")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Height must be a positive number"),
];

const updateProductValidation = [
  param("id").isMongoId().withMessage("Invalid product ID"),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage("Product name must be between 2 and 200 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("category")
    .optional()
    .notEmpty()
    .withMessage("Category cannot be empty"),
  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
];

const productIdValidation = [
  param("id").isMongoId().withMessage("Invalid product ID"),
];

const reviewValidation = [
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  body("comment")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Comment must be between 10 and 1000 characters"),
];

const searchValidation = [
  query("q")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters"),
  query("category").optional().trim(),
  query("minPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum price must be a positive number"),
  query("maxPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum price must be a positive number"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

// Product routes
router.get("/", optionalAuth, validate(searchValidation), getProducts);
router.get("/search", optionalAuth, validate(searchValidation), searchProducts);
router.get("/category/:category", optionalAuth, getProductsByCategory);
router.get("/:id", optionalAuth, validate(productIdValidation), getProductById);

// Admin routes
router.post(
  "/",
  authenticateToken,
  authorize("admin"),
  apiRateLimiter,
  validate(createProductValidation),
  createProduct
);
router.put(
  "/:id",
  authenticateToken,
  authorize("admin"),
  validate(updateProductValidation),
  updateProduct
);
router.delete(
  "/:id",
  authenticateToken,
  authorize("admin"),
  validate(productIdValidation),
  deleteProduct
);
router.post(
  "/:id/images",
  authenticateToken,
  authorize("admin"),
  validate(productIdValidation),
  uploadProductImages
);

// Review routes
router.get("/:id/reviews", validate(productIdValidation), getProductReviews);
router.post(
  "/:id/reviews",
  authenticateToken,
  validate([...productIdValidation, ...reviewValidation]),
  addProductReview
);
router.put(
  "/:id/reviews/:reviewId",
  authenticateToken,
  validate([
    ...productIdValidation,
    param("reviewId").isMongoId().withMessage("Invalid review ID"),
  ]),
  updateProductReview
);
router.delete(
  "/:id/reviews/:reviewId",
  authenticateToken,
  validate([
    ...productIdValidation,
    param("reviewId").isMongoId().withMessage("Invalid review ID"),
  ]),
  deleteProductReview
);

export default router;
