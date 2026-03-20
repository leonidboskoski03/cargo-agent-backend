import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";

const PASSWORD_SALT_ROUNDS = 12;

export async function hashPassword(plainPassword: string) {
  return bcrypt.hash(plainPassword, PASSWORD_SALT_ROUNDS);
}

export async function verifyPassword(plainPassword: string, storedHash: string) {
  if (!storedHash) {
    return false;
  }

  if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
    return bcrypt.compare(plainPassword, storedHash);
  }

  // Temporary legacy fallback for non-hashed bootstrap users in non-production environments.
  if (env.NODE_ENV !== "production") {
    return plainPassword === storedHash;
  }

  return false;
}

