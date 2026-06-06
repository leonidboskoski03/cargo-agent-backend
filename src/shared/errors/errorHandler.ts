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
  if (isPayloadTooLargeError(error)) {
    return res.status(413).json({
      success: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Uploaded data is too large. Use an image under 5 MB.",
      },
      meta: { traceId: req.requestId },
    });
  }

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

function isPayloadTooLargeError(error: unknown) {
  return typeof error === "object" && error !== null && "type" in error && error.type === "entity.too.large";
}

