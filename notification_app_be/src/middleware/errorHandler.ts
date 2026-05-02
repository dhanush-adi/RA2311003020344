// src/middleware/errorHandler.ts — Global Express error handler

import { Request, Response, NextFunction } from "express";
import { createLogger } from "../../../logging_middleware/src";

const errLogger = createLogger(
  "backend",
  process.env.EVAL_AUTH_TOKEN,
  process.env.EVAL_API_BASE
);

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  errLogger.error("middleware", `Unhandled error on ${req.method} ${req.path}: ${err.message}`);
  res.status(500).json({ success: false, error: "An unexpected error occurred" });
}

export function notFoundHandler(req: Request, res: Response): void {
  errLogger.warn("middleware", `404 — route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.originalUrl} not found` });
}
