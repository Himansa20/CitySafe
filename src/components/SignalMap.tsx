import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Link } from "react-router-dom";
import type { Signal } from "../types/signal";
import { formatScore, getPriorityBadge } from "../utils/scoring";

type Props = {
  signals: Signal[];
  center: [number, number];
  zoom?: number;
  height?: number;
};

export default function SignalMap({ signals, center, zoom = 13, height = 420 }: Props) {
  return (
    <div style={{ height }}>
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
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontWeight: 800 }}>
                    {s.category} • sev {s.severity}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    Confirms: {s.confirmationsCount ?? 0} • {badge} • Score {formatScore(s.priorityScore ?? 0)}
                  </div>
                  <Link to={`/signal/${s.id}`}>Open details</Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
