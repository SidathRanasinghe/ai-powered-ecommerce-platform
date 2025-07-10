import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "@/config/config";
import { createError } from "@/middleware/errorHandler";
import User from "@/models/User";

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return next(createError("Access token required", 401));
    }

    const decoded = jwt.verify(token, config.jwt.secret) as any;
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return next(createError("User not found", 401));
    }

    if (!user.isActive) {
      return next(createError("User account is deactivated", 401));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(createError("Invalid token", 401));
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError("User not authenticated", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(createError("Not authorized to access this resource", 403));
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      const user = await User.findById(decoded.id).select("-password");

      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
