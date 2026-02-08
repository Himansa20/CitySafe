import { useEffect, useState, useCallback } from "react";
import { Circle, MapContainer, TileLayer, Tooltip, Polyline, Marker, useMapEvents } from "react-leaflet";
import { subscribeSignalsV2 } from "../services/signals";
import { planSafeRoute, signalsToDangerZones, type RoutePlanResult, type LatLng } from "../services/routePlanning";
import type { Signal } from "../types/signal";
import { CATEGORIES, type Category } from "../types/signal";
import { theme } from "../theme";
import L from "leaflet";

const COLOMBO_CENTER: [number, number] = [6.9271, 79.8612];

// Route colors
const ROUTE_COLORS = {
  safe: "#22c55e",      // green
  danger: "#ef4444",    // red
  recommended: "#3b82f6", // blue
  neutral: "#94a3b8",   // gray
};

// Heatmap intensity colors
const INTENSITY_COLORS = {
  low: "#fef3c7",
  med: "#fdba74",
  high: "#f87171",
  severe: "#ef4444",
};

function getIntensityColor(severity: number, confirmCount: number) {
  const score = severity + Math.min(confirmCount, 5);
  if (score >= 8) return INTENSITY_COLORS.severe;
  if (score >= 6) return INTENSITY_COLORS.high;
  if (score >= 4) return INTENSITY_COLORS.med;
  return INTENSITY_COLORS.low;
}

// Custom marker icons
const startIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div style="background:#22c55e;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:3px solid white;">A</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const endIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div style="background:#ef4444;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:3px solid white;">B</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function HeatmapLayer({ signals }: { signals: Signal[] }) {
  return (
    <>
      {signals.map((s) => {
        const color = getIntensityColor(s.severity, s.confirmationsCount ?? 0);
        return (
          <Circle
            key={s.id}
            center={[s.lat, s.lng]}
            radius={100}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.35,
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

// Map click handler component
function MapClickHandler({
  onMapClick,
  selectingPoint
}: {
  onMapClick: (latlng: LatLng) => void;
  selectingPoint: "start" | "end" | null;
}) {
  useMapEvents({
    click: (e) => {
      if (selectingPoint) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

export default function NightSafety() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Route planning state
  const [startPoint, setStartPoint] = useState<LatLng | null>(null);
  const [endPoint, setEndPoint] = useState<LatLng | null>(null);
  const [selectingPoint, setSelectingPoint] = useState<"start" | "end" | null>(null);
  const [routeResult, setRouteResult] = useState<RoutePlanResult | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Admin routes state
  const [adminRoutes, setAdminRoutes] = useState<import("../services/adminRoutes").AdminRouteSegment[]>([]);

  // Load signals and admin routes
  useEffect(() => {
    setLoading(true);
    const unsubSignals = subscribeSignalsV2(
      { timeWindow: "30d", status: "all", categories },
      (all) => {
        setSignals(all);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load signals", err);
        setLoading(false);
      }
    );

    const unsubRoutes = import("../services/adminRoutes").then(({ subscribeAdminRoutes }) =>
      subscribeAdminRoutes((routes) => setAdminRoutes(routes))
    );

    return () => {
      unsubSignals();
      unsubRoutes.then(unsub => unsub());
    };
  }, [categories]);

  // Plan route when both points are set
  const planRoute = useCallback(async () => {
    if (!startPoint || !endPoint) return;

    setRouteLoading(true);
    setRouteError(null);
    setRouteResult(null);
    setAiExplanation(null);

    try {
      const dangerZones = signalsToDangerZones(signals);
      // Pass adminRoutes to planning
      const result = await planSafeRoute(startPoint, endPoint, dangerZones, adminRoutes);
      setRouteResult(result);
      setSelectedRouteIndex(0);

      // Get AI recommendation
      setAiLoading(true);
      try {
        const aiResp = await fetch("http://localhost:8787/analyzeRoute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            routes: result.routes.map(r => ({
              distance: r.geometry.distance,
              duration: r.geometry.duration,
              dangerScore: r.dangerScore,
              dangerZonesCount: r.dangerZonesCount,
            })),
            startName: "Starting Point",
            endName: "Destination",
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          setAiExplanation(aiData.explanation);
          if (aiData.recommendedIndex !== undefined) {
            setSelectedRouteIndex(aiData.recommendedIndex);
          }
        }
      } catch (err) {
        console.error("AI analysis failed:", err);
      } finally {
        setAiLoading(false);
      }
    } catch (err) {
      setRouteError((err as Error).message || "Failed to plan route");
    } finally {
      setRouteLoading(false);
    }
  }, [startPoint, endPoint, signals, adminRoutes]);

  useEffect(() => {
    if (startPoint && endPoint) {
      planRoute();
    }
  }, [startPoint, endPoint, planRoute]);

  const handleMapClick = (latlng: LatLng) => {
    if (selectingPoint === "start") {
      setStartPoint(latlng);
    } else if (selectingPoint === "end") {
      setEndPoint(latlng);
    }
    setSelectingPoint(null);
  };

  function toggleCategory(c: Category) {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  const clearRoute = () => {
    setStartPoint(null);
    setEndPoint(null);
    setRouteResult(null);
    setAiExplanation(null);
    setRouteError(null);
  };

  return (
    <div style={{ ...theme.layout.pageContainer, maxWidth: "1400px" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: theme.typography.sizes["2xl"], fontWeight: 800, color: theme.colors.text.primary, marginBottom: "0.25rem" }}>
          Night Safety Route Planner 🌙
        </h2>
        <p style={{ color: theme.colors.text.secondary, margin: 0 }}>
          Plan your safest walking route. Click on the map to set start and end points.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "1rem", height: "calc(100vh - 160px)" }}>
        {/* Controls Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto" }}>

          {/* Route Planning Card */}
          <div style={{ ...theme.card, padding: "1rem" }}>
            <h3 style={{ fontSize: theme.typography.sizes.base, fontWeight: 700, margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              🗺️ Plan Your Route
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {/* Start Point */}
              <div>
                <div style={{ fontSize: theme.typography.sizes.xs, fontWeight: 600, color: theme.colors.text.secondary, marginBottom: "0.25rem" }}>
                  START POINT
                </div>
                <button
                  onClick={() => setSelectingPoint("start")}
                  style={{
                    ...theme.button.base,
                    width: "100%",
                    justifyContent: "flex-start",
                    padding: "0.75rem",
                    backgroundColor: selectingPoint === "start" ? "#dcfce7" : startPoint ? "#f0fdf4" : "white",
                    border: `2px solid ${selectingPoint === "start" ? "#22c55e" : startPoint ? "#86efac" : theme.colors.border}`,
                    color: theme.colors.text.primary,
                  }}
                >
                  <span style={{ marginRight: "0.5rem" }}>🟢</span>
                  {startPoint ? `${startPoint.lat.toFixed(4)}, ${startPoint.lng.toFixed(4)}` : "Click to select on map"}
                </button>
              </div>

              {/* End Point */}
              <div>
                <div style={{ fontSize: theme.typography.sizes.xs, fontWeight: 600, color: theme.colors.text.secondary, marginBottom: "0.25rem" }}>
                  END POINT
                </div>
                <button
                  onClick={() => setSelectingPoint("end")}
                  style={{
                    ...theme.button.base,
                    width: "100%",
                    justifyContent: "flex-start",
                    padding: "0.75rem",
                    backgroundColor: selectingPoint === "end" ? "#fee2e2" : endPoint ? "#fef2f2" : "white",
                    border: `2px solid ${selectingPoint === "end" ? "#ef4444" : endPoint ? "#fca5a5" : theme.colors.border}`,
                    color: theme.colors.text.primary,
                  }}
                >
                  <span style={{ marginRight: "0.5rem" }}>🔴</span>
                  {endPoint ? `${endPoint.lat.toFixed(4)}, ${endPoint.lng.toFixed(4)}` : "Click to select on map"}
                </button>
              </div>

              {(startPoint || endPoint) && (
                <button
                  onClick={clearRoute}
                  style={{
                    ...theme.button.base,
                    ...theme.button.ghost,
                    padding: "0.5rem",
                    fontSize: theme.typography.sizes.sm,
                  }}
                >
                  ✕ Clear Route
                </button>
              )}
            </div>

            {selectingPoint && (
              <div style={{
                marginTop: "0.75rem",
                padding: "0.75rem",
                backgroundColor: selectingPoint === "start" ? "#dcfce7" : "#fee2e2",
                borderRadius: theme.rounded.md,
                fontSize: theme.typography.sizes.sm,
                fontWeight: 600,
                color: selectingPoint === "start" ? "#166534" : "#991b1b",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}>
                👆 Click on the map to set {selectingPoint} point
              </div>
            )}
          </div>

          {/* Route Results */}
          {routeLoading && (
            <div style={{ ...theme.card, padding: "1.5rem", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔄</div>
              <div>Finding routes...</div>
            </div>
          )}

          {routeError && (
            <div style={{ ...theme.card, padding: "1rem", backgroundColor: "#fef2f2", border: `1px solid ${theme.colors.status.danger}` }}>
              <div style={{ color: theme.colors.status.danger, fontWeight: 600 }}>⚠️ {routeError}</div>
            </div>
          )}

          {routeResult && routeResult.routes.length > 0 && (
            <div style={{ ...theme.card, padding: "1rem" }}>
              <h3 style={{ fontSize: theme.typography.sizes.base, fontWeight: 700, margin: "0 0 0.75rem 0" }}>
                📍 Route Options
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {routeResult.routes.map((route, idx) => {
                  const isSelected = idx === selectedRouteIndex;
                  const distKm = (route.geometry.distance / 1000).toFixed(2);
                  const durationMin = Math.round(route.geometry.duration / 60);

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedRouteIndex(idx)}
                      style={{
                        ...theme.button.base,
                        width: "100%",
                        padding: "0.75rem",
                        textAlign: "left",
                        backgroundColor: isSelected ? (route.dangerScore < 10 ? "#f0fdf4" : route.dangerScore < 30 ? "#fffbeb" : "#fef2f2") : "white",
                        border: `2px solid ${isSelected ? (route.dangerScore < 10 ? "#22c55e" : route.dangerScore < 30 ? "#f59e0b" : "#ef4444") : theme.colors.border}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700 }}>
                          Route {idx + 1}
                          {route.recommendation === "safest" && <span style={{ marginLeft: "0.5rem", color: "#22c55e" }}>✓ Safest</span>}
                          {route.recommendation === "fastest" && <span style={{ marginLeft: "0.5rem", color: "#3b82f6" }}>⚡ Fastest</span>}
                        </span>
                        <span style={{
                          fontSize: theme.typography.sizes.xs,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor: route.dangerScore < 10 ? "#dcfce7" : route.dangerScore < 30 ? "#fef3c7" : "#fee2e2",
                          color: route.dangerScore < 10 ? "#166534" : route.dangerScore < 30 ? "#92400e" : "#991b1b",
                          fontWeight: 600,
                        }}>
                          Risk: {route.dangerScore}
                        </span>
                      </div>
                      <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary }}>
                        {distKm} km • ~{durationMin} min walk • {route.dangerZonesCount} danger zones
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Recommendation */}
          {(aiLoading || aiExplanation) && (
            <div style={{ ...theme.card, padding: "1rem", backgroundColor: "#eff6ff", border: `1px solid #3b82f6` }}>
              <h4 style={{ margin: "0 0 0.5rem 0", color: "#1d4ed8", fontSize: theme.typography.sizes.sm, fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                🤖 AI Safety Advisor
              </h4>
              {aiLoading ? (
                <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.secondary }}>Analyzing routes...</div>
              ) : (
                <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.primary, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                  {aiExplanation}
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div style={{ ...theme.card, padding: "1rem" }}>
            <h3 style={{ fontSize: theme.typography.sizes.base, fontWeight: 700, margin: "0 0 0.75rem 0" }}>🔍 Risk Filters</h3>
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

          {/* Stats */}
          <div style={{ ...theme.card, padding: "1rem" }}>
            <h3 style={{ fontSize: theme.typography.sizes.base, fontWeight: 700, margin: "0 0 0.75rem 0" }}>📊 Stats (30d)</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div style={{ textAlign: "center", padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: theme.rounded.md }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: theme.colors.primary }}>{signals.length}</div>
                <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary }}>Total Reports</div>
              </div>
              <div style={{ textAlign: "center", padding: "0.75rem", backgroundColor: "#fef2f2", borderRadius: theme.rounded.md }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: theme.colors.status.danger }}>
                  {signals.filter(s => s.severity >= 4).length}
                </div>
                <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary }}>High Risk</div>
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div style={{ ...theme.card, padding: 0, overflow: "hidden", position: "relative" }}>
          <MapContainer
            center={COLOMBO_CENTER}
            zoom={13}
            style={{ height: "100%", width: "100%", cursor: selectingPoint ? "crosshair" : "grab" }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapClickHandler onMapClick={handleMapClick} selectingPoint={selectingPoint} />

            {!loading && <HeatmapLayer signals={signals} />}

            {/* Admin Routes Visualization */}
            {adminRoutes.map((route) => (
              <Polyline
                key={route.id}
                positions={route.points}
                pathOptions={{
                  color: route.type === "safe" ? "#22c55e" : "#ef4444",
                  weight: 3,
                  opacity: 0.6,
                  dashArray: "4, 8"
                }}
              >
                <Tooltip sticky>
                  <div style={{ fontSize: "12px", textAlign: "center" }}>
                    <strong>{route.name}</strong><br />
                    {route.type.toUpperCase()}<br />
                    <span style={{ fontSize: "10px", color: "#666" }}>Managed Route</span>
                  </div>
                </Tooltip>
              </Polyline>
            ))}

            {/* Route polylines */}
            {routeResult && routeResult.routes.map((route, idx) => {
              const isSelected = idx === selectedRouteIndex;
              const coords = route.geometry.coordinates.map(c => [c[1], c[0]] as [number, number]);

              if (!isSelected) {
                return (
                  <Polyline
                    key={`route-${idx}`}
                    positions={coords}
                    pathOptions={{
                      color: ROUTE_COLORS.neutral,
                      weight: 4,
                      opacity: 0.4,
                      dashArray: "5, 10",
                    }}
                    eventHandlers={{ click: () => setSelectedRouteIndex(idx) }}
                  />
                );
              }

              // Selected route - show danger coloring
              const routeColor = route.dangerScore < 10 ? ROUTE_COLORS.safe : route.dangerScore < 30 ? "#f59e0b" : ROUTE_COLORS.danger;

              return (
                <Polyline
                  key={`route-${idx}`}
                  positions={coords}
                  pathOptions={{
                    color: routeColor,
                    weight: 6,
                    opacity: 0.9,
                  }}
                />
              );
            })}

            {/* Start marker */}
            {startPoint && (
              <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon} />
            )}

            {/* End marker */}
            {endPoint && (
              <Marker position={[endPoint.lat, endPoint.lng]} icon={endIcon} />
            )}
          </MapContainer>

          {/* Legend */}
          <div style={{
            position: "absolute",
            bottom: "1rem",
            left: "1rem",
            zIndex: 1000,
            backgroundColor: "white",
            padding: "0.75rem",
            borderRadius: theme.rounded.md,
            boxShadow: theme.shadows.md,
            fontSize: theme.typography.sizes.xs,
          }}>
            <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>LEGEND</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: 20, height: 4, background: ROUTE_COLORS.safe, borderRadius: "2px" }} /> Safe Route
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: 20, height: 4, background: "#f59e0b", borderRadius: "2px" }} /> Medium Risk
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: 20, height: 4, background: ROUTE_COLORS.danger, borderRadius: "2px" }} /> High Risk
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: INTENSITY_COLORS.severe, opacity: 0.5 }} /> Danger Zone
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
