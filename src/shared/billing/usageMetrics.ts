export type UsageMetric =
  | "ACTIVE_POSTS"
  | "BIDS_PER_MONTH"
  | "TEAM_MEMBERS"
  | "PROMOTED_POSTS_PER_MONTH";

export function getCurrentMonthPeriodStartUtc(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}
