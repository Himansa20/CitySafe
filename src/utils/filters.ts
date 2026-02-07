import type { Signal, AffectedGroup, Category } from "../types/signal";

export type TimeWindow = "24h" | "7d" | "30d";

export type SignalFiltersV2 = {
  categories: Category[];        // empty = all
  affectedGroups: AffectedGroup[]; // empty = all
  status: "new" | "all";
  timeWindow: TimeWindow;
  nightOnly: boolean;            // 19:00–05:00 local time
};

export function getThresholdDate(timeWindow: TimeWindow): Date {
  const now = Date.now();
  const ms =
    timeWindow === "24h" ? 24 * 60 * 60 * 1000
    : timeWindow === "7d" ? 7 * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;
  return new Date(now - ms);
}

export function isNightTimeLocal(d: Date): boolean {
  const h = d.getHours();
  return h >= 19 || h < 5;
}

export function applyFilters(signals: Signal[], filters: SignalFiltersV2): Signal[] {
  return signals.filter((s) => {
    // status (Phase 2 only "new", but keep structure)
    if (filters.status !== "all" && s.status !== filters.status) return false;

    // category
    if (filters.categories.length && !filters.categories.includes(s.category)) return false;

    // affectedGroups: ANY match (multi-select)
    if (filters.affectedGroups.length) {
      const hasAny = s.affectedGroups.some((g) => filters.affectedGroups.includes(g));
      if (!hasAny) return false;
    }

    // night-only based on eventTime local clock time
    if (filters.nightOnly) {
      const dt = s.eventTime.toDate();
      if (!isNightTimeLocal(dt)) return false;
    }

    return true;
  });
}
