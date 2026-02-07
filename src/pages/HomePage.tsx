import { useEffect, useMemo, useState } from "react";
import SignalList from "../components/SignalList";
import SignalMap from "../components/SignalMap";
import type { Signal } from "../types/signal";
import { AFFECTED_GROUPS, CATEGORIES, type AffectedGroup, type Category } from "../types/signal";
import { applyFilters, type SignalFiltersV2, type TimeWindow } from "../utils/filters";
import { subscribeSignalsV2 } from "../services/signals";

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

  // Firestore base query strategy:
  // - Always query by eventTime window + status + optional category in/==
  // - Apply affectedGroups + nightOnly + any extra category logic client-side (consistent for demo)
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
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12, padding: 12 }}>
      <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #eee", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 800 }}>Map</div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <label style={{ fontSize: 12 }}>
                Status{" "}
                <select value={status} onChange={(e) => setStatus(e.target.value as "new" | "all")}>
                  <option value="new">new</option>
                  <option value="all">all</option>
                </select>
              </label>

              <label style={{ fontSize: 12 }}>
                Time{" "}
                <select value={timeWindow} onChange={(e) => setTimeWindow(e.target.value as TimeWindow)}>
                  <option value="24h">last 24h</option>
                  <option value="7d">last 7d</option>
                  <option value="30d">last 30d</option>
                </select>
              </label>

              <label style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={nightOnly} onChange={(e) => setNightOnly(e.target.checked)} />
                Night only (7pm–5am)
              </label>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Category</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #ddd",
                    background: categories.includes(c) ? "#eef5ff" : "white",
                  }}
                >
                  {c}
                </button>
              ))}
              <button type="button" onClick={() => setCategories([])} style={{ padding: "6px 10px" }}>
                Clear
              </button>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700 }}>Affected groups</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {AFFECTED_GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGroup(g)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #ddd",
                    background: groups.includes(g) ? "#f3fff6" : "white",
                  }}
                >
                  {g}
                </button>
              ))}
              <button type="button" onClick={() => setGroups([])} style={{ padding: "6px 10px" }}>
                Clear
              </button>
            </div>
          </div>
        </div>

        <SignalMap signals={signals} center={center} />
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #eee", fontWeight: 800 }}>
          Feed ({signals.length})
        </div>
        {error ? <div style={{ padding: 12, color: "crimson" }}>{error}</div> : <SignalList signals={signals} />}
      </div>
    </div>
  );
}
