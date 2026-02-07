import { useEffect, useMemo, useState } from "react";
import SignalList from "../components/SignalList";
import SignalMap from "../components/SignalMap";
import { subscribeSignals, type SignalFilters } from "../services/signals";
import type { Signal } from "../types/signal";
import { CATEGORIES } from "../types/signal";

const DEFAULT_CENTER: [number, number] = [6.9271, 79.8612]; // Colombo-ish fallback

export default function HomePage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Phase 1 minimal filters
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<"new" | "all">("new");

  const filters: SignalFilters = useMemo(() => ({ category, status }), [category, status]);

  useEffect(() => {
    setError(null);
    const unsub = subscribeSignals(
      filters,
      setSignals,
      (err) => setError((err as Error)?.message ?? "Failed to load signals")
    );
    return () => unsub();
  }, [filters]);

  const center = signals.length ? ([signals[0].lat, signals[0].lng] as [number, number]) : DEFAULT_CENTER;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12, padding: 12 }}>
      <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #eee", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 700 }}>Map</div>

          <label style={{ marginLeft: "auto", fontSize: 12 }}>
            Category{" "}
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 12 }}>
            Status{" "}
            <select value={status} onChange={(e) => setStatus(e.target.value as "new" | "all")}>
              <option value="new">new</option>
              <option value="all">all</option>
            </select>
          </label>
        </div>

        <SignalMap signals={signals} center={center} />
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #eee", fontWeight: 700 }}>
          Feed ({signals.length})
        </div>
        {error ? <div style={{ padding: 12, color: "crimson" }}>{error}</div> : <SignalList signals={signals} />}
      </div>
    </div>
  );
}
