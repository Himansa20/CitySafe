import { useEffect, useState } from "react";
import { Circle, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import { subscribeSignalsV2 } from "../services/signals";
import type { Signal } from "../types/signal";
import { CATEGORIES, type Category } from "../types/signal";
import { theme } from "../theme";

const COLOMBO_CENTER: [number, number] = [6.9271, 79.8612];

// Heatmap intensity colors (simple approach w/ circles)
const INTENSITY_COLORS = {
  low: "#fef3c7",    // yellow
  med: "#fdba74",    // orange
  high: "#f87171",   // red
  severe: "#ef4444", // dark red
};

function getIntensityColor(severity: number, confirmCount: number) {
  const score = severity + Math.min(confirmCount, 5); // crude score
  if (score >= 8) return INTENSITY_COLORS.severe;
  if (score >= 6) return INTENSITY_COLORS.high;
  if (score >= 4) return INTENSITY_COLORS.med;
  return INTENSITY_COLORS.low;
}

function HeatmapLayer({ signals }: { signals: Signal[] }) {
  return (
    <>
      {signals.map((s) => {
        const color = getIntensityColor(s.severity, s.confirmationsCount ?? 0);
        return (
          <Circle
            key={s.id}
            center={[s.lat, s.lng]}
            radius={150} // 150m radius
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.4,
              stroke: false,
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>
                {s.category} (Sev: {s.severity})
              </div>
            </Tooltip>
          </Circle>
        );
      })}
    </>
  );
}

// Simple safe path (mock) - just draws a polyline between 2 points or mock route
// Real implementation would use routing API. We'll just skip complex routing for now
// and focus on the heatmap visualization and safety tips.

export default function NightSafety() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);

  // Load last 30 days of night-time signals
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeSignalsV2(
      {
        timeWindow: "30d",
        status: "all", // active and resolved both matter for history
        categories,
      },
      (all) => {
        // filter client-side for "night only" logic if backend doesn't fully support it yet
        // For hackathon, we assume the backend 'nightOnly' param might not be perfect
        // or we just rely on visual filtering.
        setSignals(all);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load signals", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [categories]); // re-fetch if cats change

  function toggleCategory(c: Category) {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  return (
    <div style={{ ...theme.layout.pageContainer, maxWidth: "1200px" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: theme.typography.sizes["2xl"], fontWeight: 800, color: theme.colors.text.primary, marginBottom: "0.5rem" }}>
          Night Safety Map 🌙
        </h2>
        <p style={{ color: theme.colors.text.secondary }}>
          Visualize high-risk areas based on reports from the last 30 days. Plan your travel accordingly.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1.5rem", height: "calc(100vh - 180px)" }}>

        {/* Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ ...theme.card, padding: "1.5rem" }}>
            <h3 style={{ fontSize: theme.typography.sizes.lg, fontWeight: 700, margin: "0 0 1rem 0" }}>Filters</h3>

            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: theme.typography.sizes.xs, fontWeight: 700, color: theme.colors.text.secondary, marginBottom: "0.5rem" }}>
                RISK FACTORS
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleCategory(c)}
                    style={{
                      padding: "4px 10px",
                      fontSize: theme.typography.sizes.xs,
                      borderRadius: "999px",
                      border: `1px solid ${categories.includes(c) ? theme.colors.primary : theme.colors.border}`,
                      background: categories.includes(c) ? theme.colors.primary : "white",
                      color: categories.includes(c) ? "white" : theme.colors.text.secondary,
                      cursor: "pointer"
                    }}
                  >
                    {c.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: "1rem", backgroundColor: "#fffbeb", borderRadius: theme.rounded.md, border: "1px solid #fcd34d" }}>
              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: theme.typography.sizes.sm, fontWeight: 700, color: "#92400e" }}>
                Safety Tips
              </h4>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: theme.typography.sizes.xs, color: "#92400e", lineHeight: 1.5 }}>
                <li>Avoid unlit streets (marked red).</li>
                <li>Stick to main roads with active shops.</li>
                <li>Share your live location with trusted contacts.</li>
                <li>Report suspicious activity immediately.</li>
              </ul>
            </div>
          </div>

          <div style={{ ...theme.card, padding: "1.5rem", flex: 1 }}>
            <h3 style={{ fontSize: theme.typography.sizes.lg, fontWeight: 700, margin: "0 0 1rem 0" }}>Stats (30d)</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "#f8fafc", borderRadius: theme.rounded.md }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: theme.colors.primary }}>{signals.length}</div>
                <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary }}>Total Reports</div>
              </div>
              <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "#fef2f2", borderRadius: theme.rounded.md }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: theme.colors.status.danger }}>
                  {signals.filter(s => s.severity >= 4).length}
                </div>
                <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary, fontWeight: 600 }}>High Risk</div>
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div style={{ ...theme.card, padding: 0, overflow: "hidden", position: "relative" }}>
          <MapContainer center={COLOMBO_CENTER} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {!loading && <HeatmapLayer signals={signals} />}
          </MapContainer>

          <div style={{
            position: "absolute",
            bottom: "2rem",
            left: "1rem",
            zIndex: 1000,
            backgroundColor: "white",
            padding: "0.75rem",
            borderRadius: theme.rounded.md,
            boxShadow: theme.shadows.md
          }}>
            <div style={{ fontSize: theme.typography.sizes.xs, fontWeight: 700, marginBottom: "0.5rem" }}>INTENSITY LEGEND</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: theme.typography.sizes.xs }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: INTENSITY_COLORS.low, opacity: 0.6 }} /> Low
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: theme.typography.sizes.xs }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: INTENSITY_COLORS.med, opacity: 0.6 }} /> Medium
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: theme.typography.sizes.xs }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: INTENSITY_COLORS.high, opacity: 0.6 }} /> High
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: theme.typography.sizes.xs }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: INTENSITY_COLORS.severe, opacity: 0.6 }} /> Severe
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
