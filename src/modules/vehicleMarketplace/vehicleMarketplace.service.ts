import {
  JobSeekerUsageMetric,
  Prisma,
  UsageMetric,
  VehicleMarketplaceInquiryStatus,
  VehicleMarketplaceListingStatus,
  VehicleMarketplaceSourceType,
} from "@prisma/client";
import { AppError } from "../../shared/errors/AppError.js";
import { Roles } from "../../shared/auth/permissions.js";
import { enqueueNotificationEvent } from "../../shared/queue/notificationEvents.queue.js";
import { companyCreditsConfig } from "../../config/companyCredits.js";
import { jobSeekerBillingConfig } from "../../config/jobSeekerBilling.js";
import { useCompanyMonthlyQuotaOrCredits, useJobSeekerMonthlyQuotaOrCredits } from "../../shared/credits/marketplaceCredits.js";
import {
  assertCanBrowseMarketplace,
  assertCanMutateListing,
  assertCanOwnListing,
  canOwnListing,
  requireAuth,
} from "./vehicleMarketplace.helpers.js";
import { VehicleMarketplaceRepository, type InquiryFilters, type ListingFilters } from "./vehicleMarketplace.repository.js";
import type {
  AuthContext,
  CreateListingBody,
  CreateListingInquiryBody,
  ListInquiriesQuery,
  ListListingsQuery,
  UpdateInquiryBody,
  UpdateListingBody,
} from "./vehicleMarketplace.types.js";

const repo = new VehicleMarketplaceRepository();

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function toOptionalBoolean(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

function toOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeListingFilters(query: ListListingsQuery): ListingFilters {
  return {
    bodyType: toOptionalString(query.bodyType),
    brand: toOptionalString(query.brand),
    capacityMax: toOptionalNumber(query.capacityMax),
    capacityMin: toOptionalNumber(query.capacityMin),
    city: toOptionalString(query.city),
    countryCode: toOptionalString(query.countryCode)?.toUpperCase(),
    currency: toOptionalString(query.currency)?.toUpperCase(),
    hazmatCertified: toOptionalBoolean(query.hazmatCertified),
    includeDeleted: toOptionalBoolean((query as { includeDeleted?: unknown }).includeDeleted),
    intent: toOptionalString(query.intent),
    model: toOptionalString(query.model),
    page: Math.max(toOptionalNumber(query.page) ?? 1, 1),
    pageSize: Math.min(Math.max(toOptionalNumber(query.pageSize) ?? 25, 1), 100),
    priceMax: toOptionalNumber(query.priceMax),
    priceMin: toOptionalNumber(query.priceMin),
    q: toOptionalString(query.q),
    refrigerated: toOptionalBoolean(query.refrigerated),
    sourceType: toOptionalString(query.sourceType),
    status: toOptionalString(query.status),
    vehicleType: toOptionalString(query.vehicleType),
    yearMax: toOptionalNumber(query.yearMax),
    yearMin: toOptionalNumber(query.yearMin),
  };
}

function normalizeInquiryFilters(query: ListInquiriesQuery): InquiryFilters {
  return {
    page: Math.max(toOptionalNumber(query.page) ?? 1, 1),
    pageSize: Math.min(Math.max(toOptionalNumber(query.pageSize) ?? 25, 1), 100),
    status: query.status,
  };
}

function emptyPage(filters: ListingFilters) {
  return {
    items: [],
    meta: { page: filters.page, pageSize: filters.pageSize, total: 0 },
  };
}

function jsonOrUndefined(value: unknown) {
  return value === null || value === undefined ? undefined : (value as never);
}

async function billVehicleListingPublish(input: {
  listingId: string;
  ownerCompanyId?: string | null;
  ownerUserId?: string | null;
}) {
  if (input.ownerCompanyId) {
    return useCompanyMonthlyQuotaOrCredits({
      companyId: input.ownerCompanyId,
      creditCost: companyCreditsConfig.vehicleListingCreditCost,
      limit: companyCreditsConfig.freeVehicleListingsPerMonth,
      metric: UsageMetric.COMPANY_VEHICLE_LISTINGS_PER_MONTH,
      reasonCode: "COMPANY_VEHICLE_LISTING_PUBLISH",
      referenceId: input.listingId,
      referenceType: "VEHICLE_MARKETPLACE_LISTING",
    });
  }

  if (input.ownerUserId) {
    return useJobSeekerMonthlyQuotaOrCredits({
      creditCost: jobSeekerBillingConfig.vehicleListingCreditCost,
      limit: jobSeekerBillingConfig.freeVehicleListingsPerMonth,
      metric: JobSeekerUsageMetric.VEHICLE_LISTINGS_PER_MONTH,
      reasonCode: "JOB_SEEKER_VEHICLE_LISTING_PUBLISH",
      referenceId: input.listingId,
      referenceType: "VEHICLE_MARKETPLACE_LISTING",
      userId: input.ownerUserId,
    });
  }

  return null;
}

export class VehicleMarketplaceService {
  async list(auth: AuthContext, query: ListListingsQuery) {
    const requiredAuth = requireAuth(auth);
    assertCanBrowseMarketplace(requiredAuth.role);

    const filters = normalizeListingFilters(query);
    if (filters.status && filters.status !== VehicleMarketplaceListingStatus.PUBLISHED) {
      return emptyPage(filters);
    }

    const result = await repo.listPublished(filters);
    return {
      items: result.items,
      meta: { page: filters.page, pageSize: filters.pageSize, total: result.total },
    };
  }

  async listMine(auth: AuthContext, query: ListListingsQuery) {
    const requiredAuth = requireAuth(auth);
    assertCanMutateListing(requiredAuth);

    const filters = normalizeListingFilters(query);
    const owner =
      requiredAuth.role === Roles.COMPANY_ADMIN
        ? { ownerCompanyId: requiredAuth.companyId }
        : { ownerUserId: requiredAuth.userId };
    const result = await repo.listMine(filters, owner);

    return {
      items: result.items,
      meta: { page: filters.page, pageSize: filters.pageSize, total: result.total },
    };
  }

  async getById(auth: AuthContext, listingId: string) {
    const requiredAuth = requireAuth(auth);
    assertCanBrowseMarketplace(requiredAuth.role);

    const listing = await repo.findActiveById(listingId);
    if (!listing) {
      throw new AppError(404, "VEHICLE_MARKETPLACE_LISTING_NOT_FOUND", "Vehicle marketplace listing not found");
    }

    if (listing.status !== VehicleMarketplaceListingStatus.PUBLISHED && !canOwnListing(requiredAuth, listing)) {
      throw new AppError(404, "VEHICLE_MARKETPLACE_LISTING_NOT_FOUND", "Vehicle marketplace listing not found");
    }

    return listing;
  }

  async create(auth: AuthContext, body: CreateListingBody) {
    const requiredAuth = requireAuth(auth);
    assertCanMutateListing(requiredAuth);

    const ownership =
      requiredAuth.role === Roles.COMPANY_ADMIN
        ? { ownerCompanyId: requiredAuth.companyId, ownerUserId: null }
        : { ownerCompanyId: null, ownerUserId: requiredAuth.userId };

    let sourceVehicle:
      | Awaited<ReturnType<VehicleMarketplaceRepository["findVehicleForSource"]>>
      | null = null;

    if (body.sourceType === VehicleMarketplaceSourceType.FLEET_VEHICLE) {
      sourceVehicle = await repo.findVehicleForSource(body.vehicleId as string);
      if (!sourceVehicle) {
        throw new AppError(404, "VEHICLE_NOT_FOUND", "Source vehicle not found");
      }

      const ownsVehicle =
        requiredAuth.role === Roles.COMPANY_ADMIN
          ? sourceVehicle.companyId === requiredAuth.companyId
          : sourceVehicle.userId === requiredAuth.userId;

      if (!ownsVehicle) {
        throw new AppError(403, "FORBIDDEN", "You can only list vehicles you own");
      }
    }

    const listing = await repo.create({
      ...ownership,
      title: body.title,
      description: body.description,
      intent: body.intent,
      sourceType: body.sourceType,
      status: body.status ?? VehicleMarketplaceListingStatus.DRAFT,
      vehicleId: body.vehicleId ?? null,
      vehicleType: sourceVehicle?.vehicleType ?? body.vehicleType,
      bodyType: body.bodyType ?? sourceVehicle?.bodyType ?? null,
      brand: body.brand ?? sourceVehicle?.brand ?? null,
      model: body.model ?? sourceVehicle?.model ?? null,
      year: body.year ?? sourceVehicle?.year ?? null,
      countryCode: body.countryCode.toUpperCase(),
      city: body.city,
      priceAmount: body.priceAmount,
      currency: body.currency?.toUpperCase() ?? null,
      capacityKg: body.capacityKg ?? sourceVehicle?.capacityKg ?? null,
      volumeM3: body.volumeM3 ?? sourceVehicle?.volumeM3 ?? null,
      refrigerated: body.refrigerated ?? sourceVehicle?.refrigerated ?? false,
      hazmatCertified: body.hazmatCertified ?? sourceVehicle?.hazmatCertified ?? false,
      imageUrlsJson: jsonOrUndefined(body.imageUrlsJson ?? (sourceVehicle?.imageUrl ? [sourceVehicle.imageUrl] : undefined)),
      documentsJson: jsonOrUndefined(body.documentsJson ?? sourceVehicle?.documentsJson),
    });

    if (listing.status !== VehicleMarketplaceListingStatus.PUBLISHED) {
      return listing;
    }

    const billing = await billVehicleListingPublish({
      listingId: listing.id,
      ownerCompanyId: listing.ownerCompanyId,
      ownerUserId: listing.ownerUserId,
    });

    return { ...listing, billing };
  }

  async update(auth: AuthContext, listingId: string, body: UpdateListingBody) {
    const requiredAuth = requireAuth(auth);
    assertCanMutateListing(requiredAuth);

    const listing = await repo.findActiveById(listingId);
    if (!listing) {
      throw new AppError(404, "VEHICLE_MARKETPLACE_LISTING_NOT_FOUND", "Vehicle marketplace listing not found");
    }

    assertCanOwnListing(requiredAuth, listing);

    const wasPublished = listing.status === VehicleMarketplaceListingStatus.PUBLISHED;
    const updated = await repo.update(listingId, {
      title: body.title,
      description: body.description,
      intent: body.intent,
      status: body.status,
      vehicleType: body.vehicleType,
      bodyType: body.bodyType,
      brand: body.brand,
      model: body.model,
      year: body.year,
      countryCode: body.countryCode?.toUpperCase(),
      city: body.city,
      priceAmount: body.priceAmount,
      currency: body.currency?.toUpperCase() ?? body.currency,
      capacityKg: body.capacityKg,
      volumeM3: body.volumeM3,
      refrigerated: body.refrigerated,
      hazmatCertified: body.hazmatCertified,
      imageUrlsJson: body.imageUrlsJson === null ? Prisma.JsonNull : body.imageUrlsJson,
      documentsJson: body.documentsJson === null ? Prisma.JsonNull : body.documentsJson,
    });

    if (wasPublished || updated.status !== VehicleMarketplaceListingStatus.PUBLISHED) {
      return updated;
    }

    const billing = await billVehicleListingPublish({
      listingId: updated.id,
      ownerCompanyId: updated.ownerCompanyId,
      ownerUserId: updated.ownerUserId,
    });

    return { ...updated, billing };
  }

  async remove(auth: AuthContext, listingId: string) {
    const requiredAuth = requireAuth(auth);
    assertCanMutateListing(requiredAuth);

    const listing = await repo.findActiveById(listingId);
    if (!listing) {
      throw new AppError(404, "VEHICLE_MARKETPLACE_LISTING_NOT_FOUND", "Vehicle marketplace listing not found");
    }

    assertCanOwnListing(requiredAuth, listing);
    return repo.softDelete(listingId);
  }

  async restore(auth: AuthContext, listingId: string) {
    const requiredAuth = requireAuth(auth);
    assertCanMutateListing(requiredAuth);

    const listing = await repo.findAnyById(listingId);
    if (!listing) {
      throw new AppError(404, "VEHICLE_MARKETPLACE_LISTING_NOT_FOUND", "Vehicle marketplace listing not found");
    }

    assertCanOwnListing(requiredAuth, listing);

    if (!listing.deletedAt) {
      throw new AppError(400, "VEHICLE_MARKETPLACE_LISTING_NOT_DELETED", "Vehicle marketplace listing is already active");
    }

    return repo.restore(listingId);
  }

  async createInquiry(auth: AuthContext, listingId: string, body: CreateListingInquiryBody) {
    const requiredAuth = requireAuth(auth);

    if (requiredAuth.role !== Roles.COMPANY_ADMIN && requiredAuth.role !== Roles.JOB_SEEKER) {
      throw new AppError(403, "FORBIDDEN", "Role is not allowed to create vehicle marketplace inquiries");
    }

    if (requiredAuth.role === Roles.COMPANY_ADMIN && !requiredAuth.companyId) {
      throw new AppError(403, "COMPANY_REQUIRED", "Company admins must belong to a company");
    }

    const listing = await repo.findActiveById(listingId);
    if (!listing || listing.status !== VehicleMarketplaceListingStatus.PUBLISHED) {
      throw new AppError(404, "VEHICLE_MARKETPLACE_LISTING_NOT_FOUND", "Vehicle marketplace listing not found");
    }

    if (canOwnListing(requiredAuth, listing)) {
      throw new AppError(400, "CANNOT_INQUIRE_OWN_LISTING", "You cannot create an inquiry for your own listing");
    }

    const inquiry = await repo.createInquiry({
      listingId,
      senderUserId: requiredAuth.userId,
      senderCompanyId: requiredAuth.role === Roles.COMPANY_ADMIN ? requiredAuth.companyId : null,
      message: body.message,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
    });

    await enqueueNotificationEvent({
      type: "VEHICLE_MARKETPLACE_INQUIRY_CREATED",
      inquiryId: inquiry.id,
    });

    return inquiry;
  }

  async listInquiries(auth: AuthContext, query: ListInquiriesQuery) {
    const requiredAuth = requireAuth(auth);
    assertCanBrowseMarketplace(requiredAuth.role);

    const filters = normalizeInquiryFilters(query);
    const result = await repo.listInquiries(filters, {
      userId: requiredAuth.userId,
      companyId: requiredAuth.companyId,
    });

    return {
      items: result.items,
      meta: { page: filters.page, pageSize: filters.pageSize, total: result.total },
    };
  }

  async updateInquiry(auth: AuthContext, inquiryId: string, body: UpdateInquiryBody) {
    const requiredAuth = requireAuth(auth);
    const inquiry = await repo.findInquiryById(inquiryId);

    if (!inquiry) {
      throw new AppError(404, "VEHICLE_MARKETPLACE_INQUIRY_NOT_FOUND", "Vehicle marketplace inquiry not found");
    }

    const ownsListing = canOwnListing(requiredAuth, inquiry.listing);
    const sentInquiry = inquiry.senderUserId === requiredAuth.userId || (requiredAuth.companyId && inquiry.senderCompanyId === requiredAuth.companyId);

    if (!ownsListing && !sentInquiry) {
      throw new AppError(403, "FORBIDDEN", "You can only update inquiries you own or received");
    }

    if (!ownsListing && body.status !== VehicleMarketplaceInquiryStatus.CLOSED) {
      throw new AppError(403, "FORBIDDEN", "Only listing owners can mark inquiries as responded");
    }

    const updated = await repo.updateInquiry(inquiryId, body.status);

    if (ownsListing && body.status === VehicleMarketplaceInquiryStatus.RESPONDED) {
      await enqueueNotificationEvent({
        type: "VEHICLE_MARKETPLACE_INQUIRY_RESPONDED",
        inquiryId,
      });
    }

    return updated;
  }
}
