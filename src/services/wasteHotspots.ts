import type { Signal } from "../types/signal";
import type {
    CollectionZone,
    RecurrenceType,
    WasteHotspot,
    WasteSchedule,
} from "../types/wasteSchedule";
import { isPointInPolygon } from "./collectionZones";

// ─────────────────────────────────────────────────────────────
// Hotspot Analysis Algorithm
// ─────────────────────────────────────────────────────────────

/**
 * Demand Score Formula:
 * demandScore = (wasteSignalCount * 2) 
 *             + (totalPriorityScore * 1.5) 
 *             + (unresolvedCount * 3) 
 *             + (daysSinceCollection * 0.5)
 *             + (avgSeverity * 2)
 */
function calculateDemandScore(params: {
    wasteSignalCount: number;
    totalPriorityScore: number;
    unresolvedCount: number;
    daysSinceCollection: number;
    avgSeverity: number;
}): number {
    const score =
        params.wasteSignalCount * 2 +
        params.totalPriorityScore * 1.5 +
        params.unresolvedCount * 3 +
        params.daysSinceCollection * 0.5 +
        params.avgSeverity * 2;

    return Math.round(score * 10) / 10;
}

/**
 * Recommend collection frequency based on demand score
 */
function recommendFrequency(demandScore: number): RecurrenceType {
    if (demandScore >= 50) return "daily";
    if (demandScore >= 30) return "weekly";
    if (demandScore >= 15) return "biweekly";
    return "monthly";
}

/**
 * Get signals within a zone polygon
 */
function getSignalsInZone(signals: Signal[], zone: CollectionZone): Signal[] {
    return signals.filter((s) =>
        isPointInPolygon({ lat: s.lat, lng: s.lng }, zone.polygon)
    );
}

/**
 * Get the most recent completed collection for a zone
 */
function getLastCollectionDate(
    schedules: WasteSchedule[],
    zoneId: string
): Date | undefined {
    const completed = schedules
        .filter((s) => s.zoneId === zoneId && s.status === "completed")
        .sort((a, b) => {
            const dateA = a.scheduledDate?.toDate?.() ?? new Date(0);
            const dateB = b.scheduledDate?.toDate?.() ?? new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

    if (completed.length === 0) return undefined;
    return completed[0].scheduledDate?.toDate?.() ?? undefined;
}

/**
 * Calculate days since last collection
 */
function daysSince(date?: Date): number {
    if (!date) return 30; // Assume 30 days if never collected
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────────────────────────
// Main Functions
// ─────────────────────────────────────────────────────────────

/**
 * Compute waste hotspots for all zones
 */
export function computeWasteHotspots(params: {
    signals: Signal[];
    zones: CollectionZone[];
    schedules: WasteSchedule[];
    days?: number;
}): WasteHotspot[] {
    const { signals, zones, schedules, days = 30 } = params;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Filter to recent waste signals only
    const wasteSignals = signals.filter((s) => {
        if (s.category !== "waste") return false;
        const dt = s.eventTime?.toDate?.() ?? new Date(0);
        return dt >= since;
    });

    const hotspots: WasteHotspot[] = zones.map((zone) => {
        const zoneSignals = getSignalsInZone(wasteSignals, zone);
        const unresolvedSignals = zoneSignals.filter((s) => s.status !== "resolved");

        const totalPriorityScore = zoneSignals.reduce(
            (sum, s) => sum + Number(s.priorityScore ?? 0),
            0
        );

        const avgSeverity =
            zoneSignals.length > 0
                ? zoneSignals.reduce((sum, s) => sum + Number(s.severity ?? 0), 0) /
                zoneSignals.length
                : 0;

        const lastCollection = getLastCollectionDate(schedules, zone.id);
        const daysSinceCollection = daysSince(lastCollection);

        const demandScore = calculateDemandScore({
            wasteSignalCount: zoneSignals.length,
            totalPriorityScore,
            unresolvedCount: unresolvedSignals.length,
            daysSinceCollection,
            avgSeverity,
        });

        return {
            zoneId: zone.id,
            zoneName: zone.name,
            polygon: zone.polygon,
            centerLat: zone.centerLat,
            centerLng: zone.centerLng,
            wasteSignalCount: zoneSignals.length,
            totalPriorityScore: Math.round(totalPriorityScore * 10) / 10,
            avgSeverity: Math.round(avgSeverity * 10) / 10,
            unresolvedCount: unresolvedSignals.length,
            lastCollectionDate: lastCollection,
            daysSinceCollection,
            demandScore,
            recommendedFrequency: recommendFrequency(demandScore),
        };
    });

    // Sort by demand score descending
    return hotspots.sort((a, b) => b.demandScore - a.demandScore);
}

/**
 * Get recommended schedules based on hotspots
 */
export function getRecommendedSchedules(
    hotspots: WasteHotspot[],
    existingSchedules: WasteSchedule[]
): Array<{
    zoneId: string;
    zoneName: string;
    demandScore: number;
    recommendedFrequency: RecurrenceType;
    hasScheduled: boolean;
    urgency: "critical" | "high" | "medium" | "low";
}> {
    return hotspots
        .filter((h) => h.demandScore > 5) // Only recommend for zones with activity
        .map((h) => {
            const hasScheduled = existingSchedules.some(
                (s) =>
                    s.zoneId === h.zoneId &&
                    s.status === "scheduled" &&
                    s.scheduledDate?.toDate?.() > new Date()
            );

            let urgency: "critical" | "high" | "medium" | "low";
            if (h.demandScore >= 40) urgency = "critical";
            else if (h.demandScore >= 25) urgency = "high";
            else if (h.demandScore >= 12) urgency = "medium";
            else urgency = "low";

            return {
                zoneId: h.zoneId,
                zoneName: h.zoneName,
                demandScore: h.demandScore,
                recommendedFrequency: h.recommendedFrequency,
                hasScheduled,
                urgency,
            };
        })
        .sort((a, b) => {
            // Priority: no schedule first, then by demand score
            if (a.hasScheduled !== b.hasScheduled) {
                return a.hasScheduled ? 1 : -1;
            }
            return b.demandScore - a.demandScore;
        });
}

/**
 * Get analytics summary for admin dashboard
 */
export function getWasteAnalytics(params: {
    signals: Signal[];
    zones: CollectionZone[];
    schedules: WasteSchedule[];
    days?: number;
}): {
    totalWasteSignals: number;
    unresolvedCount: number;
    zonesWithHighDemand: number;
    scheduledCollections: number;
    completedCollections: number;
    coveragePercent: number;
    topHotspots: WasteHotspot[];
} {
    const { signals, schedules, days = 30 } = params;
    const hotspots = computeWasteHotspots(params);

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const wasteSignals = signals.filter((s) => {
        if (s.category !== "waste") return false;
        const dt = s.eventTime?.toDate?.() ?? new Date(0);
        return dt >= since;
    });

    const unresolvedCount = wasteSignals.filter((s) => s.status !== "resolved").length;
    const zonesWithHighDemand = hotspots.filter((h) => h.demandScore >= 25).length;

    const scheduledCollections = schedules.filter(
        (s) => s.status === "scheduled"
    ).length;
    const completedCollections = schedules.filter(
        (s) => s.status === "completed"
    ).length;

    // Coverage: % of high-demand zones with scheduled collections
    const highDemandZoneIds = new Set(
        hotspots.filter((h) => h.demandScore >= 15).map((h) => h.zoneId)
    );
    const scheduledZoneIds = new Set(
        schedules
            .filter(
                (s) =>
                    s.status === "scheduled" && s.scheduledDate?.toDate?.() > new Date()
            )
            .map((s) => s.zoneId)
    );

    const coveredZones = [...highDemandZoneIds].filter((id) =>
        scheduledZoneIds.has(id)
    ).length;
    const coveragePercent =
        highDemandZoneIds.size > 0
            ? Math.round((coveredZones / highDemandZoneIds.size) * 100)
            : 100;

    return {
        totalWasteSignals: wasteSignals.length,
        unresolvedCount,
        zonesWithHighDemand,
        scheduledCollections,
        completedCollections,
        coveragePercent,
        topHotspots: hotspots.slice(0, 5),
    };
}
