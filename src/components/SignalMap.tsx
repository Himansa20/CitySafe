import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import { Link } from "react-router-dom";
import type { Signal } from "../types/signal";
import { formatScore, getPriorityBadge } from "../utils/scoring";
import { theme, CATEGORY_ICONS } from "../theme";

type Props = {
  signals: Signal[];
  center: [number, number];
  zoom?: number;
  height?: number | string;
  userLocation?: { lat: number; lng: number } | null;
};

export default function SignalMap({ signals, center, zoom = 14, height = 420, userLocation }: Props) {
  return (
    <div style={{
      height,
      borderRadius: theme.rounded.lg,
      overflow: "hidden",
      position: "relative",
      zIndex: 0
    }}>
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User Location Marker */}
        {userLocation && (
          <>
            {/* Accuracy ring */}
            <CircleMarker
              center={[userLocation.lat, userLocation.lng]}
              radius={40}
              pathOptions={{
                color: theme.colors.primary,
                fillColor: theme.colors.primary,
                fillOpacity: 0.1,
                weight: 1,
              }}
            />
            {/* Center dot */}
            <CircleMarker
              center={[userLocation.lat, userLocation.lng]}
              radius={8}
              pathOptions={{
                color: "white",
                fillColor: theme.colors.primary,
                fillOpacity: 1,
                weight: 3,
              }}
            >
              <Popup>
                <div style={{ fontWeight: 600, color: theme.colors.text.primary }}>
                  📍 Your Location
                </div>
              </Popup>
            </CircleMarker>
          </>
        )}

        {/* Signal Markers */}
        {signals.map((s) => {
          const badge = getPriorityBadge(s.priorityScore ?? 0);
          const icon = CATEGORY_ICONS[s.category] || "📌";
          const isResolved = s.status === "resolved";

          return (
            <Marker key={s.id} position={[s.lat, s.lng]}>
              <Popup>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  minWidth: "220px",
                  padding: "0.25rem"
                }}>
                  {/* Header */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    paddingBottom: "0.5rem",
                    borderBottom: `1px solid ${theme.colors.border}`
                  }}>
                    <span style={{ fontSize: "1.25rem" }}>{icon}</span>
                    <div>
                      <div style={{
                        fontWeight: 700,
                        color: theme.colors.text.primary,
                        textTransform: "capitalize"
                      }}>
                        {s.category.replace("_", " ")}
                      </div>
                      <div style={{
                        fontSize: theme.typography.sizes.xs,
                        color: isResolved ? theme.colors.status.success : theme.colors.status.warning
                      }}>
                        {isResolved ? "✅ Resolved" : "🔴 Open"}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.5rem",
                    fontSize: theme.typography.sizes.xs
                  }}>
                    <div style={{
                      padding: "0.375rem",
                      backgroundColor: theme.colors.bg,
                      borderRadius: theme.rounded.md,
                      textAlign: "center"
                    }}>
                      <div style={{ color: theme.colors.text.muted }}>Priority</div>
                      <div style={{ fontWeight: 600, color: theme.colors.text.primary }}>{badge}</div>
                    </div>
                    <div style={{
                      padding: "0.375rem",
                      backgroundColor: theme.colors.bg,
                      borderRadius: theme.rounded.md,
                      textAlign: "center"
                    }}>
                      <div style={{ color: theme.colors.text.muted }}>Severity</div>
                      <div style={{ fontWeight: 600, color: theme.colors.text.primary }}>{s.severity}/5</div>
                    </div>
                  </div>

                  {/* Confirmations */}
                  <div style={{
                    fontSize: theme.typography.sizes.xs,
                    color: theme.colors.text.secondary,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem"
                  }}>
                    👥 {s.confirmationsCount ?? 0} confirmations
                  </div>

                  {/* Action Button */}
                  <Link
                    to={`/signal/${s.id}`}
                    style={{
                      ...theme.button.base,
                      ...theme.button.primary,
                      padding: "0.5rem 0.75rem",
                      fontSize: theme.typography.sizes.xs,
                      textDecoration: "none",
                      width: "100%"
                    }}
                  >
                    View Details →
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
