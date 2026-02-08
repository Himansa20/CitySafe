import type { Signal } from "../types/signal";
import type { SegmentDoc } from "./routes";
import { isNightTimeLocal, pointInExpandedBBox } from "../utils/geo";

const SAFETY_CATEGORIES = new Set(["safety", "transport", "public_space"]);

export type SegmentRisk = {
  segmentId: string;
  routeId: string;
  name?: string | null;
  polyline: { lat: number; lng: number }[];
  bbox: any;

  segmentRiskScore: number;
  signalCount: number;
  highRiskCount: number;
  topCategories: { category: string; count: number }[];

  nearbyTopSignals: Signal[]; // top 3 by priorityScore
};

export type RiskLevel = "high" | "medium" | "low";

export function getSegmentRiskLevel(score: number, highRiskCount: number): RiskLevel {
  if (score >= 40 || highRiskCount >= 3) return "high";
  if (score >= 15) return "medium";
  return "low";
}

export function computeSegmentRisk(params: {
  segments: SegmentDoc[];
  signals: Signal[];
  days: number; // 30
  bboxDelta: number; // e.g., 0.002
}) {
  const since = new Date(Date.now() - params.days * 24 * 60 * 60 * 1000);

  // Pre-filter signals: last N days + night + safety categories
  const relevant = params.signals.filter((s) => {
    const dt = s.eventTime?.toDate?.() ?? new Date(0);
    if (dt < since) return false;
    if (!SAFETY_CATEGORIES.has(s.category)) return false;
    if (!isNightTimeLocal(s.eventTime)) return false;
    return true;
  });

  const out: SegmentRisk[] = params.segments.map((seg) => {
    const matched = relevant.filter((s) =>
      pointInExpandedBBox({ lat: s.lat, lng: s.lng }, seg.bbox, params.bboxDelta)
    );

    const score = matched.reduce((sum, s) => sum + Number(s.priorityScore ?? 0), 0);
    const highCount = matched.filter((s) => Number(s.priorityScore ?? 0) >= 10).length;

    const catMap = new Map<string, number>();
    for (const s of matched) catMap.set(s.category, (catMap.get(s.category) ?? 0) + 1);
    const topCategories = Array.from(catMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const nearbyTopSignals = [...matched]
      .sort((a, b) => Number(b.priorityScore ?? 0) - Number(a.priorityScore ?? 0))
      .slice(0, 3);

    return {
      segmentId: seg.id,
      routeId: seg.routeId,
      name: seg.name ?? null,
      polyline: seg.polyline,
      bbox: seg.bbox,
      segmentRiskScore: Math.round(score * 10) / 10,
      signalCount: matched.length,
      highRiskCount: highCount,
      topCategories,
      nearbyTopSignals,
    };
  });

  out.sort((a, b) => b.segmentRiskScore - a.segmentRiskScore);
  return out;
}

export function getRouteTotalRisk(segmentRisks: SegmentRisk[], routeId: string): number {
  return segmentRisks
    .filter((s) => s.routeId === routeId)
    .reduce((sum, s) => sum + Number(s.segmentRiskScore ?? 0), 0);
}
