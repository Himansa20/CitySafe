import { useEffect, useMemo, useState } from "react";
import SignalList from "../components/SignalList";
import SignalMap from "../components/SignalMap";
import type { Signal } from "../types/signal";
import { AFFECTED_GROUPS, CATEGORIES, type AffectedGroup, type Category } from "../types/signal";
import { applyFilters, type SignalFiltersV2, type TimeWindow } from "../utils/filters";
import { subscribeSignalsV2 } from "../services/signals";
import { theme } from "../theme";

const DEFAULT_CENTER: [number, number] = [6.9271, 79.8612];

export default function HomePage() {
  const [rawSignals, setRawSignals] = useState<Signal[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Phase 2 filters
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<AffectedGroup[]>([]);
  const [status, setStatus] = useState<"new" | "all">("new");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("7d");
  const [nightOnly, setNightOnly] = useState(false);

  const filters: SignalFiltersV2 = useMemo(
    () => ({
      categories,
      affectedGroups: groups,
      status,
      timeWindow,
      nightOnly,
    }),
    [categories, groups, status, timeWindow, nightOnly]
  );

  useEffect(() => {
    setError(null);

    const unsub = subscribeSignalsV2(
      {
        timeWindow,
        categories: categories.length <= 10 ? categories : categories.slice(0, 10),
        status,
      },
      setRawSignals,
      (err) => setError((err as Error)?.message ?? "Failed to load signals")
    );

    return () => unsub();
  }, [timeWindow, categories, status]);

  const signals = useMemo(() => applyFilters(rawSignals, filters), [rawSignals, filters]);

  const center = signals.length
    ? ([signals[0].lat, signals[0].lng] as [number, number])
    : DEFAULT_CENTER;

  function toggleCategory(c: Category) {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function toggleGroup(g: AffectedGroup) {
    setGroups((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  return (
    <div style={theme.layout.pageContainer}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem", height: "calc(100vh - 80px)" }}>

        {/* Left Column: Map & Filters */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflow: "hidden" }}>

          {/* Filters Card */}
          <div style={{ ...theme.card, padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "2rem" }}>

              {/* Main Controls */}
              <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary, fontWeight: 600 }}>
                  STATUS
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "new" | "all")}
                    style={{ ...theme.input, padding: "0.4rem" }}
                  >
                    <option value="new">New / Open</option>
                    <option value="all">All Statuses</option>
                  </select>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary, fontWeight: 600 }}>
                  TIME RANGE
                  <select
                    value={timeWindow}
                    onChange={(e) => setTimeWindow(e.target.value as TimeWindow)}
                    style={{ ...theme.input, padding: "0.4rem" }}
                  >
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                  </select>
                </label>

                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: theme.typography.sizes.sm,
                  fontWeight: 500,
                  cursor: "pointer",
                  marginTop: "1.2rem"
                }}>
                  <input type="checkbox" checked={nightOnly} onChange={(e) => setNightOnly(e.target.checked)} />
                  Night only (7pm–5am)
                </label>
              </div>

              {/* Tag Filters */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: theme.typography.sizes.xs, fontWeight: 700, color: theme.colors.text.secondary, marginRight: "0.5rem" }}>
                    CATEGORIES:
                  </span>
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCategory(c)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "999px",
                        border: `1px solid ${categories.includes(c) ? theme.colors.primary : theme.colors.border}`,
                        background: categories.includes(c) ? "#e0e7ff" : "white",
                        color: categories.includes(c) ? theme.colors.primary : theme.colors.text.secondary,
                        fontSize: theme.typography.sizes.xs,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      {c.replace("_", " ")}
                    </button>
                  ))}
                  {categories.length > 0 && (
                    <button type="button" onClick={() => setCategories([])} style={{ ...theme.button.base, ...theme.button.ghost, padding: "4px 8px", fontSize: theme.typography.sizes.xs }}>
                      Clear
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: theme.typography.sizes.xs, fontWeight: 700, color: theme.colors.text.secondary, marginRight: "0.5rem" }}>
                    AFFECTED:
                  </span>
                  {AFFECTED_GROUPS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGroup(g)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "999px",
                        border: `1px solid ${groups.includes(g) ? theme.colors.status.success : theme.colors.border}`,
                        background: groups.includes(g) ? "#dcfce7" : "white",
                        color: groups.includes(g) ? "#166534" : theme.colors.text.secondary,
                        fontSize: theme.typography.sizes.xs,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      {g}
                    </button>
                  ))}
                  {groups.length > 0 && (
                    <button type="button" onClick={() => setGroups([])} style={{ ...theme.button.base, ...theme.button.ghost, padding: "4px 8px", fontSize: theme.typography.sizes.xs }}>
                      Clear
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Map */}
          <div style={{ flex: 1, borderRadius: theme.rounded.lg, overflow: "hidden", boxShadow: theme.shadows.default }}>
            <SignalMap signals={signals} center={center} height="100%" />
          </div>
        </div>

        {/* Right Column: Feed */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          <div style={{
            ...theme.card,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            borderRadius: theme.rounded.lg,
            border: `1px solid ${theme.colors.border}`
          }}>
            <div style={{
              padding: "1rem",
              borderBottom: `1px solid ${theme.colors.border}`,
              fontWeight: 700,
              fontSize: theme.typography.sizes.lg,
              color: theme.colors.text.primary,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#f8fafc"
            }}>
              <span>LATEST SIGNALS</span>
              <span style={{
                backgroundColor: theme.colors.primary,
                color: "white",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "0.75rem"
              }}>
                {signals.length}
              </span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem", background: "#f8fafc" }}>
              {error ? (
                <div style={{ padding: "1rem", color: theme.colors.status.danger }}>{error}</div>
              ) : (
                <SignalList signals={signals} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
