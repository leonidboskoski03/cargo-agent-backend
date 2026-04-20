import type { UserRole } from "@prisma/client";
import { Roles } from "../../shared/auth/permissions.js";
import { AppError } from "../../shared/errors/AppError.js";
import { UsersRepository } from "./users.repository.js";
import { assertCanReadUser, assertCompanyAdmin, requireAuth } from "./users.helpers.js";
import type {
  AuthContext,
  ListUsersQuery,
  UpdateMyProfileBody,
  UpdateUserMembershipBody,
} from "./users.types.js";

const repo = new UsersRepository();


export class UsersService {
  async getMyProfileCompletion(auth: AuthContext) {
    requireAuth(auth);

    const user = await repo.findActiveById(auth.userId);

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    const checks: Array<{ key: string; done: boolean; weight: number }> = [
      { key: "firstName", done: Boolean(user.firstName?.trim()), weight: 10 },
      { key: "lastName", done: Boolean(user.lastName?.trim()), weight: 10 },
      { key: "emailVerified", done: Boolean(user.emailVerifiedAt), weight: 15 },
      { key: "phone", done: Boolean(user.phone?.trim()), weight: 10 },
      { key: "countryCode", done: Boolean(user.countryCode?.trim()), weight: 10 },
      { key: "city", done: Boolean(user.city?.trim()), weight: 10 },
    ];

    if (auth.role === Roles.JOB_SEEKER) {
      checks.push(
        { key: "headline", done: Boolean(user.headline?.trim()), weight: 10 },
        { key: "yearsExperience", done: typeof user.yearsExperience === "number", weight: 10 },
        { key: "availability", done: Boolean(user.availability?.trim()), weight: 10 },
        {
          key: "preferredRoutes",
          done: Array.isArray(user.preferredRoutes) ? user.preferredRoutes.length > 0 : false,
          weight: 15,
        },
      );
    }

    if (auth.role === Roles.COMPANY_ADMIN || auth.role === Roles.COMPANY_DRIVER) {
      if (!auth.companyId) {
        throw new AppError(403, "COMPANY_REQUIRED", "Company users must belong to a company");
      }

      const company = await repo.findCompanyProfileById(auth.companyId);
      if (!company) {
        throw new AppError(404, "COMPANY_NOT_FOUND", "Company not found");
      }

      checks.push(
        { key: "companyName", done: Boolean(company.name?.trim()), weight: 10 },
        { key: "companyType", done: Boolean(company.companyType), weight: 10 },
        { key: "registrationNumber", done: Boolean(company.registrationNumber?.trim()), weight: 15 },
        { key: "companyCountryCode", done: Boolean(company.countryCode?.trim()), weight: 10 },
        { key: "companyCity", done: Boolean(company.city?.trim()), weight: 10 },
        { key: "companyAddress", done: Boolean(company.address?.trim()), weight: 10 },
        { key: "companyWebsite", done: Boolean(company.website?.trim()), weight: 5 },
        { key: "companyPhone", done: Boolean(company.phone?.trim()), weight: 5 },
        { key: "companyEmail", done: Boolean(company.email?.trim()), weight: 5 },
      );
    }

    const total = checks.reduce((sum, item) => sum + item.weight, 0);
    const completed = checks.filter((item) => item.done);
    const score = completed.reduce((sum, item) => sum + item.weight, 0);
    const missingItems = checks.filter((item) => !item.done).map((item) => item.key);

    return {
      percent: total > 0 ? Math.round((score / total) * 100) : 0,
      completedItems: completed.map((item) => item.key),
      missingItems,
      nextBestAction: missingItems[0] ?? null,
    };
  }

  async getMe(auth: AuthContext) {
    requireAuth(auth);

    const user = await repo.findActiveById(auth.userId);

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    return user;
  }

  async list(auth: AuthContext, query: ListUsersQuery) {
    requireAuth(auth);

    if (auth.role === Roles.COMPANY_ADMIN) {
      assertCompanyAdmin(auth);
      const companyId = auth.companyId;
      if (!companyId) {
        throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
      }

      return repo.listForCompany(companyId, query.includeInactive);
    }

    return repo.listPersonalUser(auth.userId);
  }

  async getById(auth: AuthContext, userId: string) {
    requireAuth(auth);

    const user = await repo.findActiveById(userId);

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    assertCanReadUser(auth, {
      id: user.id,
      companyId: user.companyId,
    });

    return user;
  }

  async updateMyProfile(auth: AuthContext, body: UpdateMyProfileBody) {
    requireAuth(auth);

    if (body.role !== undefined || body.companyId !== undefined) {
      throw new AppError(403, "FORBIDDEN_ROLE_COMPANY_MUTATION", "Role and company linkage can only be changed by company admins");
    }

    const user = await repo.findActiveById(auth.userId);

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    return repo.updateProfile(auth.userId, {
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      isActive: body.isActive,
    });
  }

  async updateMembership(auth: AuthContext, userId: string, body: UpdateUserMembershipBody) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    const targetUser = await repo.findActiveById(userId);

    if (!targetUser) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    if (targetUser.id === auth.userId) {
      throw new AppError(400, "SELF_MEMBERSHIP_CHANGE_FORBIDDEN", "You cannot change your own role or company linkage");
    }

    if (targetUser.companyId && targetUser.companyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only manage users from your company");
    }

    if (body.companyId && body.companyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only assign users to your own company");
    }

    if (!body.companyId && body.role !== Roles.JOB_SEEKER) {
      throw new AppError(400, "INVALID_ROLE_FOR_PERSONAL_USER", "Users without company must have JOB_SEEKER role");
    }

    if (body.companyId) {
      const company = await repo.findCompanyById(body.companyId);
      if (!company) {
        throw new AppError(404, "COMPANY_NOT_FOUND", "Company not found");
      }
    }

    return repo.updateMembership(userId, {
      role: body.role,
      companyId: body.companyId,
    });
  }

  async remove(auth: AuthContext, userId: string) {
    requireAuth(auth);

    const targetUser = await repo.findActiveById(userId);

    if (!targetUser) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    if (auth.userId !== userId) {
      assertCompanyAdmin(auth);

      if (targetUser.companyId !== auth.companyId) {
        throw new AppError(403, "FORBIDDEN", "You can only delete users from your company");
      }
    }

    return repo.softDelete(userId);
  }

  async restore(auth: AuthContext, userId: string) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    const targetUser = await repo.findAnyById(userId);

    if (!targetUser) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    if (!targetUser.deletedAt) {
      throw new AppError(400, "USER_NOT_DELETED", "User is already active");
    }

    if (targetUser.companyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only restore users from your company");
    }

    return repo.restore(userId);
  }
}


