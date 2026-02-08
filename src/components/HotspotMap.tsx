import { MapContainer, TileLayer, Polygon, Marker, Popup } from "react-leaflet";
import type { CollectionZone, WasteHotspot } from "../types/wasteSchedule";
import type { Signal } from "../types/signal";
import { theme } from "../theme";

type Props = {
    zones: CollectionZone[];
    hotspots: WasteHotspot[];
    signals?: Signal[];
    center?: [number, number];
    height?: string;
    onZoneClick?: (zone: CollectionZone | WasteHotspot) => void;
    selectedZoneId?: string;
    showSignals?: boolean;
};

/**
 * Get color based on demand score
 */
function getHeatColor(demandScore: number): string {
    if (demandScore >= 40) return "#dc2626"; // red-600
    if (demandScore >= 25) return "#ea580c"; // orange-600
    if (demandScore >= 12) return "#ca8a04"; // yellow-600
    if (demandScore >= 5) return "#65a30d"; // lime-600
    return "#16a34a"; // green-600
}

/**
 * Get fill opacity based on demand score
 */
function getHeatOpacity(demandScore: number): number {
    if (demandScore >= 40) return 0.6;
    if (demandScore >= 25) return 0.5;
    if (demandScore >= 12) return 0.4;
    if (demandScore >= 5) return 0.3;
    return 0.2;
}

const DEFAULT_CENTER: [number, number] = [6.9271, 79.8612];

export default function HotspotMap({
    zones,
    hotspots,
    signals = [],
    center = DEFAULT_CENTER,
    height = "400px",
    onZoneClick,
    selectedZoneId,
    showSignals = true,
}: Props) {
    // Create a map of zone ID to hotspot for quick lookup
    const hotspotMap = new Map(hotspots.map((h) => [h.zoneId, h]));

    return (
        <MapContainer
            center={center}
            zoom={13}
            style={{ height, width: "100%", borderRadius: theme.rounded.lg }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Render zones with heat coloring */}
            {zones.map((zone) => {
                const hotspot = hotspotMap.get(zone.id);
                const demandScore = hotspot?.demandScore ?? 0;
                const isSelected = selectedZoneId === zone.id;

                return (
                    <Polygon
                        key={zone.id}
                        positions={zone.polygon.map((p) => [p.lat, p.lng])}
                        pathOptions={{
                            color: isSelected ? theme.colors.primary : getHeatColor(demandScore),
                            fillColor: getHeatColor(demandScore),
                            fillOpacity: isSelected ? 0.6 : getHeatOpacity(demandScore),
                            weight: isSelected ? 3 : 2,
                        }}
                        eventHandlers={{
                            click: () => onZoneClick?.(hotspot ?? zone as any),
                        }}
                    >
                        <Popup>
                            <div style={{ minWidth: "180px" }}>
                                <strong style={{ fontSize: "14px" }}>{zone.name}</strong>
                                {hotspot && (
                                    <div style={{ marginTop: "8px", fontSize: "12px" }}>
                                        <div style={{ marginBottom: "4px" }}>
                                            <span style={{ color: "#666" }}>Demand Score: </span>
                                            <strong style={{ color: getHeatColor(demandScore) }}>
                                                {demandScore}
                                            </strong>
                                        </div>
                                        <div style={{ marginBottom: "4px" }}>
                                            <span style={{ color: "#666" }}>Waste Signals: </span>
                                            {hotspot.wasteSignalCount}
                                        </div>
                                        <div style={{ marginBottom: "4px" }}>
                                            <span style={{ color: "#666" }}>Unresolved: </span>
                                            {hotspot.unresolvedCount}
                                        </div>
                                        <div style={{ marginBottom: "4px" }}>
                                            <span style={{ color: "#666" }}>Avg Severity: </span>
                                            {hotspot.avgSeverity}
                                        </div>
                                        <div>
                                            <span style={{ color: "#666" }}>Days Since Collection: </span>
                                            {hotspot.daysSinceCollection}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Popup>
                    </Polygon>
                );
            })}

            {/* Render waste signals as markers */}
            {showSignals &&
                signals
                    .filter((s) => s.category === "waste")
                    .map((signal) => (
                        <Marker
                            key={signal.id}
                            position={[signal.lat, signal.lng]}
                        >
                            <Popup>
                                <div style={{ fontSize: "12px" }}>
                                    <strong>Waste Report</strong>
                                    <div style={{ marginTop: "4px" }}>
                                        Severity: {signal.severity}/5
                                    </div>
                                    <div>Status: {signal.status}</div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
        </MapContainer>
    );
}

/**
 * Legend component for the heat map
 */
export function HotspotLegend() {
    const levels = [
        { label: "Critical (40+)", color: "#dc2626" },
        { label: "High (25-39)", color: "#ea580c" },
        { label: "Medium (12-24)", color: "#ca8a04" },
        { label: "Low (5-11)", color: "#65a30d" },
        { label: "Minimal (<5)", color: "#16a34a" },
    ];

    return (
        <div
            style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                padding: "0.5rem 0",
            }}
        >
            {levels.map((level) => (
                <div
                    key={level.label}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        fontSize: theme.typography.sizes.xs,
                    }}
                >
                    <div
                        style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "2px",
                            backgroundColor: level.color,
                            opacity: 0.7,
                        }}
                    />
                    <span style={{ color: theme.colors.text.secondary }}>{level.label}</span>
                </div>
            ))}
        </div>
    );
}
