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
  next: NextFunction
) => {
  // content
};
