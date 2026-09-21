import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";

const errorHandling = (err: Error | ApiError, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const isOperational = err instanceof ApiError && statusCode < 500;

  if (isOperational) {
    // Expected client errors (validation, not found, auth, etc.) — brief log only.
    logger.warn(
      { statusCode, method: req.method, url: req.originalUrl },
      err.message,
    );
  } else {
    // Unexpected/server errors — log full detail for debugging.
    logger.error(
      { statusCode, method: req.method, url: req.originalUrl, err, cause: err.cause },
      err.message,
    );
  }

  return res.status(statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

export default errorHandling;
