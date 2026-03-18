import type { NextFunction, Request, Response } from "express";
import { AppError } from "./AppError.js";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: `Route not found: ${req.originalUrl}` },
    meta: { traceId: req.requestId },
  });
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      meta: { traceId: req.requestId },
    });
  }

  return res.status(500).json({
    success: false,
    error: { code: "INTERNAL_SERVER_ERROR", message: "Unexpected server error" },
    meta: { traceId: req.requestId },
  });
}

