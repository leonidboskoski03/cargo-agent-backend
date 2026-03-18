import { AppError } from "../../shared/errors/AppError.js";
import { BillingRepository } from "./billing.repository.js";

const repo = new BillingRepository();

export class BillingService {
  async listEvents(companyId?: string) {
    if (!companyId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    return repo.listCompanyEvents(companyId);
  }
}

