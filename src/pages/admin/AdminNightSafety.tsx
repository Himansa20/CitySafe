import { useEffect, useState } from "react";
import { subscribeRoutes, createRoute, addSegmentToRoute, deleteRoute } from "../../services/routes";
import { subscribeSegments } from "../../services/routes";
import { MapContainer, Polyline, TileLayer, Tooltip, useMapEvents, CircleMarker } from "react-leaflet";
import type { RouteDoc, SegmentDoc } from "../../services/routes";
import { theme } from "../../theme";

// Map drawing component - handles clicks and renders drawing state
function RouteEditorMap({
  activeRouteId,
  segments,
  currentPoints,
  onAddPoint,
}: {
  activeRouteId: string | null;
  segments: SegmentDoc[];
  currentPoints: { lat: number; lng: number }[];
  onAddPoint: (point: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      if (!activeRouteId) return;
      onAddPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return (
    <>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* Existing segments */}
      {segments.map((s) => (
        <Polyline
          key={s.id}
          positions={s.polyline.map(p => [p.lat, p.lng] as [number, number])}
          pathOptions={{ color: "#8b5cf6", weight: 5, opacity: 0.8 }}
        >
          <Tooltip sticky>{s.name || `Segment ${s.id.slice(0, 4)}`}</Tooltip>
        </Polyline>
      ))}

      {/* Current drawing points */}
      {currentPoints.length > 0 && (
        <>
          {currentPoints.map((p, i) => (
            <CircleMarker
              key={i}
              center={[p.lat, p.lng]}
              radius={7}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#60a5fa",
                fillOpacity: 0.9,
                weight: 2
              }}
            />
          ))}
          <Polyline
            positions={currentPoints.map(p => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: "#3b82f6", dashArray: "8, 8", weight: 3 }}
          />
        </>
      )}
    </>
  );
}

export default function AdminNightSafety() {
  const [routes, setRoutes] = useState<RouteDoc[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [segments, setSegments] = useState<SegmentDoc[]>([]);
  const [newRouteName, setNewRouteName] = useState("");

  // Drawing state - lifted to parent for controls access
  const [currentPoints, setCurrentPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return subscribeRoutes(setRoutes);
  }, []);

  useEffect(() => {
    if (!activeRouteId) {
      setSegments([]);
      return;
    }
    return subscribeSegments(activeRouteId, setSegments);
  }, [activeRouteId]);

  // Reset points when switching routes
  useEffect(() => {
    setCurrentPoints([]);
  }, [activeRouteId]);

  async function onAddRoute() {
    if (!newRouteName.trim()) return;
    const id = await createRoute({ name: newRouteName.trim(), description: "", createdBy: "admin" });
    setNewRouteName("");
    setActiveRouteId(id);
  }

  async function onDeleteRoute(id: string) {
    if (!confirm("Delete route?")) return;
    await deleteRoute(id);
    if (activeRouteId === id) setActiveRouteId(null);
  }

  async function onSaveSegment() {
    if (!activeRouteId || currentPoints.length < 2) return;
    setSaving(true);
    try {
      await addSegmentToRoute({
        routeId: activeRouteId,
        polyline: currentPoints,
        name: `Segment ${segments.length + 1}`,
      });
      setCurrentPoints([]);
    } catch (err) {
      console.error(err);
      alert("Failed to save segment");
    } finally {
      setSaving(false);
    }
  }

  function onAddPoint(point: { lat: number; lng: number }) {
    setCurrentPoints(prev => [...prev, point]);
  }

  function onCancelDrawing() {
    setCurrentPoints([]);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1.5rem", height: "600px" }}>
      {/* Sidebar */}
      <div style={{ ...theme.card, padding: "1.5rem", display: "flex", flexDirection: "column" }}>
        <h3 style={{ margin: "0 0 1rem 0", fontSize: theme.typography.sizes.lg, fontWeight: 700 }}>
          Routes
        </h3>

        {/* Add new route */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <input
            value={newRouteName}
            onChange={(e) => setNewRouteName(e.target.value)}
            placeholder="New Route Name"
            style={{ ...theme.input, flex: 1 }}
            onKeyDown={(e) => e.key === "Enter" && onAddRoute()}
          />
          <button
            onClick={onAddRoute}
            style={{ ...theme.button.base, ...theme.button.primary, padding: "0 1rem", minWidth: "40px" }}
          >
            +
          </button>
        </div>

        {/* Route list */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {routes.length === 0 ? (
            <div style={{
              padding: "1.5rem",
              textAlign: "center",
              color: theme.colors.text.secondary,
              fontSize: theme.typography.sizes.sm
            }}>
              No routes yet. Create one to start.
            </div>
          ) : (
            routes.map((r) => (
              <div
                key={r.id}
                onClick={() => setActiveRouteId(r.id)}
                style={{
                  padding: "0.75rem",
                  borderRadius: theme.rounded.md,
                  border: activeRouteId === r.id
                    ? `2px solid ${theme.colors.primary}`
                    : `1px solid ${theme.colors.border}`,
                  backgroundColor: activeRouteId === r.id ? "#eef2ff" : "white",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: theme.transitions.fast,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: theme.typography.sizes.sm }}>{r.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteRoute(r.id); }}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: theme.colors.text.muted,
                    cursor: "pointer",
                    fontSize: "1.2rem",
                    lineHeight: 1,
                    padding: "4px",
                    borderRadius: theme.rounded.sm,
                  }}
                  title="Delete route"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {/* Segment count for active route */}
        {activeRouteId && (
          <div style={{
            marginTop: "1rem",
            padding: "0.75rem",
            backgroundColor: theme.colors.surfaceHover,
            borderRadius: theme.rounded.md,
            fontSize: theme.typography.sizes.sm,
          }}>
            <strong>{segments.length}</strong> segment{segments.length !== 1 ? "s" : ""} in this route
          </div>
        )}
      </div>

      {/* Map container */}
      <div style={{ ...theme.card, padding: 0, overflow: "hidden", position: "relative" }}>
        <MapContainer center={[6.9271, 79.8612]} zoom={13} style={{ height: "100%", width: "100%" }}>
          <RouteEditorMap
            activeRouteId={activeRouteId}
            segments={segments}
            currentPoints={currentPoints}
            onAddPoint={onAddPoint}
          />
        </MapContainer>

        {/* Map overlay controls - outside MapContainer for proper z-index */}
        {activeRouteId && currentPoints.length > 1 && (
          <div style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 1000,
            display: "flex",
            gap: "0.5rem"
          }}>
            <button
              onClick={onSaveSegment}
              disabled={saving}
              style={{
                ...theme.button.base,
                ...theme.button.success,
                padding: "0.5rem 1rem",
                boxShadow: theme.shadows.md,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving..." : `Save Segment (${currentPoints.length} pts)`}
            </button>
            <button
              onClick={onCancelDrawing}
              style={{
                ...theme.button.base,
                ...theme.button.secondary,
                padding: "0.5rem 1rem",
                backgroundColor: "white",
                boxShadow: theme.shadows.md
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Help text */}
        <div style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          zIndex: 1000,
          backgroundColor: "white",
          padding: "0.5rem 0.75rem",
          borderRadius: theme.rounded.md,
          fontSize: theme.typography.sizes.xs,
          boxShadow: theme.shadows.sm,
          color: theme.colors.text.secondary,
        }}>
          {activeRouteId
            ? `Click map to add points${currentPoints.length > 0 ? ` (${currentPoints.length} added)` : ""}`
            : "Select or create a route to start drawing"}
        </div>

        {/* Overlay when no route selected */}
        {!activeRouteId && (
          <div style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(255,255,255,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            backdropFilter: "blur(2px)"
          }}>
            <div style={{
              fontWeight: 600,
              color: theme.colors.text.secondary,
              backgroundColor: "white",
              padding: "1rem 1.5rem",
              borderRadius: theme.rounded.lg,
              boxShadow: theme.shadows.md,
            }}>
              Select or create a route to edit segments
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
