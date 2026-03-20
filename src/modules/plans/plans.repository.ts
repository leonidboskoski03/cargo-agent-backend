import { prisma } from "../../shared/prisma/prismaClient.js";

export class PlansRepository {
  async listPlans(activeOnly = true) {
    return prisma.plan.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ priceAmount: "asc" }, { createdAt: "asc" }],
    });
  }
}

