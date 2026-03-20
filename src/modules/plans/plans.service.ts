import { PlansRepository } from "./plans.repository.js";

const repo = new PlansRepository();

export class PlansService {
  async listPublicPlans(activeOnly = true) {
    return repo.listPlans(activeOnly);
  }
}

