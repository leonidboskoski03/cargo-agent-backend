import { Router } from "express";
import { env } from "../../config/env.js";
import { Roles } from "../../shared/auth/permissions.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ok } from "../../shared/http/apiResponse.js";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { authFromRequest } from "../../shared/http/controllerAuth.helpers.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";

export const deliveryRouter = Router();

deliveryRouter.get("/status", requireAuth, asyncRoute(async (req, res) => {
  const auth = authFromRequest(req);

  if (auth.role !== Roles.COMPANY_ADMIN) {
    throw new AppError(403, "FORBIDDEN", "Delivery readiness status is available to company admins only");
  }

  const emailMissing = [
    env.EMAIL_PROVIDER === "resend" && !env.RESEND_API_KEY ? "RESEND_API_KEY" : null,
    env.EMAIL_PROVIDER === "resend" && !env.RESEND_FROM_EMAIL ? "RESEND_FROM_EMAIL" : null,
  ].filter((item): item is string => Boolean(item));

  const storageMissing = [
    env.STORAGE_PROVIDER === "s3" && !env.S3_ENDPOINT ? "S3_ENDPOINT" : null,
    env.STORAGE_PROVIDER === "s3" && !env.S3_BUCKET ? "S3_BUCKET" : null,
    env.STORAGE_PROVIDER === "s3" && !env.S3_ACCESS_KEY_ID ? "S3_ACCESS_KEY_ID" : null,
    env.STORAGE_PROVIDER === "s3" && !env.S3_SECRET_ACCESS_KEY ? "S3_SECRET_ACCESS_KEY" : null,
  ].filter((item): item is string => Boolean(item));

  const emailConfigured = env.EMAIL_PROVIDER === "resend" && emailMissing.length === 0;
  const storageConfigured = env.STORAGE_PROVIDER === "local" || storageMissing.length === 0;

  return ok(res, {
    email: {
      configured: emailConfigured,
      missing: env.EMAIL_PROVIDER === "resend" ? emailMissing : ["PRODUCTION_EMAIL_PROVIDER"],
      mode: emailConfigured ? "provider" : "simulated",
      provider: emailConfigured ? "resend" : "simulated",
    },
    invites: {
      acceptUrlBase: env.INVITE_ACCEPT_URL_BASE,
      configured: emailConfigured,
      provider: emailConfigured ? "resend" : "simulated",
    },
    otp: {
      configured: emailConfigured,
      previewEnabled: env.AUTH_OTP_PREVIEW_IN_NON_PROD,
      provider: env.AUTH_OTP_PROVIDER,
    },
    storage: {
      allowedMimeTypes: env.UPLOAD_ALLOWED_MIME_TYPES,
      configured: storageConfigured,
      maxUploadBytes: env.UPLOAD_MAX_BYTES,
      missing: storageMissing,
      provider: env.STORAGE_PROVIDER,
    },
  });
}));
