import {
  Prisma,
  VehicleMarketplaceInquiryStatus,
  VehicleMarketplaceListingStatus,
  VehicleMarketplaceSourceType,
} from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

export type ListingFilters = {
  bodyType?: string;
  brand?: string;
  capacityMax?: number;
  capacityMin?: number;
  city?: string;
  countryCode?: string;
  currency?: string;
  hazmatCertified?: boolean;
  includeDeleted?: boolean;
  intent?: string;
  model?: string;
  page: number;
  pageSize: number;
  priceMax?: number;
  priceMin?: number;
  q?: string;
  refrigerated?: boolean;
  sourceType?: string;
  status?: string;
  vehicleType?: string;
  yearMax?: number;
  yearMin?: number;
};

export type InquiryFilters = {
  page: number;
  pageSize: number;
  status?: VehicleMarketplaceInquiryStatus;
};

export type ListingCreateData = {
  bodyType?: string | null;
  brand?: string | null;
  capacityKg?: number | null;
  city: string;
  countryCode: string;
  currency?: string | null;
  description?: string | null;
  documentsJson?: Prisma.InputJsonValue;
  hazmatCertified?: boolean | null;
  imageUrlsJson?: Prisma.InputJsonValue;
  intent: string;
  model?: string | null;
  ownerCompanyId?: string | null;
  ownerUserId?: string | null;
  priceAmount?: string | number | Prisma.Decimal | null;
  refrigerated?: boolean | null;
  sourceType: string;
  status?: string;
  title: string;
  vehicleId?: string | null;
  vehicleType: string;
  volumeM3?: string | number | Prisma.Decimal | null;
  year?: number | null;
};

export type ListingUpdateData = Partial<Omit<ListingCreateData, "ownerCompanyId" | "ownerUserId" | "sourceType" | "vehicleId" | "documentsJson" | "imageUrlsJson">> & {
  documentsJson?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  imageUrlsJson?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
};

const listingSelect = {
  id: true,
  ownerCompanyId: true,
  ownerUserId: true,
  vehicleId: true,
  intent: true,
  sourceType: true,
  status: true,
  title: true,
  description: true,
  vehicleType: true,
  bodyType: true,
  brand: true,
  model: true,
  year: true,
  countryCode: true,
  city: true,
  priceAmount: true,
  currency: true,
  capacityKg: true,
  volumeM3: true,
  refrigerated: true,
  hazmatCertified: true,
  imageUrlsJson: true,
  documentsJson: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  ownerCompany: {
    select: { id: true, name: true, countryCode: true, city: true },
  },
  ownerUser: {
    select: { id: true, firstName: true, lastName: true, role: true },
  },
  vehicle: {
    select: {
      id: true,
      vehicleType: true,
      plateNumber: true,
      countryOfRegistration: true,
      brand: true,
      model: true,
      year: true,
      bodyType: true,
      capacityKg: true,
      volumeM3: true,
      refrigerated: true,
      hazmatCertified: true,
      imageUrl: true,
      documentsJson: true,
    },
  },
} as const;

const inquirySelect = {
  id: true,
  listingId: true,
  senderUserId: true,
  senderCompanyId: true,
  message: true,
  contactName: true,
  contactEmail: true,
  contactPhone: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  senderUser: {
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  },
  senderCompany: {
    select: { id: true, name: true },
  },
  listing: {
    select: {
      id: true,
      title: true,
      ownerCompanyId: true,
      ownerUserId: true,
      status: true,
      intent: true,
      vehicleType: true,
      city: true,
      countryCode: true,
    },
  },
} as const;

function listingWhere(filters: ListingFilters, forcePublished: boolean): Prisma.VehicleMarketplaceListingWhereInput {
  const where: Prisma.VehicleMarketplaceListingWhereInput = {
    ...(filters.includeDeleted ? {} : { deletedAt: null }),
    ...(forcePublished ? { status: VehicleMarketplaceListingStatus.PUBLISHED } : {}),
    ...(filters.intent ? { intent: filters.intent as never } : {}),
    ...(filters.sourceType ? { sourceType: filters.sourceType as never } : {}),
    ...(filters.vehicleType ? { vehicleType: filters.vehicleType as never } : {}),
    ...(filters.bodyType ? { bodyType: filters.bodyType as never } : {}),
    ...(filters.countryCode ? { countryCode: filters.countryCode.toUpperCase() } : {}),
    ...(filters.city ? { city: { contains: filters.city, mode: "insensitive" } } : {}),
    ...(filters.brand ? { brand: { contains: filters.brand, mode: "insensitive" } } : {}),
    ...(filters.model ? { model: { contains: filters.model, mode: "insensitive" } } : {}),
    ...(filters.currency ? { currency: filters.currency.toUpperCase() } : {}),
    ...(filters.refrigerated === undefined ? {} : { refrigerated: filters.refrigerated }),
    ...(filters.hazmatCertified === undefined ? {} : { hazmatCertified: filters.hazmatCertified }),
  };

  if (!forcePublished && filters.status) where.status = filters.status as never;
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
      { brand: { contains: filters.q, mode: "insensitive" } },
      { model: { contains: filters.q, mode: "insensitive" } },
      { city: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.yearMin !== undefined || filters.yearMax !== undefined) {
    where.year = {
      ...(filters.yearMin !== undefined ? { gte: filters.yearMin } : {}),
      ...(filters.yearMax !== undefined ? { lte: filters.yearMax } : {}),
    };
  }

  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    where.priceAmount = {
      ...(filters.priceMin !== undefined ? { gte: filters.priceMin } : {}),
      ...(filters.priceMax !== undefined ? { lte: filters.priceMax } : {}),
    };
  }

  if (filters.capacityMin !== undefined || filters.capacityMax !== undefined) {
    where.capacityKg = {
      ...(filters.capacityMin !== undefined ? { gte: filters.capacityMin } : {}),
      ...(filters.capacityMax !== undefined ? { lte: filters.capacityMax } : {}),
    };
  }

  return where;
}

export class VehicleMarketplaceRepository {
  async listPublished(filters: ListingFilters) {
    const where = listingWhere({ ...filters, includeDeleted: false }, true);
    const [items, total] = await prisma.$transaction([
      prisma.vehicleMarketplaceListing.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        select: listingSelect,
      }),
      prisma.vehicleMarketplaceListing.count({ where }),
    ]);

    return { items, total };
  }

  async listMine(filters: ListingFilters, owner: { ownerCompanyId?: string; ownerUserId?: string }) {
    const where = listingWhere(filters, false);
    if (owner.ownerCompanyId) where.ownerCompanyId = owner.ownerCompanyId;
    if (owner.ownerUserId) where.ownerUserId = owner.ownerUserId;

    const [items, total] = await prisma.$transaction([
      prisma.vehicleMarketplaceListing.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        select: listingSelect,
      }),
      prisma.vehicleMarketplaceListing.count({ where }),
    ]);

    return { items, total };
  }

  async findActiveById(listingId: string) {
    return prisma.vehicleMarketplaceListing.findFirst({
      where: { id: listingId, deletedAt: null },
      select: listingSelect,
    });
  }

  async findAnyById(listingId: string) {
    return prisma.vehicleMarketplaceListing.findUnique({
      where: { id: listingId },
      select: listingSelect,
    });
  }

  async findVehicleForSource(vehicleId: string) {
    return prisma.vehicle.findFirst({
      where: { id: vehicleId, deletedAt: null, isActive: true },
      select: {
        id: true,
        companyId: true,
        userId: true,
        vehicleType: true,
        brand: true,
        model: true,
        year: true,
        bodyType: true,
        capacityKg: true,
        volumeM3: true,
        refrigerated: true,
        hazmatCertified: true,
        imageUrl: true,
        documentsJson: true,
      },
    });
  }

  async create(data: ListingCreateData) {
    return prisma.vehicleMarketplaceListing.create({
      data: data as never,
      select: listingSelect,
    });
  }

  async update(listingId: string, data: ListingUpdateData) {
    return prisma.vehicleMarketplaceListing.update({
      where: { id: listingId },
      data: data as never,
      select: listingSelect,
    });
  }

  async softDelete(listingId: string) {
    return prisma.vehicleMarketplaceListing.update({
      where: { id: listingId },
      data: { deletedAt: new Date() },
      select: listingSelect,
    });
  }

  async restore(listingId: string) {
    return prisma.vehicleMarketplaceListing.update({
      where: { id: listingId },
      data: { deletedAt: null },
      select: listingSelect,
    });
  }

  async createInquiry(input: {
    contactEmail?: string;
    contactName?: string;
    contactPhone?: string;
    listingId: string;
    message: string;
    senderCompanyId?: string | null;
    senderUserId: string;
  }) {
    return prisma.vehicleMarketplaceInquiry.create({
      data: input,
      select: inquirySelect,
    });
  }

  async listInquiries(filters: InquiryFilters, auth: { companyId?: string; userId: string }) {
    const where: Prisma.VehicleMarketplaceInquiryWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      OR: [
        { senderUserId: auth.userId },
        ...(auth.companyId ? [{ senderCompanyId: auth.companyId }] : []),
        { listing: { ownerUserId: auth.userId } },
        ...(auth.companyId ? [{ listing: { ownerCompanyId: auth.companyId } }] : []),
      ],
    };

    const [items, total] = await prisma.$transaction([
      prisma.vehicleMarketplaceInquiry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        select: inquirySelect,
      }),
      prisma.vehicleMarketplaceInquiry.count({ where }),
    ]);

    return { items, total };
  }

  async findInquiryById(inquiryId: string) {
    return prisma.vehicleMarketplaceInquiry.findUnique({
      where: { id: inquiryId },
      select: inquirySelect,
    });
  }

  async updateInquiry(inquiryId: string, status: VehicleMarketplaceInquiryStatus) {
    return prisma.vehicleMarketplaceInquiry.update({
      where: { id: inquiryId },
      data: { status },
      select: inquirySelect,
    });
  }
}
