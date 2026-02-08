import type { Timestamp } from "firebase/firestore";

export type FocusCategory = "waste" | "transport";

export type AffectedGroup = "women" | "children" | "elderly" | "disabled" | "low_income";

export type SignalStatus = "new" | "acknowledged" | "in_progress" | "resolved";

/**
 * Minimal, explainable inputs for a waste+transport “AI Insight Panel”.
 * Everything here is derived from existing Firestore data (signals + actionLogs + helpRequests).
 */
export interface AreaSummary {
  // Scope
  areaId: string;                 // from your existing area bucketing (e.g., areaIdFromLatLng)
  timeWindowDays: number;         // UI-selected (e.g., 7, 30)
  startTime: Date;                // now - timeWindowDays
  endTime: Date;                  // now

  // Overall activity (all categories, for context)
  totalSignals: number;           // count of signals in area within window
  totalConfirmations: number;     // sum(signals.confirmationsCount)
  avgSeverity: number;            // avg(signals.severity)
  avgPriorityScore: number;       // avg(signals.priorityScore)
  statusCounts: Record<SignalStatus, number>; // count by status

  // Focused activity (waste + transport only)
  focusCounts: Record<FocusCategory, number>; // count of waste/transport signals
  focusConfirmations: Record<FocusCategory, number>; // sum confirmations for waste/transport
  focusAvgSeverity: Record<FocusCategory, number>;   // avg severity for waste/transport
  focusAvgPriority: Record<FocusCategory, number>;   // avg priorityScore for waste/transport

  // Who is affected (from signals.affectedGroups)
  affectedGroupCounts: Record<AffectedGroup, number>; // occurrences across signals (not unique people)
  affectedGroupShare: Record<AffectedGroup, number>;  // normalized share 0..1 of above (for explainable ranking)
  topAffectedGroups: AffectedGroup[];                 // top 2–3 by share

  // Top “evidence” signals for explainability (links)
  topSignals: Array<{
    id: string;                 // signal doc id
    category: string;           // signals.category
    status: SignalStatus;       // signals.status
    priorityScore: number;      // signals.priorityScore
    severity: number;           // signals.severity
    confirmationsCount: number; // signals.confirmationsCount
    affectedGroups: AffectedGroup[];
    descriptionSnippet: string; // first ~80 chars of signals.description
    lat: number;
    lng: number;
    eventTime: Date;            // signals.eventTime (or createdAt)
  }>; // keep to 3–5

  // “What’s being done” signals (transparency)
  actionLogCounts: {
    totalLogsInArea: number;     // actionLogs linked to signals in this area/time window
    logsByType: Record<string, number>; // actionLogs.actionType count (e.g., cleanup, repair, other)
    mostRecentLogAt?: Date;      // max(actionLogs.createdAt)
  };

  helpRequestCounts: {
    open: number;               // helpRequests.status == "open" near area (or linked to signals in area)
    closed: number;             // status == "closed"
    byType: Record<string, number>; // helpRequests.type count
    mostRecentHelpAt?: Date;    // max(helpRequests.createdAt)
  };

  // Minimal trends (no heavy time-series)
  // Compare last half vs first half of the window for waste/transport counts.
  trend: {
    wasteDeltaPct?: number;      // % change (cautious; undefined if not enough data)
    transportDeltaPct?: number;
    note: string;                // short explanation of how trend was computed (for honesty)
  };

  // Explainable derived hints (not “AI”, just computed facts)
  derived: {
    primaryFocus: FocusCategory | "mixed"; // which category dominates by priorityScore sum
    confidence: "low" | "medium";          // based on sample size (never “high”)
    limitations: string[];                 // e.g., “local time for night may vary”, “reports are user-generated”
  };
}
