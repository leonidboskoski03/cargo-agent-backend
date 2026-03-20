import { AppError } from "../../shared/errors/AppError.js";
import { BillingRepository } from "./billing.repository.js";

const repo = new BillingRepository();

export class BillingService {
  async listEvents(companyId: string | undefined, query: { page: number; pageSize: number }) {
    if (!companyId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    return repo.listCompanyEvents(companyId, query.page, query.pageSize);
  }
}

