import { Prisma, type UserRole } from "@prisma/client";
import { AppError } from "../../shared/errors/AppError.js";
import { enqueueCompanyVerification } from "../../shared/queue/companyVerification.queue.js";
import { assertCompanyAdmin, assertCompanyRole, requireAuth } from "./companies.helpers.js";
import { CompaniesRepository } from "./companies.repository.js";
import { verifyCompanyWithProvider } from "./companyVerification.provider.js";
import type { AuthContext, UpdateMyCompanyBody } from "./companies.types.js";

const repo = new CompaniesRepository();

export class CompaniesService {
  async list(auth: AuthContext) {
    requireAuth(auth);
    assertCompanyRole(auth);
    const companyId = auth.companyId;

    if (!companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company users must belong to a company");
    }

    const company = await repo.findActiveById(companyId);

    if (!company) {
      throw new AppError(404, "COMPANY_NOT_FOUND", "Company not found");
    }

    return [company];
  }

  async getMine(auth: AuthContext) {
    requireAuth(auth);
    assertCompanyRole(auth);
    const companyId = auth.companyId;

    if (!companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company users must belong to a company");
    }

    const company = await repo.findAnyById(companyId);

    if (!company) {
      throw new AppError(404, "COMPANY_NOT_FOUND", "Company not found");
    }

    return company;
  }

  async getById(auth: AuthContext, companyId: string) {
    requireAuth(auth);
    assertCompanyRole(auth);

    if (companyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only access your own company");
    }

    const company = await repo.findActiveById(companyId);

    if (!company) {
      throw new AppError(404, "COMPANY_NOT_FOUND", "Company not found");
    }

    return company;
  }

  async updateMine(auth: AuthContext, body: UpdateMyCompanyBody) {
    requireAuth(auth);
    assertCompanyAdmin(auth);
    const companyId = auth.companyId;

    if (!companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
    }

    try {
      const identityChanged =
        body.name !== undefined ||
        body.countryCode !== undefined ||
        body.city !== undefined ||
        body.registrationNumber !== undefined ||
        body.vatNumber !== undefined;

      return await repo.update(companyId, {
        companyType: body.companyType,
        name: body.name,
        countryCode: body.countryCode?.toUpperCase(),
        city: body.city,
        address: body.address,
        phone: body.phone,
        email: body.email,
        website: body.website,
        logoUrl: body.logoUrl,
        bannerUrl: body.bannerUrl,
        bio: body.bio,
        foundedAt: body.foundedAt,
        employeeCount: body.employeeCount,
        isVerified: identityChanged ? false : body.isVerified,
        verificationStatus: identityChanged ? "UNVERIFIED" : undefined,
        verificationProvider: identityChanged ? null : undefined,
        verificationCheckedAt: identityChanged ? null : undefined,
        verificationFailureReason: identityChanged ? null : undefined,
        verificationDetails: identityChanged ? Prisma.JsonNull : undefined,
        registrationNumber: body.registrationNumber,
        vatNumber: body.vatNumber,
        stripeCustomerId: body.stripeCustomerId,
      });
    } catch (error) {
      if (repo.isUniqueConstraintError(error)) {
        throw new AppError(409, "COMPANY_FIELD_ALREADY_USED", "A unique company field is already used");
      }

      throw error;
    }
  }

  async requestVerification(auth: AuthContext) {
    requireAuth(auth);
    assertCompanyAdmin(auth);
    const companyId = auth.companyId;

    if (!companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
    }

    const company = await repo.findActiveById(companyId);
    if (!company) {
      throw new AppError(404, "COMPANY_NOT_FOUND", "Company not found");
    }

    const pending = await repo.markVerificationPending(companyId);
    const queued = await enqueueCompanyVerification({ companyId });

    if (queued) {
      return pending;
    }

    return this.processVerificationJob(companyId);
  }

  async processVerificationJob(companyId: string) {
    const company = await repo.findVerificationTarget(companyId);

    if (!company) {
      throw new AppError(404, "COMPANY_NOT_FOUND", "Company not found");
    }

    const result = await verifyCompanyWithProvider(company);
    return repo.markVerificationResult(companyId, {
      details: result.details as Prisma.InputJsonValue,
      failureReason: result.failureReason,
      provider: result.provider,
      status: result.status,
    });
  }

  async removeMine(auth: AuthContext) {
    requireAuth(auth);
    assertCompanyAdmin(auth);
    const companyId = auth.companyId;

    if (!companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
    }

    const company = await repo.findActiveById(companyId);

    if (!company) {
      throw new AppError(404, "COMPANY_NOT_FOUND", "Company not found");
    }

    return repo.softDelete(companyId);
  }

  async restore(auth: AuthContext, companyId: string) {
    requireAuth(auth);
    assertCompanyAdmin(auth);
    const myCompanyId = auth.companyId;

    if (!myCompanyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
    }

    if (companyId !== myCompanyId) {
      throw new AppError(403, "FORBIDDEN", "You can only restore your own company");
    }

    const company = await repo.findAnyById(companyId);

    if (!company) {
      throw new AppError(404, "COMPANY_NOT_FOUND", "Company not found");
    }

    if (!company.deletedAt) {
      throw new AppError(400, "COMPANY_NOT_DELETED", "Company is already active");
    }

    return repo.restore(companyId);
  }
}



