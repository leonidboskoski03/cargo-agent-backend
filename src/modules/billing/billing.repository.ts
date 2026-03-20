import { prisma } from "../../shared/prisma/prismaClient.js";

export class BillingRepository {
  async listCompanyEvents(companyId: string, page: number, pageSize: number) {
    return prisma.billingEvent.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }
}

