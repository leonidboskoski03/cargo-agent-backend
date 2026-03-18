import type { UsageMetric } from "./usageMetrics.js";

export class UsageService {
  async getUsage(_companyId: string, _metric: UsageMetric) {
    return { used: 0, limit: null as number | null };
  }

  async assertCanUse(_companyId: string, _metric: UsageMetric) {
    return { allowed: true };
  }
}

