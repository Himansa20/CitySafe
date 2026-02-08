import { useState, useEffect, useMemo } from "react";
import {
    MapContainer,
    TileLayer,
    Polyline,
    Marker,
    useMapEvents,
    Popup,
    CircleMarker,
} from "react-leaflet";
import { theme } from "../theme";
import { useAuth } from "../services/useAuth";
import {
    addAdminRoute,
    deleteAdminRoute,
    subscribeAdminRoutes,
    type AdminRouteSegment,
    type AdminRouteType,
} from "../services/adminRoutes";
import { subscribeSignalsV2 } from "../services/signals";
import type { Signal } from "../types/signal";
import L from "leaflet";

const COLOMBO_CENTER: [number, number] = [6.9271, 79.8612];

// Safety rating options
const SAFETY_RATINGS = [
    { value: 1, label: "⭐ Very Dangerous", color: "#dc2626" },
    { value: 2, label: "⭐⭐ Dangerous", color: "#ea580c" },
    { value: 3, label: "⭐⭐⭐ Moderate", color: "#f59e0b" },
    { value: 4, label: "⭐⭐⭐⭐ Safe", color: "#84cc16" },
    { value: 5, label: "⭐⭐⭐⭐⭐ Very Safe", color: "#22c55e" },
];

function DrawingMap({
    isDrawing,
    isAIMode,
    currentPoints,
    aiStartPoint,
    aiEndPoint,
    onMapClick,
    onAIPointClick,
}: {
    isDrawing: boolean;
    isAIMode: boolean;
    currentPoints: { lat: number; lng: number }[];
    aiStartPoint: { lat: number; lng: number } | null;
    aiEndPoint: { lat: number; lng: number } | null;
    onMapClick: (latlng: { lat: number; lng: number }) => void;
    onAIPointClick: (latlng: { lat: number; lng: number }) => void;
}) {
    useMapEvents({
        click: (e) => {
            if (isDrawing) {
                onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
            } else if (isAIMode) {
                onAIPointClick({ lat: e.latlng.lat, lng: e.latlng.lng });
            }
        },
    });

    return (
        <>
            {/* Regular drawing mode */}
            {currentPoints.length > 0 && (
                <>
                    <Polyline
                        positions={currentPoints}
                        pathOptions={{ color: "#6366f1", dashArray: "8, 12", weight: 5 }}
                    />
                    {currentPoints.map((p, i) => (
                        <Marker
                            key={i}
                            position={[p.lat, p.lng]}
                            icon={i === 0
                                ? createLabelIcon("A", "#22c55e")
                                : i === currentPoints.length - 1
                                    ? createLabelIcon("B", "#ef4444")
                                    : createDotIcon("#6366f1")
                            }
                        />
                    ))}
                </>
            )}
            {/* AI mode start/end markers */}
            {aiStartPoint && (
                <Marker
                    position={[aiStartPoint.lat, aiStartPoint.lng]}
                    icon={createLabelIcon("A", "#3b82f6")}
                />
            )}
            {aiEndPoint && (
                <Marker
                    position={[aiEndPoint.lat, aiEndPoint.lng]}
                    icon={createLabelIcon("B", "#8b5cf6")}
                />
            )}
        </>
    );
}

function createDotIcon(color: string) {
    return new L.DivIcon({
        className: "custom-dot",
        html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
    });
}

function createLabelIcon(label: string, color: string) {
    return new L.DivIcon({
        className: "custom-label",
        html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:14px;">${label}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    });
}

type FilterType = "all" | "safe" | "unsafe";

export default function NightSafetyAdmin() {
    const { user } = useAuth();
    const [routes, setRoutes] = useState<AdminRouteSegment[]>([]);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPoints, setCurrentPoints] = useState<{ lat: number; lng: number }[]>([]);

    // Filter state
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [showDangerHeatmap, setShowDangerHeatmap] = useState(true);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState<AdminRouteType>("safe");
    const [safetyRating, setSafetyRating] = useState(3);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // AI Route Finder state
    const [isAIMode, setIsAIMode] = useState(false);
    const [aiStartPoint, setAiStartPoint] = useState<{ lat: number; lng: number } | null>(null);
    const [aiEndPoint, setAiEndPoint] = useState<{ lat: number; lng: number } | null>(null);
    const [aiSuggestedRoute, setAiSuggestedRoute] = useState<{ lat: number; lng: number }[] | null>(null);
    const [aiFinding, setAiFinding] = useState(false);

    // Subscribe to routes
    useEffect(() => {
        const unsub = subscribeAdminRoutes(setRoutes);
        return () => unsub();
    }, []);

    // Subscribe to safety-related signals for heatmap
    useEffect(() => {
        const unsub = subscribeSignalsV2(
            { categories: ["safety"], timeWindow: "30d", status: "all" },
            setSignals,
            (err) => console.error("Failed to load signals for heatmap:", err)
        );
        return () => unsub();
    }, []);

    // Filter routes based on selected filter
    const filteredRoutes = useMemo(() => {
        if (filterType === "all") return routes;
        return routes.filter(r => r.type === filterType);
    }, [routes, filterType]);

    // Group signals by proximity for heatmap
    const dangerZones = useMemo(() => {
        const zones: { lat: number; lng: number; count: number; severity: number }[] = [];
        const gridSize = 0.005; // ~500m grid
        const grid: Record<string, { signals: Signal[]; lat: number; lng: number }> = {};

        signals.forEach(s => {
            const key = `${Math.floor(s.lat / gridSize)}_${Math.floor(s.lng / gridSize)}`;
            if (!grid[key]) {
                grid[key] = { signals: [], lat: s.lat, lng: s.lng };
            }
            grid[key].signals.push(s);
        });

        Object.values(grid).forEach(cell => {
            const avgSeverity = cell.signals.reduce((sum, s) => sum + s.severity, 0) / cell.signals.length;
            zones.push({
                lat: cell.signals.reduce((sum, s) => sum + s.lat, 0) / cell.signals.length,
                lng: cell.signals.reduce((sum, s) => sum + s.lng, 0) / cell.signals.length,
                count: cell.signals.length,
                severity: avgSeverity,
            });
        });

        return zones;
    }, [signals]);

    const handleMapClick = (latlng: { lat: number; lng: number }) => {
        setCurrentPoints((prev) => [...prev, latlng]);
    };

    const handleSave = async () => {
        if (!user || currentPoints.length < 2 || !name) {
            setError("Please draw at least 2 points and enter a name.");
            return;
        }

        setSaving(true);
        setError(null);
        try {
            // Include safety rating in description
            const fullDescription = `${description}\n[Safety Rating: ${safetyRating}/5]`.trim();
            await addAdminRoute(type, name, currentPoints, user.uid, fullDescription);
            // Reset
            setCurrentPoints([]);
            setIsDrawing(false);
            setName("");
            setDescription("");
            setSafetyRating(3);
        } catch (err) {
            console.error(err);
            setError("Failed to save route.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this route?")) {
            try {
                await deleteAdminRoute(id);
            } catch (err) {
                console.error(err);
                alert("Failed to delete route.");
            }
        }
    };

    const handleUndo = () => {
        setCurrentPoints(prev => prev.slice(0, -1));
    };

    // AI Route Finding: Handle point selection
    const handleAIPointClick = (latlng: { lat: number; lng: number }) => {
        if (!aiStartPoint) {
            setAiStartPoint(latlng);
            setAiSuggestedRoute(null);
        } else if (!aiEndPoint) {
            setAiEndPoint(latlng);
        }
    };

    // AI Route Finding: Calculate safe path avoiding danger zones
    const findSafePath = () => {
        if (!aiStartPoint || !aiEndPoint) return;

        setAiFinding(true);

        // Simulate AI processing delay
        setTimeout(() => {
            const start = aiStartPoint;
            const end = aiEndPoint;

            // Generate intermediate waypoints that avoid danger zones
            const waypoints: { lat: number; lng: number }[] = [start];

            // Calculate direction vector
            const deltaLat = end.lat - start.lat;
            const deltaLng = end.lng - start.lng;
            const distance = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng);

            // Number of waypoints based on distance
            const numWaypoints = Math.max(3, Math.floor(distance / 0.005));

            for (let i = 1; i < numWaypoints; i++) {
                const t = i / numWaypoints;
                let candidateLat = start.lat + deltaLat * t;
                let candidateLng = start.lng + deltaLng * t;

                // Check if this point is near a danger zone and adjust
                let adjustedLat = candidateLat;
                let adjustedLng = candidateLng;
                let maxPush = 0;

                dangerZones.forEach(zone => {
                    const distToZone = Math.sqrt(
                        Math.pow(candidateLat - zone.lat, 2) +
                        Math.pow(candidateLng - zone.lng, 2)
                    );

                    const dangerRadius = 0.008 * (zone.count > 3 ? 1.5 : 1); // Larger radius for more dangerous zones

                    if (distToZone < dangerRadius) {
                        // Push the waypoint away from danger zone
                        const pushStrength = (dangerRadius - distToZone) * 2;

                        if (pushStrength > maxPush) {
                            maxPush = pushStrength;

                            // Calculate perpendicular direction to push (unused but kept for future)
                            // const perpLat = -(end.lng - start.lng);
                            // const perpLng = end.lat - start.lat;

                            // Push away from the danger zone
                            const awayLat = candidateLat - zone.lat;
                            const awayLng = candidateLng - zone.lng;
                            const awayLen = Math.sqrt(awayLat * awayLat + awayLng * awayLng) || 0.001;

                            adjustedLat = candidateLat + (awayLat / awayLen) * pushStrength;
                            adjustedLng = candidateLng + (awayLng / awayLen) * pushStrength;
                        }
                    }
                });

                waypoints.push({ lat: adjustedLat, lng: adjustedLng });
            }

            waypoints.push(end);

            // Smooth the path
            const smoothed: { lat: number; lng: number }[] = [waypoints[0]];
            for (let i = 1; i < waypoints.length - 1; i++) {
                smoothed.push({
                    lat: (waypoints[i - 1].lat + waypoints[i].lat * 2 + waypoints[i + 1].lat) / 4,
                    lng: (waypoints[i - 1].lng + waypoints[i].lng * 2 + waypoints[i + 1].lng) / 4,
                });
            }
            smoothed.push(waypoints[waypoints.length - 1]);

            setAiSuggestedRoute(smoothed);
            setAiFinding(false);
        }, 800);
    };

    // AI Route Finding: Reset
    const resetAIMode = () => {
        setAiStartPoint(null);
        setAiEndPoint(null);
        setAiSuggestedRoute(null);
        setIsAIMode(false);
    };

    // AI Route Finding: Save the suggested route
    const saveAISuggestedRoute = async () => {
        if (!user || !aiSuggestedRoute || aiSuggestedRoute.length < 2) return;

        setSaving(true);
        try {
            await addAdminRoute(
                "safe",
                `AI Safe Route ${new Date().toLocaleDateString()}`,
                aiSuggestedRoute,
                user.uid,
                "AI-generated safe route avoiding danger zones. [Safety Rating: 4/5]"
            );
            resetAIMode();
        } catch (err) {
            console.error(err);
            setError("Failed to save AI route.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={theme.layout.pageContainer}>
            {/* Header */}
            <div style={{
                background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
                padding: "2rem",
                marginBottom: "1.5rem",
                borderRadius: theme.rounded.xl,
                color: "white",
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h1 style={{ fontSize: theme.typography.sizes["2xl"], fontWeight: 800, margin: 0 }}>
                            🛡️ Night Safety Route Manager
                        </h1>
                        <p style={{ color: "rgba(255,255,255,0.7)", margin: "0.5rem 0 0 0" }}>
                            Draw safe corridors and mark danger zones to guide citizens at night
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                        <div style={{
                            backgroundColor: "rgba(255,255,255,0.1)",
                            padding: "0.75rem 1rem",
                            borderRadius: theme.rounded.lg,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                        }}>
                            <span style={{ fontSize: theme.typography.sizes.sm }}>🟢 {routes.filter(r => r.type === "safe").length} Safe</span>
                            <span style={{ color: "rgba(255,255,255,0.5)" }}>|</span>
                            <span style={{ fontSize: theme.typography.sizes.sm }}>🔴 {routes.filter(r => r.type === "unsafe").length} Danger</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "1.5rem", minHeight: "650px" }}>

                {/* Sidebar Controls */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                    {/* Editor Card */}
                    <div style={{ ...theme.card, padding: "1.5rem" }}>
                        <h3 style={{ fontSize: theme.typography.sizes.lg, fontWeight: 700, margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {isDrawing ? "✏️ Drawing Route..." : "➕ Add New Route"}
                        </h3>

                        {!isDrawing ? (
                            <button
                                onClick={() => setIsDrawing(true)}
                                style={{
                                    ...theme.button.base,
                                    ...theme.button.primary,
                                    width: "100%",
                                    padding: "1rem",
                                    fontSize: theme.typography.sizes.base,
                                }}
                            >
                                🗺️ Start Drawing Route
                            </button>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: theme.typography.sizes.xs, fontWeight: 600, marginBottom: "0.25rem" }}>Route Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Main St Safe Corridor"
                                        style={{ ...theme.input, width: "100%" }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: theme.typography.sizes.xs, fontWeight: 600, marginBottom: "0.5rem" }}>Route Type</label>
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        <button
                                            onClick={() => setType("safe")}
                                            style={{
                                                ...theme.button.base,
                                                flex: 1,
                                                padding: "0.75rem",
                                                background: type === "safe" ? "#dcfce7" : "white",
                                                color: type === "safe" ? "#166534" : theme.colors.text.primary,
                                                border: `2px solid ${type === "safe" ? "#22c55e" : theme.colors.border}`,
                                                fontWeight: 700,
                                            }}
                                        >
                                            🟢 Safe Route
                                        </button>
                                        <button
                                            onClick={() => setType("unsafe")}
                                            style={{
                                                ...theme.button.base,
                                                flex: 1,
                                                padding: "0.75rem",
                                                background: type === "unsafe" ? "#fee2e2" : "white",
                                                color: type === "unsafe" ? "#991b1b" : theme.colors.text.primary,
                                                border: `2px solid ${type === "unsafe" ? "#ef4444" : theme.colors.border}`,
                                                fontWeight: 700,
                                            }}
                                        >
                                            🔴 Danger Zone
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: theme.typography.sizes.xs, fontWeight: 600, marginBottom: "0.5rem" }}>
                                        Safety Rating: {SAFETY_RATINGS.find(r => r.value === safetyRating)?.label}
                                    </label>
                                    <input
                                        type="range"
                                        min={1}
                                        max={5}
                                        value={safetyRating}
                                        onChange={(e) => setSafetyRating(Number(e.target.value))}
                                        style={{ width: "100%", accentColor: SAFETY_RATINGS.find(r => r.value === safetyRating)?.color }}
                                    />
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: theme.typography.sizes.xs, color: theme.colors.text.muted }}>
                                        <span>Dangerous</span>
                                        <span>Very Safe</span>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: theme.typography.sizes.xs, fontWeight: 600, marginBottom: "0.25rem" }}>Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Why is this route marked? Any tips?"
                                        style={{ ...theme.input, width: "100%", minHeight: "60px" }}
                                    />
                                </div>

                                {/* Point counter and undo */}
                                <div style={{
                                    backgroundColor: theme.colors.surfaceHover,
                                    padding: "1rem",
                                    borderRadius: theme.rounded.md,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: theme.colors.primary }}>{currentPoints.length} points</div>
                                        <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.muted }}>
                                            {currentPoints.length < 2 ? "Click map to add points" : "A→B route ready"}
                                        </div>
                                    </div>
                                    {currentPoints.length > 0 && (
                                        <button
                                            onClick={handleUndo}
                                            style={{
                                                ...theme.button.base,
                                                ...theme.button.ghost,
                                                padding: "0.5rem 1rem",
                                                fontSize: theme.typography.sizes.xs,
                                            }}
                                        >
                                            ↩️ Undo
                                        </button>
                                    )}
                                </div>

                                {error && <div style={{ color: theme.colors.status.danger, fontSize: theme.typography.sizes.sm }}>{error}</div>}

                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving || currentPoints.length < 2}
                                        style={{
                                            ...theme.button.base,
                                            ...theme.button.success,
                                            flex: 1,
                                            padding: "0.75rem",
                                            opacity: saving || currentPoints.length < 2 ? 0.5 : 1,
                                        }}
                                    >
                                        {saving ? "Saving..." : "✓ Save Route"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsDrawing(false);
                                            setCurrentPoints([]);
                                        }}
                                        style={{
                                            ...theme.button.base,
                                            ...theme.button.ghost,
                                            padding: "0.75rem",
                                        }}
                                    >
                                        ✕ Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* AI Route Finder Card */}
                    <div style={{
                        ...theme.card,
                        padding: "1.5rem",
                        background: "linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)",
                        color: "white"
                    }}>
                        <h3 style={{
                            fontSize: theme.typography.sizes.lg,
                            fontWeight: 700,
                            margin: "0 0 1rem 0",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                        }}>
                            🤖 AI Safe Route Finder
                        </h3>

                        {!isAIMode ? (
                            <div>
                                <p style={{ fontSize: theme.typography.sizes.sm, marginBottom: "1rem", opacity: 0.9 }}>
                                    Select two points on the map and AI will find the safest path avoiding danger zones.
                                </p>
                                <button
                                    onClick={() => {
                                        setIsAIMode(true);
                                        setIsDrawing(false);
                                        setCurrentPoints([]);
                                    }}
                                    disabled={isDrawing}
                                    style={{
                                        ...theme.button.base,
                                        width: "100%",
                                        padding: "0.875rem",
                                        fontSize: theme.typography.sizes.base,
                                        backgroundColor: "rgba(255,255,255,0.2)",
                                        color: "white",
                                        border: "1px solid rgba(255,255,255,0.3)",
                                        opacity: isDrawing ? 0.5 : 1,
                                    }}
                                >
                                    🎯 Start AI Path Finding
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <div style={{
                                    backgroundColor: "rgba(255,255,255,0.15)",
                                    padding: "0.75rem",
                                    borderRadius: theme.rounded.md
                                }}>
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        marginBottom: "0.5rem"
                                    }}>
                                        <span style={{
                                            width: "24px",
                                            height: "24px",
                                            backgroundColor: aiStartPoint ? "#22c55e" : "rgba(255,255,255,0.3)",
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: 700,
                                            fontSize: "12px"
                                        }}>A</span>
                                        <span style={{ fontSize: theme.typography.sizes.sm }}>
                                            {aiStartPoint ? `${aiStartPoint.lat.toFixed(4)}, ${aiStartPoint.lng.toFixed(4)}` : "Click map for start point"}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        <span style={{
                                            width: "24px",
                                            height: "24px",
                                            backgroundColor: aiEndPoint ? "#8b5cf6" : "rgba(255,255,255,0.3)",
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: 700,
                                            fontSize: "12px"
                                        }}>B</span>
                                        <span style={{ fontSize: theme.typography.sizes.sm }}>
                                            {aiEndPoint ? `${aiEndPoint.lat.toFixed(4)}, ${aiEndPoint.lng.toFixed(4)}` : "Click map for end point"}
                                        </span>
                                    </div>
                                </div>

                                {aiStartPoint && aiEndPoint && !aiSuggestedRoute && (
                                    <button
                                        onClick={findSafePath}
                                        disabled={aiFinding}
                                        style={{
                                            ...theme.button.base,
                                            width: "100%",
                                            padding: "0.875rem",
                                            backgroundColor: aiFinding ? "rgba(255,255,255,0.3)" : "#22c55e",
                                            color: "white",
                                            border: "none",
                                        }}
                                    >
                                        {aiFinding ? "🔄 Finding safe path..." : "✨ Find Safest Route"}
                                    </button>
                                )}

                                {aiSuggestedRoute && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        <div style={{
                                            backgroundColor: "rgba(34, 197, 94, 0.3)",
                                            padding: "0.75rem",
                                            borderRadius: theme.rounded.md,
                                            textAlign: "center"
                                        }}>
                                            ✅ Safe route found! ({aiSuggestedRoute.length} waypoints)
                                        </div>
                                        <button
                                            onClick={saveAISuggestedRoute}
                                            disabled={saving}
                                            style={{
                                                ...theme.button.base,
                                                width: "100%",
                                                padding: "0.75rem",
                                                backgroundColor: "#22c55e",
                                                color: "white",
                                                border: "none",
                                                opacity: saving ? 0.5 : 1,
                                            }}
                                        >
                                            {saving ? "Saving..." : "💾 Save as Safe Route"}
                                        </button>
                                    </div>
                                )}

                                <button
                                    onClick={resetAIMode}
                                    style={{
                                        ...theme.button.base,
                                        width: "100%",
                                        padding: "0.5rem",
                                        backgroundColor: "transparent",
                                        color: "white",
                                        border: "1px solid rgba(255,255,255,0.4)",
                                        fontSize: theme.typography.sizes.sm,
                                    }}
                                >
                                    ✕ Exit AI Mode
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Filter Card */}
                    <div style={{ ...theme.card, padding: "1rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                            <span style={{ fontWeight: 700, fontSize: theme.typography.sizes.sm }}>🔍 Filter Routes</span>
                            <span style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.muted }}>{filteredRoutes.length} shown</span>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            {[
                                { value: "all", label: "All", icon: "📋" },
                                { value: "safe", label: "Safe", icon: "🟢" },
                                { value: "unsafe", label: "Danger", icon: "🔴" },
                            ].map(f => (
                                <button
                                    key={f.value}
                                    onClick={() => setFilterType(f.value as FilterType)}
                                    style={{
                                        ...theme.button.base,
                                        flex: 1,
                                        padding: "0.5rem",
                                        fontSize: theme.typography.sizes.xs,
                                        backgroundColor: filterType === f.value ? theme.colors.primary : "white",
                                        color: filterType === f.value ? "white" : theme.colors.text.primary,
                                        border: `1px solid ${filterType === f.value ? theme.colors.primary : theme.colors.border}`,
                                    }}
                                >
                                    {f.icon} {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Routes List Card */}
                    <div style={{ ...theme.card, padding: "1rem", flex: 1, overflowY: "auto", maxHeight: "300px" }}>
                        <h3 style={{ fontSize: theme.typography.sizes.sm, fontWeight: 700, margin: "0 0 0.75rem 0" }}>
                            📋 Routes ({filteredRoutes.length})
                        </h3>

                        {filteredRoutes.length === 0 ? (
                            <div style={{ color: theme.colors.text.secondary, fontStyle: "italic", fontSize: theme.typography.sizes.sm, textAlign: "center", padding: "1rem" }}>
                                No routes to show
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                {filteredRoutes.map((route) => (
                                    <div key={route.id} style={{
                                        padding: "0.75rem",
                                        border: `1px solid ${theme.colors.border}`,
                                        borderRadius: theme.rounded.md,
                                        borderLeft: `4px solid ${route.type === "safe" ? "#22c55e" : "#ef4444"}`,
                                        backgroundColor: "white",
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: theme.typography.sizes.sm }}>{route.name}</div>
                                                <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.muted, marginTop: "2px" }}>
                                                    {route.points.length} points • A→B • {route.type.toUpperCase()}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(route.id)}
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    color: theme.colors.text.muted,
                                                    padding: "4px",
                                                    fontSize: "0.9rem",
                                                }}
                                                title="Delete route"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Map */}
                <div style={{ ...theme.card, padding: 0, overflow: "hidden", position: "relative" }}>
                    {/* Map Controls Bar */}
                    <div style={{
                        padding: "0.75rem 1rem",
                        borderBottom: `1px solid ${theme.colors.border}`,
                        backgroundColor: "#f8fafc",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}>
                        <span style={{ fontWeight: 700, fontSize: theme.typography.sizes.sm }}>🗺️ Route Map</span>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: theme.typography.sizes.sm }}>
                            <input
                                type="checkbox"
                                checked={showDangerHeatmap}
                                onChange={(e) => setShowDangerHeatmap(e.target.checked)}
                            />
                            🔥 Show Danger Heatmap
                        </label>
                    </div>

                    <div style={{ height: "calc(100% - 45px)" }}>
                        <MapContainer center={COLOMBO_CENTER} zoom={13} style={{ height: "100%", width: "100%", cursor: isDrawing ? "crosshair" : "grab" }}>
                            <TileLayer
                                attribution="&copy; OpenStreetMap contributors"
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            {/* Danger Heatmap from Safety Signals */}
                            {showDangerHeatmap && dangerZones.map((zone, i) => {
                                const intensity = Math.min(1, (zone.count * zone.severity) / 15);
                                const radius = Math.min(50, Math.max(15, zone.count * 8 + zone.severity * 5));
                                return (
                                    <CircleMarker
                                        key={`danger-${i}`}
                                        center={[zone.lat, zone.lng]}
                                        radius={radius}
                                        pathOptions={{
                                            color: "transparent",
                                            fillColor: intensity > 0.6 ? "#ef4444" : intensity > 0.3 ? "#f97316" : "#fbbf24",
                                            fillOpacity: Math.min(0.6, 0.2 + intensity * 0.4),
                                            weight: 0,
                                        }}
                                    >
                                        <Popup>
                                            <div style={{ fontWeight: 700 }}>⚠️ Danger Zone</div>
                                            <div style={{ fontSize: "12px" }}>{zone.count} safety reports</div>
                                            <div style={{ fontSize: "12px" }}>Avg Severity: {zone.severity.toFixed(1)}/5</div>
                                        </Popup>
                                    </CircleMarker>
                                );
                            })}

                            <DrawingMap
                                isDrawing={isDrawing}
                                isAIMode={isAIMode}
                                currentPoints={currentPoints}
                                aiStartPoint={aiStartPoint}
                                aiEndPoint={aiEndPoint}
                                onMapClick={handleMapClick}
                                onAIPointClick={handleAIPointClick}
                            />

                            {/* AI Suggested Route */}
                            {aiSuggestedRoute && (
                                <Polyline
                                    positions={aiSuggestedRoute}
                                    pathOptions={{
                                        color: "#3b82f6",
                                        weight: 6,
                                        opacity: 0.9,
                                        dashArray: "10, 5",
                                    }}
                                />
                            )}

                            {/* Existing Routes */}
                            {filteredRoutes.map((route) => (
                                <div key={route.id}>
                                    <Polyline
                                        positions={route.points}
                                        pathOptions={{
                                            color: route.type === "safe" ? "#22c55e" : "#ef4444",
                                            weight: 6,
                                            opacity: 0.8,
                                        }}
                                    />
                                    {/* Start Point (A) */}
                                    <Marker position={route.points[0]} icon={createLabelIcon("A", route.type === "safe" ? "#22c55e" : "#ef4444")}>
                                        <Popup>
                                            <strong>Start: {route.name}</strong><br />
                                            {route.type.toUpperCase()}
                                        </Popup>
                                    </Marker>
                                    {/* End Point (B) */}
                                    {route.points.length > 1 && (
                                        <Marker position={route.points[route.points.length - 1]} icon={createLabelIcon("B", route.type === "safe" ? "#16a34a" : "#dc2626")}>
                                            <Popup>
                                                <strong>End: {route.name}</strong><br />
                                                {route.points.length} waypoints
                                            </Popup>
                                        </Marker>
                                    )}
                                </div>
                            ))}
                        </MapContainer>
                    </div>

                    {/* Floating Legend */}
                    <div style={{
                        position: "absolute",
                        bottom: "1rem",
                        left: "1rem",
                        backgroundColor: "rgba(255,255,255,0.95)",
                        backdropFilter: "blur(8px)",
                        padding: "1rem",
                        borderRadius: theme.rounded.lg,
                        boxShadow: theme.shadows.lg,
                        zIndex: 1000,
                        minWidth: "160px",
                    }}>
                        <div style={{ fontWeight: 700, fontSize: theme.typography.sizes.sm, marginBottom: "0.75rem" }}>
                            📍 Map Legend
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <div style={{ width: "24px", height: "4px", backgroundColor: "#22c55e", borderRadius: "2px" }} />
                                <span style={{ fontSize: theme.typography.sizes.xs }}>Safe Route</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <div style={{ width: "24px", height: "4px", backgroundColor: "#ef4444", borderRadius: "2px" }} />
                                <span style={{ fontSize: theme.typography.sizes.xs }}>Danger Zone</span>
                            </div>
                            <div style={{ height: "1px", backgroundColor: theme.colors.border, margin: "0.25rem 0" }} />
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#ef4444", opacity: 0.5 }} />
                                <span style={{ fontSize: theme.typography.sizes.xs }}>High Danger Area</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#fbbf24", opacity: 0.4 }} />
                                <span style={{ fontSize: theme.typography.sizes.xs }}>Moderate Risk</span>
                            </div>
                            <div style={{ height: "1px", backgroundColor: theme.colors.border, margin: "0.25rem 0" }} />
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "10px", fontWeight: 700 }}>A</div>
                                <span style={{ fontSize: theme.typography.sizes.xs }}>Start Point</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "10px", fontWeight: 700 }}>B</div>
                                <span style={{ fontSize: theme.typography.sizes.xs }}>End Point</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
