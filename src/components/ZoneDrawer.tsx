import { useEffect, useState } from "react";
import { Polygon, useMapEvents } from "react-leaflet";
import type { LatLng, CollectionZone } from "../types/wasteSchedule";
import { theme } from "../theme";

type Props = {
    existingZones: CollectionZone[];
    isDrawing: boolean;
    onComplete: (polygon: LatLng[]) => void;
    onCancel: () => void;
    selectedZoneId?: string;
    onZoneClick?: (zone: CollectionZone) => void;
};

export default function ZoneDrawer({
    existingZones,
    isDrawing,
    onComplete,
    onCancel,
    selectedZoneId,
    onZoneClick,
}: Props) {
    const [points, setPoints] = useState<LatLng[]>([]);

    // Reset points when drawing mode changes
    useEffect(() => {
        if (!isDrawing) {
            setPoints([]);
        }
    }, [isDrawing]);

    // Handle map clicks for drawing
    useMapEvents({
        click(e) {
            if (!isDrawing) return;
            setPoints((prev) => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]);
        },
    });

    const handleComplete = () => {
        if (points.length >= 3) {
            onComplete(points);
            setPoints([]);
        }
    };

    const handleClear = () => {
        setPoints([]);
    };

    const handleUndo = () => {
        setPoints((prev) => prev.slice(0, -1));
    };

    return (
        <>
            {/* Existing zones */}
            {existingZones.map((zone) => (
                <Polygon
                    key={zone.id}
                    positions={zone.polygon.map((p) => [p.lat, p.lng])}
                    pathOptions={{
                        color: zone.color,
                        fillColor: zone.color,
                        fillOpacity: selectedZoneId === zone.id ? 0.5 : 0.25,
                        weight: selectedZoneId === zone.id ? 3 : 2,
                    }}
                    eventHandlers={{
                        click: () => onZoneClick?.(zone),
                    }}
                />
            ))}

            {/* Currently drawing polygon */}
            {isDrawing && points.length >= 2 && (
                <Polygon
                    positions={points.map((p) => [p.lat, p.lng])}
                    pathOptions={{
                        color: theme.colors.primary,
                        fillColor: theme.colors.primary,
                        fillOpacity: 0.3,
                        weight: 2,
                        dashArray: "5, 5",
                    }}
                />
            )}

            {/* Drawing controls overlay */}
            {isDrawing && (
                <div
                    style={{
                        position: "absolute",
                        bottom: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 1000,
                        display: "flex",
                        gap: "0.5rem",
                        padding: "0.75rem 1rem",
                        backgroundColor: "white",
                        borderRadius: theme.rounded.lg,
                        boxShadow: theme.shadows.lg,
                    }}
                >
                    <span
                        style={{
                            fontSize: theme.typography.sizes.sm,
                            color: theme.colors.text.secondary,
                            alignSelf: "center",
                            marginRight: "0.5rem",
                        }}
                    >
                        {points.length} points
                    </span>

                    <button
                        onClick={handleUndo}
                        disabled={points.length === 0}
                        style={{
                            ...theme.button.base,
                            ...theme.button.secondary,
                            opacity: points.length === 0 ? 0.5 : 1,
                            padding: "0.4rem 0.75rem",
                            fontSize: theme.typography.sizes.sm,
                        }}
                    >
                        Undo
                    </button>

                    <button
                        onClick={handleClear}
                        disabled={points.length === 0}
                        style={{
                            ...theme.button.base,
                            ...theme.button.secondary,
                            opacity: points.length === 0 ? 0.5 : 1,
                            padding: "0.4rem 0.75rem",
                            fontSize: theme.typography.sizes.sm,
                        }}
                    >
                        Clear
                    </button>

                    <button
                        onClick={handleComplete}
                        disabled={points.length < 3}
                        style={{
                            ...theme.button.base,
                            ...theme.button.primary,
                            opacity: points.length < 3 ? 0.5 : 1,
                            padding: "0.4rem 0.75rem",
                            fontSize: theme.typography.sizes.sm,
                        }}
                    >
                        Complete Zone
                    </button>

                    <button
                        onClick={onCancel}
                        style={{
                            ...theme.button.base,
                            ...theme.button.ghost,
                            padding: "0.4rem 0.75rem",
                            fontSize: theme.typography.sizes.sm,
                        }}
                    >
                        Cancel
                    </button>
                </div>
            )}
        </>
    );
}
