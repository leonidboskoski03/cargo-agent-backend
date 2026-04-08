import { AppError } from "../../shared/errors/AppError.js";
import { Roles } from "../../shared/auth/permissions.js";
import { assertAllowedRole, assertCanManageLicenseUser, requireAuth } from "./licenses.helpers.js";
import { LicensesRepository } from "./licenses.repository.js";
import type {
  AuthContext,
  CreateLicenseBody,
  ListLicensesQuery,
  UpdateLicenseBody,
} from "./licenses.types.js";

const repo = new LicensesRepository();


export class LicensesService {
  async list(auth: AuthContext, query: ListLicensesQuery) {
    requireAuth(auth);
    assertAllowedRole(auth.role);

    if (auth.role === Roles.COMPANY_ADMIN) {
      if (!auth.companyId) {
        throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
      }

      if (query.userId) {
        const targetUser = await repo.findUserById(query.userId);
        if (!targetUser || targetUser.deletedAt) {
          throw new AppError(404, "USER_NOT_FOUND", "User not found");
        }

        if (targetUser.companyId !== auth.companyId) {
          throw new AppError(403, "FORBIDDEN", "You can only view users in your company");
        }
      }

      return repo.listActiveByCompany(auth.companyId, query.userId);
    }

    return repo.listActiveByUser(auth.userId);
  }

  async getById(auth: AuthContext, licenseId: string) {
    requireAuth(auth);
    assertAllowedRole(auth.role);

    const license = await repo.findActiveById(licenseId);

    if (!license) {
      throw new AppError(404, "LICENSE_NOT_FOUND", "License not found");
    }

    assertCanManageLicenseUser(auth, {
      id: license.user.id,
      companyId: license.user.companyId,
    });

    return license;
  }

  async create(auth: AuthContext, body: CreateLicenseBody) {
    requireAuth(auth);
    assertAllowedRole(auth.role);

    const targetUserId = auth.role === Roles.COMPANY_ADMIN && body.userId ? body.userId : auth.userId;

    if (!targetUserId) {
      throw new AppError(400, "INVALID_TARGET_USER", "Target user is required");
    }

    const targetUser = await repo.findUserById(targetUserId);

    if (!targetUser || targetUser.deletedAt) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    assertCanManageLicenseUser(auth, {
      id: targetUser.id,
      companyId: targetUser.companyId,
    });

    try {
      return await repo.create({
        userId: targetUser.id,
        licenseType: body.licenseType,
        issuedAt: body.issuedAt,
        expiresAt: body.expiresAt,
        isValid: body.isValid,
      });
    } catch (error) {
      if (repo.isUniqueConstraintError(error)) {
        throw new AppError(409, "DUPLICATE_LICENSE", "This user already has this license type");
      }

      throw error;
    }
  }

  async update(auth: AuthContext, licenseId: string, body: UpdateLicenseBody) {
    requireAuth(auth);
    assertAllowedRole(auth.role);

    const license = await repo.findActiveById(licenseId);

    if (!license) {
      throw new AppError(404, "LICENSE_NOT_FOUND", "License not found");
    }

    assertCanManageLicenseUser(auth, {
      id: license.user.id,
      companyId: license.user.companyId,
    });

    try {
      return await repo.update(licenseId, {
        licenseType: body.licenseType,
        issuedAt: body.issuedAt,
        expiresAt: body.expiresAt,
        isValid: body.isValid,
      });
    } catch (error) {
      if (repo.isUniqueConstraintError(error)) {
        throw new AppError(409, "DUPLICATE_LICENSE", "This user already has this license type");
      }

      throw error;
    }
  }

  async remove(auth: AuthContext, licenseId: string) {
    requireAuth(auth);
    assertAllowedRole(auth.role);

    const license = await repo.findActiveById(licenseId);

    if (!license) {
      throw new AppError(404, "LICENSE_NOT_FOUND", "License not found");
    }

    assertCanManageLicenseUser(auth, {
      id: license.user.id,
      companyId: license.user.companyId,
    });

    return repo.softDelete(licenseId);
  }

  async restore(auth: AuthContext, licenseId: string) {
    requireAuth(auth);

    if (auth.role !== Roles.COMPANY_ADMIN) {
      throw new AppError(403, "FORBIDDEN", "Only company admins can restore licenses");
    }

    if (!auth.companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
    }

    const license = await repo.findAnyById(licenseId);

    if (!license) {
      throw new AppError(404, "LICENSE_NOT_FOUND", "License not found");
    }

    if (!license.deletedAt) {
      throw new AppError(400, "LICENSE_NOT_DELETED", "License is already active");
    }

    if (license.user.companyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only restore licenses in your company");
    }

    return repo.restore(licenseId);
  }
}


