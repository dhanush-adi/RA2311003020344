// middleware/express.ts — Express request/response logging middleware

import { Request, Response, NextFunction } from "express";
import { Logger } from "../logger";

/**
 * Creates an Express middleware that logs every incoming request and
 * its eventual response status + duration using the provided Logger.
 *
 * Usage:
 *   app.use(createRequestLogger(logger));
 */
export function createRequestLogger(logger: Logger) {
  return function requestLogger(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const startedAt = Date.now();
    const { method, originalUrl } = req;

    logger.info("middleware", `Incoming ${method} ${originalUrl}`);

    res.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      const { statusCode } = res;
      const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
      logger.Log(
        "middleware",
        level,
        `${method} ${originalUrl} → ${statusCode} (${durationMs}ms)`
      );
    });

    next();
  };
}
