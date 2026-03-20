import { BidStatus, ContractStatus, PostStatus, type UserRole } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../shared/errors/AppError.js";
import { Roles } from "../../shared/auth/permissions.js";
import { writeAuditEvent } from "../../shared/audit/auditLogger.js";
import { enqueueNotificationEvent } from "../../shared/queue/notificationEvents.queue.js";
import { ContractsRepository } from "./contracts.repository.js";
import {
  changeContractStatusSchema,
  createContractSchema,
  listContractsSchema,
} from "./contracts.validator.js";

type AuthContext = {
  userId?: string;
  role?: UserRole;
  companyId?: string;
};

type RequiredAuthContext = {
  userId: string;
  role: UserRole;
  companyId?: string;
};

type ListContractsQuery = z.infer<typeof listContractsSchema>["query"];
type CreateContractBody = z.infer<typeof createContractSchema>["body"];
type ChangeContractStatusBody = z.infer<typeof changeContractStatusSchema>["body"];

const repo = new ContractsRepository();

const allowedTransitions: Record<ContractStatus, ContractStatus[]> = {
  CONFIRMED: [ContractStatus.IN_PROGRESS, ContractStatus.CANCELLED, ContractStatus.DISPUTED],
  IN_PROGRESS: [ContractStatus.COMPLETED, ContractStatus.CANCELLED, ContractStatus.DISPUTED],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: [],
};

function requireAuth(auth: AuthContext): asserts auth is RequiredAuthContext {
  if (!auth.userId || !auth.role) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

function assertCompanyUser(auth: RequiredAuthContext) {
  if (auth.role !== Roles.COMPANY_ADMIN && auth.role !== Roles.COMPANY_DRIVER) {
    throw new AppError(403, "FORBIDDEN", "Only company users can access contracts");
  }

  if (!auth.companyId) {
    throw new AppError(403, "COMPANY_REQUIRED", "Company users must belong to a company");
  }
}

function assertCompanyAdmin(auth: RequiredAuthContext) {
  if (auth.role !== Roles.COMPANY_ADMIN) {
    throw new AppError(403, "FORBIDDEN", "Only company admins can perform this action");
  }

  if (!auth.companyId) {
    throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
  }
}

export class ContractsService {
  async list(auth: AuthContext, query: ListContractsQuery) {
    requireAuth(auth);
    assertCompanyUser(auth);
    const companyId = auth.companyId;

    if (!companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company users must belong to a company");
    }

    return repo.listByCompanyInvolvement({
      companyId,
      status: query.status,
    });
  }

  async getById(auth: AuthContext, contractId: string) {
    requireAuth(auth);
    assertCompanyUser(auth);

    const contract = await repo.findActiveById(contractId);
    if (!contract) {
      throw new AppError(404, "CONTRACT_NOT_FOUND", "Contract not found");
    }

    if (contract.shipperCompanyId !== auth.companyId && contract.carrierCompanyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only access contracts in your company context");
    }

    return contract;
  }

  async create(auth: AuthContext, body: CreateContractBody) {
    requireAuth(auth);
    assertCompanyAdmin(auth);
    const companyId = auth.companyId;

    if (!companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
    }

    const post = await repo.findActivePostById(body.postId);
    if (!post) {
      throw new AppError(404, "POST_NOT_FOUND", "Post not found");
    }

    if (post.companyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "Only the shipper company can create a contract for this post");
    }

    if (post.status !== PostStatus.ASSIGNED) {
      throw new AppError(409, "POST_NOT_ASSIGNED", "Contract can be created only after the post is ASSIGNED");
    }

    const acceptedBid = await repo.findActiveBidById(body.acceptedBidId);
    if (!acceptedBid) {
      throw new AppError(404, "BID_NOT_FOUND", "Accepted bid not found");
    }

    if (acceptedBid.status !== BidStatus.ACCEPTED) {
      throw new AppError(409, "BID_NOT_ACCEPTED", "Only ACCEPTED bids can be used to create contracts");
    }

    if (acceptedBid.postId !== post.id || acceptedBid.postId !== body.postId) {
      throw new AppError(400, "BID_POST_MISMATCH", "Accepted bid does not belong to this post");
    }

    if (!acceptedBid.offeredPriceAmount) {
      throw new AppError(400, "INVALID_BID_PRICE", "Accepted bid must include offeredPriceAmount");
    }

    try {
      const created = await repo.create({
        postId: post.id,
        acceptedBidId: acceptedBid.id,
        routeId: post.routeId,
        shipperCompanyId: post.companyId,
        carrierCompanyId: acceptedBid.carrierCompanyId,
        agreedPriceAmount: acceptedBid.offeredPriceAmount,
        currency: acceptedBid.currency,
        pickupPlannedAt: body.pickupPlannedAt,
        deliveryPlannedAt: body.deliveryPlannedAt,
      });

      await writeAuditEvent({
        companyId,
        actorUserId: auth.userId,
        action: "CONTRACT_CREATED",
        entityType: "Contract",
        entityId: created.id,
        payloadJson: {
          postId: post.id,
          acceptedBidId: acceptedBid.id,
        },
      });
      await enqueueNotificationEvent({
        type: "CONTRACT_CREATED",
        contractId: created.id,
      });

      return created;
    } catch (error) {
      if (repo.isUniqueConstraintError(error)) {
        throw new AppError(409, "CONTRACT_ALREADY_EXISTS", "A contract already exists for this post or accepted bid");
      }

      throw error;
    }
  }

  async changeStatus(auth: AuthContext, contractId: string, body: ChangeContractStatusBody) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    const contract = await repo.findActiveById(contractId);
    if (!contract) {
      throw new AppError(404, "CONTRACT_NOT_FOUND", "Contract not found");
    }

    if (contract.shipperCompanyId !== auth.companyId && contract.carrierCompanyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only update contracts in your company context");
    }

    if (contract.status === body.status) {
      return contract;
    }

    const allowed = allowedTransitions[contract.status] ?? [];
    if (!allowed.includes(body.status)) {
      throw new AppError(
        409,
        "INVALID_CONTRACT_STATUS_TRANSITION",
        `Cannot change contract status from ${contract.status} to ${body.status}`,
      );
    }

    return repo.updateStatus(contractId, body.status);
  }

  async remove(auth: AuthContext, contractId: string) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    const contract = await repo.findActiveById(contractId);
    if (!contract) {
      throw new AppError(404, "CONTRACT_NOT_FOUND", "Contract not found");
    }

    if (contract.shipperCompanyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "Only the shipper company can delete this contract");
    }

    return repo.softDelete(contractId);
  }

  async restore(auth: AuthContext, contractId: string) {
    requireAuth(auth);
    assertCompanyAdmin(auth);

    const contract = await repo.findAnyById(contractId);
    if (!contract) {
      throw new AppError(404, "CONTRACT_NOT_FOUND", "Contract not found");
    }

    if (contract.shipperCompanyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "Only the shipper company can restore this contract");
    }

    if (!contract.deletedAt) {
      throw new AppError(400, "CONTRACT_NOT_DELETED", "Contract is already active");
    }

    return repo.restore(contractId);
  }
}


