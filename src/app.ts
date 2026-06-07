import cookieParser from "cookie-parser";
import express from "express";
import path from "node:path";
import { corsMiddleware, helmetMiddleware, rateLimitMiddleware } from "./config/security.js";
import { errorHandler, notFoundHandler } from "./shared/errors/errorHandler.js";
import { requestContext } from "./shared/middleware/requestContext.middleware.js";
import { requestLogger } from "./shared/middleware/requestLogger.middleware.js";
import { webhooksRouter } from "./modules/webhooks/webhooks.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { v1Router } from "./routes/v1.js";

export function buildApp() {
  const app = express();

  app.use(requestContext);
  app.use(requestLogger);
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(rateLimitMiddleware);
  app.use("/webhooks", webhooksRouter);
  app.use(cookieParser());
  app.use(express.json({ limit: "5mb" }));
  app.use("/uploads", express.static(path.resolve(process.cwd(), process.env.LOCAL_STORAGE_PATH ?? "uploads")));

  app.use("/health", healthRouter);
  app.use("/api/v1", v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

