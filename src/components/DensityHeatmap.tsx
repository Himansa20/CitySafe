
import { useMemo } from "react";
import { Rectangle, useMap } from "react-leaflet";
import type { Signal } from "../types/signal";
import type { LatLngBounds } from "leaflet";

type Props = {
    signals: Signal[];
    gridSize?: number; // degrees, approx 0.005 is ~500m
};

function getSeverityWeight(signal: Signal): number {
    // Higher weight for recent or high-severity signals
    return (signal.severity || 1) * (signal.status === 'new' ? 1.5 : 1);
}

export default function DensityHeatmap({ signals, gridSize = 0.002 }: Props) {
    const map = useMap();

    const grid = useMemo(() => {
        if (signals.length === 0) return [];

        const bounds = map.getBounds();
        const cells: Record<string, { bounds: [[number, number], [number, number]]; weight: number }> = {};

        // Expand bounds slightly
        const minLat = bounds.getSouth() - gridSize;
        const maxLat = bounds.getNorth() + gridSize;
        const minLng = bounds.getWest() - gridSize;
        const maxLng = bounds.getEast() + gridSize;

        // Iterate signals and assign to grid cells
        signals.forEach(s => {
            // Snap to grid
            const latIdx = Math.floor(s.lat / gridSize);
            const lngIdx = Math.floor(s.lng / gridSize);
            const key = `${latIdx},${lngIdx}`;

            if (!cells[key]) {
                const cellLat = latIdx * gridSize;
                const cellLng = lngIdx * gridSize;
                cells[key] = {
                    bounds: [[cellLat, cellLng], [cellLat + gridSize, cellLng + gridSize]],
                    weight: 0
                };
            }
            cells[key].weight += getSeverityWeight(s);
        });

        // Normalize weights
        const maxWeight = Math.max(...Object.values(cells).map(c => c.weight), 1);

        return Object.values(cells).map(cell => ({
            ...cell,
            intensity: cell.weight / maxWeight
        }));
    }, [signals, map, gridSize]);

    return (
        <>
            {grid.map((cell, i) => (
                <Rectangle
                    key={i}
                    bounds={cell.bounds}
                    pathOptions={{
                        color: 'transparent',
                        fillColor: getColor(cell.intensity),
                        fillOpacity: 0.4 + (cell.intensity * 0.4), // 0.4 to 0.8
                        weight: 0
                    }}
                />
            ))}
        </>
    );
}

function getColor(intensity: number): string {
    if (intensity > 0.8) return "#991b1b"; // Deep Red
    if (intensity > 0.6) return "#ef4444"; // Red
    if (intensity > 0.4) return "#f97316"; // Orange
    if (intensity > 0.2) return "#eab308"; // Yellow
    return "#22c55e"; // Green (low density)
}
