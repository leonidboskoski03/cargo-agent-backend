import { AppError } from "../../shared/errors/AppError.js";
import type { AuthContext } from "./jobApplications.types.js";

export function requireAuth(auth: AuthContext) {
  if (!auth.userId || !auth.role) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

