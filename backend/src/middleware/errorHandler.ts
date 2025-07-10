import { Request, Response, NextFunction } from "express";
import { logger } from "@/utils/logger";
import { config } from "@/config/config";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next?: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error("Error:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = createError(message, 404);
  }

  // Mongoose duplicate key
  if (err.name === "MongoError" && (err as any).code === 11000) {
    const message = "Duplicate field value entered";
    error = createError(message, 400);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values((err as any).errors).map(
      (val: any) => val.message
    );
    error = createError(message.join(", "), 400);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = createError(message, 401);
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = createError(message, 401);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal Server Error",
    ...(config.nodeEnv === "development" && { stack: err.stack }),
  });
};

// Create error utility function
export const createError = (message: string, statusCode: number): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

// Async error handler wrapper
export const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
