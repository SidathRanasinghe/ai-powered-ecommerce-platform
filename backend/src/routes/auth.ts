import { Router } from "express";
import { body } from "express-validator";
import { validate } from "@/middleware/validation";
import { authRateLimiter } from "@/middleware/rateLimiter";
import { authenticateToken } from "@/middleware/auth";
import {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from "@/controllers/authController";

const router = Router();

// Validation rules
const registerValidation = [
  body("firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),
  body("lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  body("phone")
    .optional()
    .isMobilePhone("any")
    .withMessage("Please provide a valid phone number"),
];

const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

const forgotPasswordValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
];

const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Reset token is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
];

// Routes
router.post(
  "/register",
  authRateLimiter,
  validate(registerValidation),
  register
);
router.post("/login", authRateLimiter, validate(loginValidation), login);
router.post("/logout", authenticateToken, logout);
router.post("/refresh-token", refreshToken);
router.post(
  "/forgot-password",
  authRateLimiter,
  validate(forgotPasswordValidation),
  forgotPassword
);
router.post(
  "/reset-password",
  authRateLimiter,
  validate(resetPasswordValidation),
  resetPassword
);
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", authRateLimiter, resendVerification);

export default router;
