import { Router } from "express";
import { body, param } from "express-validator";
import { validate } from "@/middleware/validation";
import { authenticateToken, authorize } from "@/middleware/auth";
import { apiRateLimiter } from "@/middleware/rateLimiter";
import {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  uploadAvatar,
} from "@/controllers/userController";

const router = Router();

// Validation rules
const updateProfileValidation = [
  body("firstName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),
  body("lastName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),
  body("phone")
    .optional()
    .isMobilePhone("any")
    .withMessage("Please provide a valid phone number"),
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid date"),
];

const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
];

const userIdValidation = [
  param("id").isMongoId().withMessage("Invalid user ID"),
];

// User profile routes
router.get("/profile", authenticateToken, getProfile);
router.put(
  "/profile",
  authenticateToken,
  apiRateLimiter,
  validate(updateProfileValidation),
  updateProfile
);
router.put(
  "/change-password",
  authenticateToken,
  apiRateLimiter,
  validate(changePasswordValidation),
  changePassword
);
router.delete("/account", authenticateToken, deleteAccount);
router.post("/avatar", authenticateToken, uploadAvatar);

// Admin routes
router.get("/", authenticateToken, authorize("admin"), getUsers);
router.get(
  "/:id",
  authenticateToken,
  authorize("admin"),
  validate(userIdValidation),
  getUserById
);
router.put(
  "/:id",
  authenticateToken,
  authorize("admin"),
  validate(userIdValidation),
  updateUser
);
router.delete(
  "/:id",
  authenticateToken,
  authorize("admin"),
  validate(userIdValidation),
  deleteUser
);

export default router;
