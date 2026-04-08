import { UserRole } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { env } from "../../config/env.js";

export function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createRefreshToken() {
  return randomBytes(48).toString("hex");
}

export function getRefreshExpiresAt() {
  return new Date(Date.now() + env.JWT_REFRESH_SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export function hashOtpCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string) {
  return value.trim();
}

export function generateOtpCode() {
  const max = 10 ** env.AUTH_OTP_CODE_LENGTH;
  const num = Math.floor(Math.random() * max);
  return num.toString().padStart(env.AUTH_OTP_CODE_LENGTH, "0");
}

export function getOtpExpiresAt() {
  return new Date(Date.now() + env.AUTH_OTP_TTL_MINUTES * 60 * 1000);
}

export function getRegistrationDraftExpiresAt() {
  return new Date(Date.now() + env.AUTH_OTP_TTL_MINUTES * 60 * 1000);
}

export function getNextResendAt() {
  return new Date(Date.now() + env.AUTH_OTP_RESEND_COOLDOWN_SECONDS * 1000);
}

export function shouldRequireLoginMfa(role: UserRole) {
  return env.AUTH_LOGIN_MFA_REQUIRED_ROLES.includes(role);
}

