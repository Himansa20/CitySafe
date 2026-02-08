import { useEffect, useState } from "react";
import { subscribeRoutes, createRoute, addSegmentToRoute, deleteRoute } from "../../services/routes";
import { subscribeSegments } from "../../services/routes";
import { MapContainer, Polyline, TileLayer, Tooltip, useMapEvents, Marker } from "react-leaflet";
import type { RouteDoc, SegmentDoc } from "../../services/routes";
import { theme } from "../../theme";

function RouteEditorMap({
  activeRouteId,
  segments,
  onCreateSegment,
}: {
  activeRouteId: string | null;
  segments: SegmentDoc[];
  onCreateSegment: (points: { lat: number; lng: number }[]) => void;
}) {
  const [points, setPoints] = useState<{ lat: number; lng: number }[]>([]);

  useMapEvents({
    click(e) {
      if (!activeRouteId) return;
      setPoints((prev) => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]);
    },
  });

  return (
    <>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {segments.map((s) => (
        <Polyline
          key={s.id}
          positions={s.polyline.map(p => [p.lat, p.lng] as [number, number])}
          pathOptions={{ color: "purple", weight: 4 }}
        >
          <Tooltip sticky>Segment {s.id.slice(0, 4)}</Tooltip>
        </Polyline>
      ))}

      {points.length > 0 && (
        <>
          {points.map((p, i) => (
            <Marker key={i} position={[p.lat, p.lng]} icon={undefined} opacity={0.6} />
          ))}
          <Polyline positions={points.map(p => [p.lat, p.lng] as [number, number])} pathOptions={{ color: "blue", dashArray: "5, 5" }} />
        </>
      )}

      {points.length > 1 && (
        <div style={{ position: "absolute", top: 10, right: 10, zIndex: 1000, display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => {
              onCreateSegment(points);
              setPoints([]);
            }}
            style={{ ...theme.button.base, ...theme.button.primary, padding: "0.5rem 1rem" }}
          >
            Save Segment
          </button>
          <button
            onClick={() => setPoints([])}
            style={{ ...theme.button.base, ...theme.button.secondary, padding: "0.5rem 1rem", backgroundColor: "white" }}
          >
            Cancel
          </button>
        </div>
      )}
      <div style={{ position: "absolute", bottom: 10, left: 10, zIndex: 1000, backgroundColor: "white", padding: "0.5rem", borderRadius: theme.rounded.sm, fontSize: theme.typography.sizes.xs }}>
        Click map to add points. Save to create segment.
      </div>
    </>
  );
}

export default function AdminNightSafety() {
  const [routes, setRoutes] = useState<RouteDoc[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [segments, setSegments] = useState<SegmentDoc[]>([]);

  const [newRouteName, setNewRouteName] = useState("");

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

  async function onSaveSegment(points: { lat: number; lng: number }[]) {
    if (!activeRouteId) return;
    await addSegmentToRoute({
      routeId: activeRouteId,
      polyline: points,
      name: `Seg ${Date.now()}`,
    });
    alert("Segment added");
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1.5rem", height: "600px" }}>

      <div style={{ ...theme.card, padding: "1.5rem", display: "flex", flexDirection: "column" }}>
        <h3 style={{ margin: "0 0 1rem 0", fontSize: theme.typography.sizes.lg, fontWeight: 700 }}>Routes</h3>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <input
            value={newRouteName}
            onChange={(e) => setNewRouteName(e.target.value)}
            placeholder="New Route Name"
            style={{ ...theme.input, flex: 1 }}
          />
          <button onClick={onAddRoute} style={{ ...theme.button.base, ...theme.button.primary, padding: "0 0.8rem" }}>+</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {routes.map((r) => (
            <div
              key={r.id}
              onClick={() => setActiveRouteId(r.id)}
              style={{
                padding: "0.75rem",
                borderRadius: theme.rounded.md,
                border: activeRouteId === r.id ? `1px solid ${theme.colors.primary}` : `1px solid ${theme.colors.border}`,
                backgroundColor: activeRouteId === r.id ? "#eef2ff" : "transparent",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <span style={{ fontWeight: 600, fontSize: theme.typography.sizes.sm }}>{r.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteRoute(r.id); }}
                style={{ border: "none", background: "transparent", color: theme.colors.text.secondary, cursor: "pointer", fontSize: "1.2rem", lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...theme.card, padding: 0, overflow: "hidden", position: "relative" }}>
        <MapContainer center={[6.9271, 79.8612]} zoom={13} style={{ height: "100%", width: "100%" }}>
          <RouteEditorMap
            activeRouteId={activeRouteId}
            segments={segments}
            onCreateSegment={onSaveSegment}
          />
        </MapContainer>

        {!activeRouteId && (
          <div style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(255,255,255,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(2px)"
          }}>
            <div style={{ fontWeight: 600, color: theme.colors.text.secondary }}>Select or create a route to edit segments</div>
          </div>
        )}
      </div>
    </div>
  );
}
