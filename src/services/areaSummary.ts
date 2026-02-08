import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { areaIdFromLatLng } from "../utils/area"; // you already have something similar for VPI
import type { AreaSummary, AffectedGroup, FocusCategory, SignalStatus } from "../types/areaSummary";
import type { Signal } from "../types/signal";

function clampSnippet(s: string, n = 80) {
  const t = (s ?? "").trim().replace(/\s+/g, " ");
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function pctDelta(oldVal: number, newVal: number) {
  if (oldVal <= 0) return undefined;
  return Math.round(((newVal - oldVal) / oldVal) * 1000) / 10; // one decimal
}

export async function buildAreaSummary(areaId: string, timeWindowDays: number): Promise<AreaSummary> {
  const endTime = new Date();
  const startTime = new Date(Date.now() - timeWindowDays * 24 * 60 * 60 * 1000);
  const startTs = Timestamp.fromDate(startTime);

  // 1) Signals base query (time window). Keep simple; Firestore likes this.
  const sigQ = query(
    collection(db, "signals"),
    where("eventTime", ">=", startTs),
    orderBy("eventTime", "desc"),
    limit(500)
  );

  const sigSnap = await getDocs(sigQ);
  const allSignals = sigSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Signal[];

  // 2) Client-side area filter (reuse same logic as VPI)
  const areaSignals = allSignals.filter((s) => areaIdFromLatLng(s.lat, s.lng) === areaId);

  // Basic aggregates
  const statusCounts: Record<SignalStatus, number> = {
    new: 0,
    acknowledged: 0,
    in_progress: 0,
    resolved: 0,
  };

  const focusCounts: Record<FocusCategory, number> = { waste: 0, transport: 0 };
  const focusConfirmations: Record<FocusCategory, number> = { waste: 0, transport: 0 };

  const focusSev: Record<FocusCategory, number[]> = { waste: [], transport: [] };
  const focusPri: Record<FocusCategory, number[]> = { waste: [], transport: [] };

  const affectedGroups: AffectedGroup[] = ["women", "children", "elderly", "disabled", "low_income"];
  const affectedGroupCounts: Record<AffectedGroup, number> = {
    women: 0, children: 0, elderly: 0, disabled: 0, low_income: 0,
  };

  const severities: number[] = [];
  const priorities: number[] = [];
  let totalConfirmations = 0;

  // Trend split
  const midTime = new Date(startTime.getTime() + (endTime.getTime() - startTime.getTime()) / 2);
  let wasteOld = 0, wasteNew = 0, transportOld = 0, transportNew = 0;

  for (const s of areaSignals) {
    const st = (s.status ?? "new") as SignalStatus;
    if (statusCounts[st] != null) statusCounts[st]++;

    const sev = Number(s.severity ?? 0);
    const pri = Number(s.priorityScore ?? 0);
    const conf = Number(s.confirmationsCount ?? 0);

    severities.push(sev);
    priorities.push(pri);
    totalConfirmations += conf;

    // affected groups
    for (const g of (s.affectedGroups ?? []) as AffectedGroup[]) {
      if (affectedGroupCounts[g] != null) affectedGroupCounts[g]++;
    }

    // focus (waste/transport)
    if (s.category === "waste" || s.category === "transport") {
      const c = s.category as FocusCategory;
      focusCounts[c]++;
      focusConfirmations[c] += conf;
      focusSev[c].push(sev);
      focusPri[c].push(pri);

      const dt = s.eventTime?.toDate?.() ?? new Date(0);
      const isNewHalf = dt >= midTime;
      if (c === "waste") isNewHalf ? wasteNew++ : wasteOld++;
      if (c === "transport") isNewHalf ? transportNew++ : transportOld++;
    }
  }

  const affectedTotal = Object.values(affectedGroupCounts).reduce((a, b) => a + b, 0);
  const affectedGroupShare = affectedGroups.reduce((acc, g) => {
    acc[g] = affectedTotal ? affectedGroupCounts[g] / affectedTotal : 0;
    return acc;
  }, {} as Record<AffectedGroup, number>);

  const topAffectedGroups = [...affectedGroups]
    .sort((a, b) => affectedGroupShare[b] - affectedGroupShare[a])
    .filter((g) => affectedGroupCounts[g] > 0)
    .slice(0, 3);

  // Top evidence signals (3–5)
  const topSignals = [...areaSignals]
    .sort((a, b) => Number(b.priorityScore ?? 0) - Number(a.priorityScore ?? 0))
    .slice(0, 5)
    .map((s) => ({
      id: s.id,
      category: s.category,
      status: (s.status ?? "new") as SignalStatus,
      priorityScore: Math.round(Number(s.priorityScore ?? 0) * 10) / 10,
      severity: Number(s.severity ?? 0),
      confirmationsCount: Number(s.confirmationsCount ?? 0),
      affectedGroups: (s.affectedGroups ?? []) as AffectedGroup[],
      descriptionSnippet: clampSnippet(s.description ?? ""),
      lat: s.lat,
      lng: s.lng,
      eventTime: (s.eventTime?.toDate?.() ?? new Date(0)),
    }));

  // 3) Action logs for top signals (≤10 IDs)
  const topIds = topSignals.slice(0, 10).map((s) => s.id);
  let actionLogCounts: AreaSummary["actionLogCounts"] = {
    totalLogsInArea: 0,
    logsByType: {},
    mostRecentLogAt: undefined,
  };

  if (topIds.length) {
    const logsQ = query(
      collection(db, "actionLogs"),
      where("signalId", "in", topIds),
      orderBy("createdAt", "desc"),
      limit(200)
    );
    const logsSnap = await getDocs(logsQ);
    const logs = logsSnap.docs.map((d) => d.data() as any);

    const byType: Record<string, number> = {};
    let mostRecent: Date | undefined;

    for (const l of logs) {
      const t = String(l.actionType ?? "other");
      byType[t] = (byType[t] ?? 0) + 1;
      const dt = l.createdAt?.toDate?.() as Date | undefined;
      if (dt && (!mostRecent || dt > mostRecent)) mostRecent = dt;
    }

    actionLogCounts = {
      totalLogsInArea: logs.length,
      logsByType: byType,
      mostRecentLogAt: mostRecent,
    };
  }

  // 4) Help requests near area (lat/lng) OR linked to top signals
  // MVP: fetch open/closed recent help requests and filter by areaId via lat/lng if present.
  const helpQ = query(collection(db, "helpRequests"), orderBy("createdAt", "desc"), limit(200));
  const helpSnap = await getDocs(helpQ);
  const helps = helpSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

  let open = 0, closed = 0;
  const byType: Record<string, number> = {};
  let mostRecentHelp: Date | undefined;

  for (const h of helps) {
    const lat = h.lat != null ? Number(h.lat) : null;
    const lng = h.lng != null ? Number(h.lng) : null;

    const inArea =
      (lat != null && lng != null && areaIdFromLatLng(lat, lng) === areaId) ||
      (h.signalId && topIds.includes(String(h.signalId))); // backup link check

    if (!inArea) continue;

    const st = String(h.status ?? "open");
    if (st === "open") open++;
    else if (st === "closed") closed++;

    const ty = String(h.type ?? "other");
    byType[ty] = (byType[ty] ?? 0) + 1;

    const dt = h.createdAt?.toDate?.() as Date | undefined;
    if (dt && (!mostRecentHelp || dt > mostRecentHelp)) mostRecentHelp = dt;
  }

  const helpRequestCounts: AreaSummary["helpRequestCounts"] = {
    open,
    closed,
    byType,
    mostRecentHelpAt: mostRecentHelp,
  };

  // Derived hints
  const wasteSum = focusPri.waste.reduce((a, b) => a + b, 0);
  const transportSum = focusPri.transport.reduce((a, b) => a + b, 0);
  const primaryFocus: AreaSummary["derived"]["primaryFocus"] =
    wasteSum === 0 && transportSum === 0 ? "mixed" :
    wasteSum > transportSum * 1.2 ? "waste" :
    transportSum > wasteSum * 1.2 ? "transport" : "mixed";

  const confidence: AreaSummary["derived"]["confidence"] = areaSignals.length < 8 ? "low" : "medium";

  const trendNote =
    (wasteOld + wasteNew + transportOld + transportNew) < 6
      ? "Trend is omitted when there are too few waste/transport reports in the selected window."
      : "Trend compares counts in the older half vs newer half of the selected window.";

  const summary: AreaSummary = {
    areaId,
    timeWindowDays,
    startTime,
    endTime,

    totalSignals: areaSignals.length,
    totalConfirmations,
    avgSeverity: Math.round(avg(severities) * 10) / 10,
    avgPriorityScore: Math.round(avg(priorities) * 10) / 10,
    statusCounts,

    focusCounts,
    focusConfirmations,
    focusAvgSeverity: {
      waste: Math.round(avg(focusSev.waste) * 10) / 10,
      transport: Math.round(avg(focusSev.transport) * 10) / 10,
    },
    focusAvgPriority: {
      waste: Math.round(avg(focusPri.waste) * 10) / 10,
      transport: Math.round(avg(focusPri.transport) * 10) / 10,
    },

    affectedGroupCounts,
    affectedGroupShare,
    topAffectedGroups,

    topSignals,

    actionLogCounts,
    helpRequestCounts,

    trend: {
      wasteDeltaPct: (wasteOld >= 3 ? pctDelta(wasteOld, wasteNew) : undefined),
      transportDeltaPct: (transportOld >= 3 ? pctDelta(transportOld, transportNew) : undefined),
      note: trendNote,
    },

    derived: {
      primaryFocus,
      confidence,
      limitations: [
        "Reports are user-generated and may be incomplete or biased toward reporting activity.",
        "Area grouping is approximate (grid/bucket), not an official boundary.",
        "The recommendation is advisory and does not replace NGO/admin judgment.",
      ],
    },
  };

  return summary;
}
