import type { AreaSummary } from "../types/areaSummary";

export function buildInsightPrompt(summary: AreaSummary): string {
  // Keep the JSON small + stable (avoid huge arrays)
  const compact = {
    areaId: summary.areaId,
    timeWindowDays: summary.timeWindowDays,
    totalSignals: summary.totalSignals,
    statusCounts: summary.statusCounts,
    focusCounts: summary.focusCounts,
    focusConfirmations: summary.focusConfirmations,
    focusAvgSeverity: summary.focusAvgSeverity,
    focusAvgPriority: summary.focusAvgPriority,
    topAffectedGroups: summary.topAffectedGroups,
    affectedGroupShare: summary.affectedGroupShare,
    actionLogCounts: summary.actionLogCounts,
    helpRequestCounts: summary.helpRequestCounts,
    trend: summary.trend,
    topSignals: summary.topSignals.map((s) => ({
      id: s.id,
      category: s.category,
      status: s.status,
      priorityScore: s.priorityScore,
      severity: s.severity,
      confirmationsCount: s.confirmationsCount,
      affectedGroups: s.affectedGroups,
      descriptionSnippet: s.descriptionSnippet,
    })),
    derived: summary.derived,
  };

  return `
You are an advisory assistant for an SDG-11 civic platform. You must be cautious and factual.
Task: Given AREA_SUMMARY_JSON, produce an "AI Insight" in under 5 sentences.

Rules:
- Do NOT claim certainty or causation. Use phrases like "reports suggest", "may indicate".
- Focus ONLY on waste + transport patterns in this area/time window.
- Identify who is most affected using topAffectedGroups and affectedGroupShare.
- Recommend exactly ONE practical intervention that an NGO/admin could do next (specific, low-cost, feasible).
- Mention what is already being done using actionLogCounts and helpRequestCounts if present.
- End with a brief limitation clause (e.g., "based on reported signals").

Output format (exactly 4 sentences):
1) What is happening (waste/transport) + trend if available.
2) Who is most affected (top groups) + why (based on report shares).
3) One recommended intervention (one action only) + how it helps.
4) Transparency + limitation: mention existing actions/help if any, and say it's advisory.

AREA_SUMMARY_JSON:
${JSON.stringify(compact)}
`.trim();
}
