import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";

const errorHandling = (err: Error | ApiError, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err.message);

  if (err.cause) {
    console.error("Caused by:", err.cause);
  }

  const statusCode = err instanceof ApiError ? err.statusCode : 500;

  return res.status(statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

export default errorHandling;
