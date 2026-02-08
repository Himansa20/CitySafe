import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Link } from "react-router-dom";
import type { Signal } from "../types/signal";
import { formatScore, getPriorityBadge } from "../utils/scoring";
import { theme } from "../theme";

type Props = {
  signals: Signal[];
  center: [number, number];
  zoom?: number;
  height?: number | string;
};

export default function SignalMap({ signals, center, zoom = 13, height = 420 }: Props) {
  return (
    <div style={{
      height,
      borderRadius: theme.rounded.lg,
      overflow: "hidden",
      boxShadow: theme.shadows.default,
      border: `1px solid ${theme.colors.border}`,
      position: "relative",
      zIndex: 0
    }}>
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {signals.map((s) => {
          const badge = getPriorityBadge(s.priorityScore ?? 0);
          return (
            <Marker key={s.id} position={[s.lat, s.lng]}>
              <Popup>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: "200px" }}>
                  <div style={{ fontWeight: 700, color: theme.colors.text.primary, borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: "4px" }}>
                    {s.category}
                  </div>
                  <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary }}>
                    <div>Priority: <strong>{badge}</strong> ({formatScore(s.priorityScore ?? 0)})</div>
                    <div>Severity: {s.severity}/5</div>
                    <div>Confirmations: {s.confirmationsCount ?? 0}</div>
                  </div>
                  <Link
                    to={`/signal/${s.id}`}
                    style={{
                      ...theme.button.base,
                      ...theme.button.primary,
                      padding: "4px 8px",
                      fontSize: theme.typography.sizes.xs,
                      textDecoration: "none",
                      marginTop: "4px"
                    }}
                  >
                    View Details
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
