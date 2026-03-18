import { PlansRepository } from "./plans.repository.js";

const repo = new PlansRepository();

export class PlansService {
  async listPublicPlans() {
    return repo.listActivePlans();
  }
}

