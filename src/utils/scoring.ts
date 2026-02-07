import type { AffectedGroup } from "../types/signal";

const GROUP_WEIGHTS: Record<AffectedGroup, number> = {
  women: 1.3,
  children: 1.5,
  elderly: 1.4,
  disabled: 1.6,
  low_income: 1.2,
};

export function computeVulnerabilityMultiplier(groups: AffectedGroup[]): number {
  if (!groups.length) return 1;

  // average(selectedGroupWeights - 1)
  const avgDelta =
    groups.reduce((sum, g) => sum + (GROUP_WEIGHTS[g] - 1), 0) / groups.length;

  return 1 + avgDelta;
}

// priorityScore = severity * max(1, confirmationsCount) * (1 + avg(selectedWeight - 1))
export function computePriorityScore(
  severity: number,
  confirmationsCount: number,
  groups: AffectedGroup[]
): number {
  const confirmationsFactor = Math.max(1, confirmationsCount);
  const vulnMultiplier = computeVulnerabilityMultiplier(groups);
  return severity * confirmationsFactor * vulnMultiplier;
}

export type PriorityBadge = "High" | "Medium" | "Low";

export function getPriorityBadge(score: number): PriorityBadge {
  if (score >= 10) return "High";
  if (score >= 6) return "Medium";
  return "Low";
}

export function formatScore(score: number): string {
  return (Math.round(score * 10) / 10).toFixed(1);
}
