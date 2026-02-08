import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap, Rectangle } from "react-leaflet";
import { useGeolocation } from "../services/useGeolocation";
import { subscribeSignalsV2 } from "../services/signals";
import { fetchUrbanInfrastructure, getAreaInsight, type UrbanPOI, type AreaInsight } from "../services/urbanInsights";
import { subscribeAdminSafePlaces, SAFE_PLACE_TYPES, type AdminSafePlace } from "../services/safePlaces";
import type { Signal } from "../types/signal";
import { haversineDistance } from "../utils/geo";
import { theme, CATEGORY_ICONS } from "../theme";
import L from "leaflet";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '../icons';

// Helper components
function DensityHeatmap({ signals }: { signals: Signal[] }) {
    const map = useMap();
    const [grid, setGrid] = useState<any[]>([]);

    useEffect(() => {
        if (!map || signals.length === 0) {
            setGrid([]);
            return;
        }

        // Compute grid
        const gridSize = 0.003; // ~300m
        const cells: Record<string, any> = {};

        signals.forEach(s => {
            const latIdx = Math.floor(s.lat / gridSize);
            const lngIdx = Math.floor(s.lng / gridSize);
            const key = `${latIdx},${lngIdx}`;

            if (!cells[key]) {
                cells[key] = {
                    bounds: [[latIdx * gridSize, lngIdx * gridSize], [(latIdx + 1) * gridSize, (lngIdx + 1) * gridSize]],
                    count: 0,
                    severity: 0,
                    categories: {} as Record<string, number>
                };
            }
            cells[key].count++;
            cells[key].severity += (s.severity || 1);
            cells[key].categories[s.category] = (cells[key].categories[s.category] || 0) + 1;
        });

        const maxSev = Math.max(...Object.values(cells).map((c: any) => c.severity), 1);

        setGrid(Object.values(cells).map((c: any) => ({
            ...c,
            intensity: c.severity / maxSev,
            topCategory: Object.entries(c.categories).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || ""
        })));
    }, [signals, map]);

    return (
        <>
            {grid.map((cell, i) => (
                <Rectangle
                    key={i}
                    bounds={cell.bounds}
                    pathOptions={{
                        stroke: false,
                        fillColor: cell.intensity > 0.6 ? "#dc2626" : cell.intensity > 0.3 ? "#f97316" : "#fbbf24",
                        fillOpacity: 0.25 + (cell.intensity * 0.45)
                    }}
                >
                    <Popup>
                        <strong><FontAwesomeIcon icon={Icons.fire} /> Hotspot</strong><br />
                        {cell.count} reports<br />
                        Top issue: {cell.topCategory?.replace("_", " ")}
                    </Popup>
                </Rectangle>
            ))}
        </>
    );
}

const DEFAULT_CENTER: [number, number] = [6.9271, 79.8612];

export default function MyAreaPage() {
    const geo = useGeolocation(true);

    // Data State
    const [signals, setSignals] = useState<Signal[]>([]);
    const [pois, setPois] = useState<UrbanPOI[]>([]);

    // UI State
    const [activeTab, setActiveTab] = useState<"overview" | "heatmap" | "ai">("overview");
    const [aiInsight, setAiInsight] = useState<AreaInsight | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    // Safe Places State
    const [showSafePlacesModal, setShowSafePlacesModal] = useState(false);
    const [safePlaces, setSafePlaces] = useState<AdminSafePlace[]>([]);
    const [safePlacesLoading, setSafePlacesLoading] = useState(false);

    // Computed
    const userLat = geo.lat ?? DEFAULT_CENTER[0];
    const userLng = geo.lng ?? DEFAULT_CENTER[1];

    useEffect(() => {
        const unsub = subscribeSignalsV2(
            { categories: [], timeWindow: "30d", status: "all" },
            (data) => {
                setSignals(data);
            },
            (err) => console.error(err)
        );
        return () => unsub();
    }, []);

    // Subscribe to admin safe places
    useEffect(() => {
        setSafePlacesLoading(true);
        const unsub = subscribeAdminSafePlaces(
            (places) => {
                setSafePlaces(places);
                setSafePlacesLoading(false);
            },
            (err) => {
                console.error("Error loading safe places:", err);
                setSafePlacesLoading(false);
            }
        );
        return () => unsub();
    }, []);

    // Calculate nearby signals 
    const nearbySignals = useMemo(() => {
        return signals.filter(s =>
            haversineDistance(userLat, userLng, s.lat, s.lng) <= 1000
        );
    }, [signals, userLat, userLng]);

    // Calculate nearby safe places with distance
    const nearbySafePlaces = useMemo(() => {
        return safePlaces
            .map(place => ({
                ...place,
                distance: Math.round(haversineDistance(userLat, userLng, place.lat, place.lng))
            }))
            .sort((a, b) => a.distance - b.distance);
    }, [safePlaces, userLat, userLng]);

    // Overview Stats
    const stats = useMemo(() => {
        const categoryCount: Record<string, number> = {};
        let openCount = 0;
        let resolvedCount = 0;
        let highPriorityCount = 0;
        let totalSeverity = 0;

        nearbySignals.forEach(s => {
            categoryCount[s.category] = (categoryCount[s.category] || 0) + 1;
            if (s.status === "resolved") resolvedCount++;
            else openCount++;
            if (s.severity >= 4) highPriorityCount++;
            totalSeverity += s.severity;
        });

        const topCategories = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

        return {
            total: nearbySignals.length,
            open: openCount,
            resolved: resolvedCount,
            highPriority: highPriorityCount,
            avgSeverity: nearbySignals.length ? (totalSeverity / nearbySignals.length).toFixed(1) : "0",
            topCategories,
            resolutionRate: nearbySignals.length ? Math.round((resolvedCount / nearbySignals.length) * 100) : 0
        };
    }, [nearbySignals]);

    // Heatmap Stats
    const heatmapStats = useMemo(() => {
        const gridSize = 0.003;
        const cells: Record<string, number> = {};

        signals.forEach(s => {
            const key = `${Math.floor(s.lat / gridSize)},${Math.floor(s.lng / gridSize)}`;
            cells[key] = (cells[key] || 0) + 1;
        });

        const cellCounts = Object.values(cells);
        const hotspotCount = cellCounts.filter(c => c >= 3).length;
        const maxDensity = Math.max(...cellCounts, 0);

        return { hotspotCount, maxDensity, totalCells: cellCounts.length };
    }, [signals]);

    // AI Analyst Function
    const handleAnalyzeArea = async () => {
        setAiLoading(true);
        setAiError(null);
        try {
            // 1. Fetch Context (POIs)
            const nearbyPOIs = await fetchUrbanInfrastructure(userLat, userLng, 1000);
            setPois(nearbyPOIs);

            // 2. Get AI Insight
            const insight = await getAreaInsight(nearbySignals, nearbyPOIs, { lat: userLat, lng: userLng });
            setAiInsight(insight);
        } catch (err) {
            console.error("Analysis failed", err);
            setAiError("Failed to generate insights. Please try again.");
        } finally {
            setAiLoading(false);
        }
    };

    // Generate local fallback insight when AI fails or for immediate results
    const generateLocalInsight = (): AreaInsight => {
        const categoryCount: Record<string, number> = {};
        nearbySignals.forEach(s => {
            categoryCount[s.category] = (categoryCount[s.category] || 0) + 1;
        });

        const topCategory = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])[0];

        const highSeverity = nearbySignals.filter(s => s.severity >= 4).length;
        const priorityLevel = highSeverity > 5 ? "High" : highSeverity > 2 ? "Medium" : "Low";

        const categoryIssues: Record<string, { issue: string; solution: string; missing: string[] }> = {
            safety: {
                issue: "Safety Concerns in Area",
                solution: "Increase street lighting and police patrols. Consider installing CCTV cameras at key intersections.",
                missing: ["Street Lights", "CCTV", "Police Patrol Points"]
            },
            waste: {
                issue: "Waste Management Issues",
                solution: "Deploy additional waste collection bins and increase collection frequency. Consider community clean-up drives.",
                missing: ["Waste Bins", "Recycling Points"]
            },
            transport: {
                issue: "Transportation Infrastructure Gaps",
                solution: "Improve bus stop accessibility and signage. Consider adding pedestrian crossings.",
                missing: ["Bus Shelters", "Pedestrian Crossings"]
            },
            flooding: {
                issue: "Drainage and Flooding Risk",
                solution: "Clear blocked drains and improve stormwater management. Regular maintenance needed.",
                missing: ["Storm Drains", "Flood Barriers"]
            },
            accessibility: {
                issue: "Accessibility Barriers",
                solution: "Install ramps and tactile paving. Ensure public buildings meet accessibility standards.",
                missing: ["Wheelchair Ramps", "Tactile Paving"]
            },
            public_space: {
                issue: "Public Space Maintenance",
                solution: "Regular maintenance of parks and public areas. Add seating and shade structures.",
                missing: ["Park Benches", "Shade Structures", "Public Toilets"]
            }
        };

        const categoryInfo = categoryIssues[topCategory?.[0] || "safety"] || categoryIssues.safety;

        return {
            priorityLevel,
            mainIssue: topCategory ? `${topCategory[1]} reports: ${categoryInfo.issue}` : "No significant issues detected",
            proposedSolution: categoryInfo.solution,
            reasoning: `Based on ${nearbySignals.length} reports within 1km radius, ${topCategory?.[0]?.replace("_", " ")} issues are most prevalent with ${topCategory?.[1] || 0} reports.`,
            missingInfrastructure: categoryInfo.missing
        };
    };

    return (
        <div style={{ position: "relative", height: "calc(100vh - 60px)", width: "100%", overflow: "hidden" }}>

            {/* Map Background */}
            <MapContainer
                center={[userLat, userLng]}
                zoom={14}
                style={{ height: "100%", width: "100%", zIndex: 0 }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* User Location */}
                {(geo.lat && geo.lng) && (
                    <Marker position={[geo.lat, geo.lng]} icon={new L.DivIcon({
                        className: "user-pulse",
                        html: '<div style="width:18px;height:18px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 8px rgba(59,130,246,0.25);"></div>',
                        iconSize: [18, 18]
                    })} />
                )}

                {/* Heatmap Layer */}
                {activeTab === "heatmap" && <DensityHeatmap signals={signals} />}

                {/* Signals Points (Overview Mode) */}
                {activeTab === "overview" && signals.map(s => (
                    <CircleMarker
                        key={s.id}
                        center={[s.lat, s.lng]}
                        radius={7}
                        pathOptions={{
                            color: "white",
                            weight: 2,
                            fillColor: s.status === "resolved" ? "#22c55e" : s.severity >= 4 ? "#ef4444" : "#f59e0b",
                            fillOpacity: 0.85
                        }}
                    >
                        <Popup>
                            <strong><FontAwesomeIcon icon={CATEGORY_ICONS[s.category] || Icons.mapPin} /> {s.category.replace("_", " ")}</strong><br />
                            Severity: {s.severity}/5<br />
                            {s.description?.slice(0, 60)}...
                        </Popup>
                    </CircleMarker>
                ))}

                {/* POIs (AI Mode) */}
                {activeTab === "ai" && pois.map(p => (
                    <Marker
                        key={p.id}
                        position={[p.lat, p.lng]}
                        icon={new L.DivIcon({
                            className: "poi-icon",
                            html: `<div style="background:white;padding:5px;border-radius:6px;border:2px solid #6366f1;font-size:14px;box-shadow:0 2px 4px rgba(0,0,0,0.1);"><i class="fa-solid ${p.type === 'Street Light' ? 'fa-lightbulb' : p.type === 'Police Station' ? 'fa-shield-halved' : p.type === 'Hospital' ? 'fa-hospital' : p.type === 'Bus Stop' ? 'fa-bus' : p.type === 'Waste Bin' ? 'fa-trash' : 'fa-location-dot'}"></i></div>`,
                            iconSize: [28, 28]
                        })}
                    >
                        <Popup>
                            <strong>{p.type}</strong><br />
                            {p.distance}m away
                        </Popup>
                    </Marker>
                ))}

            </MapContainer>

            {/* Floating Control Panel */}
            <div style={{
                position: "absolute",
                top: "20px",
                left: "20px",
                width: "400px",
                maxHeight: "calc(100% - 40px)",
                backgroundColor: "rgba(255, 255, 255, 0.97)",
                backdropFilter: "blur(12px)",
                borderRadius: "20px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden"
            }}>

                {/* Header */}
                <div style={{ padding: "1.5rem", borderBottom: `1px solid ${theme.colors.border}` }}>
                    <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, background: theme.colors.gradients.primary, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        <FontAwesomeIcon icon={Icons.city} /> Urban Insights
                    </h1>
                    <p style={{ margin: "0.25rem 0 0", color: theme.colors.text.secondary, fontSize: "0.875rem" }}>
                        Analyzing {nearbySignals.length} reports within 1km
                    </p>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", padding: "0.75rem", gap: "0.5rem", background: "#f8fafc" }}>
                    {[
                        { id: "overview", icon: Icons.chart, label: "Overview" },
                        { id: "heatmap", icon: Icons.fire, label: "Heatmap" },
                        { id: "ai", icon: Icons.robot, label: "AI Analyst" },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                flex: 1,
                                padding: "0.75rem 0.5rem",
                                borderRadius: "10px",
                                border: "none",
                                background: activeTab === tab.id ? theme.colors.primary : "white",
                                boxShadow: activeTab === tab.id ? theme.shadows.md : "0 1px 2px rgba(0,0,0,0.05)",
                                fontWeight: 700,
                                fontSize: theme.typography.sizes.sm,
                                color: activeTab === tab.id ? "white" : theme.colors.text.secondary,
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            <FontAwesomeIcon icon={(tab as any).icon} /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>

                    {/* Overview Tab */}
                    {activeTab === "overview" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                            {/* Stats Grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
                                <div style={{ padding: "1rem", borderRadius: "12px", background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)", border: "1px solid #bfdbfe" }}>
                                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#1e40af" }}>{stats.total}</div>
                                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#3b82f6" }}>Total Reports</div>
                                </div>
                                <div style={{ padding: "1rem", borderRadius: "12px", background: "linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)", border: "1px solid #fecaca" }}>
                                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#991b1b" }}>{stats.highPriority}</div>
                                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#ef4444" }}>High Priority</div>
                                </div>
                                <div style={{ padding: "1rem", borderRadius: "12px", background: "linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)", border: "1px solid #bbf7d0" }}>
                                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#166534" }}>{stats.resolutionRate}%</div>
                                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#22c55e" }}>Resolved</div>
                                </div>
                                <div style={{ padding: "1rem", borderRadius: "12px", background: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)", border: "1px solid #fde68a" }}>
                                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#92400e" }}>{stats.avgSeverity}</div>
                                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#f59e0b" }}>Avg Severity</div>
                                </div>
                            </div>

                            {/* Category Breakdown */}
                            <div>
                                <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700 }}><FontAwesomeIcon icon={Icons.chartLine} /> Top Issues</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    {stats.topCategories.length === 0 ? (
                                        <div style={{ color: theme.colors.text.muted, fontSize: "0.875rem", padding: "1rem", textAlign: "center" }}>
                                            No reports in your area
                                        </div>
                                    ) : stats.topCategories.map(([cat, count]) => (
                                        <div key={cat} style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.75rem",
                                            padding: "0.75rem",
                                            background: "white",
                                            borderRadius: "10px",
                                            border: `1px solid ${theme.colors.border}`
                                        }}>
                                            <span style={{ fontSize: "1.25rem" }}><FontAwesomeIcon icon={CATEGORY_ICONS[cat] || Icons.mapPin} /></span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: "0.875rem", textTransform: "capitalize" }}>{cat.replace("_", " ")}</div>
                                                <div style={{
                                                    height: "6px",
                                                    backgroundColor: theme.colors.surfaceHover,
                                                    borderRadius: "3px",
                                                    marginTop: "4px",
                                                    overflow: "hidden"
                                                }}>
                                                    <div style={{
                                                        height: "100%",
                                                        width: `${Math.min(100, (count / stats.total) * 100)}%`,
                                                        background: theme.colors.gradients.primary,
                                                        borderRadius: "3px"
                                                    }} />
                                                </div>
                                            </div>
                                            <span style={{ fontWeight: 700, color: theme.colors.primary }}>{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div>
                                <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700 }}><FontAwesomeIcon icon={Icons.clock} /> Recent Activity</h3>
                                {nearbySignals.slice(0, 3).map(s => (
                                    <div key={s.id} style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.75rem",
                                        padding: "0.6rem 0.75rem",
                                        background: "white",
                                        borderRadius: "8px",
                                        border: `1px solid ${theme.colors.border}`,
                                        marginBottom: "0.5rem"
                                    }}>
                                        <div style={{
                                            width: "8px",
                                            height: "8px",
                                            borderRadius: "50%",
                                            backgroundColor: s.status === "resolved" ? "#22c55e" : "#ef4444"
                                        }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: "0.8rem", textTransform: "capitalize" }}>
                                                <FontAwesomeIcon icon={CATEGORY_ICONS[s.category] || Icons.mapPin} /> {s.category.replace("_", " ")}
                                            </div>
                                        </div>
                                        <span style={{
                                            fontSize: "0.7rem",
                                            padding: "2px 8px",
                                            borderRadius: "20px",
                                            backgroundColor: s.status === "resolved" ? "#dcfce7" : "#fee2e2",
                                            color: s.status === "resolved" ? "#166534" : "#991b1b",
                                            fontWeight: 600
                                        }}>
                                            {s.status}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Nearby Safe Places Quick Access */}
                            <div style={{
                                padding: "1rem",
                                borderRadius: "12px",
                                background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                                color: "white"
                            }}>
                                <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <FontAwesomeIcon icon={Icons.hospital} /> Nearby Safe Places
                                    {safePlacesLoading && <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>Loading...</span>}
                                </h3>
                                <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", opacity: 0.9 }}>
                                    {nearbySafePlaces.length} emergency locations nearby
                                </p>
                                <button
                                    onClick={() => setShowSafePlacesModal(true)}
                                    style={{
                                        display: "inline-block",
                                        padding: "0.5rem 1rem",
                                        backgroundColor: "rgba(255,255,255,0.2)",
                                        border: "1px solid rgba(255,255,255,0.4)",
                                        borderRadius: "8px",
                                        color: "white",
                                        textDecoration: "none",
                                        fontWeight: 600,
                                        fontSize: "0.85rem",
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    <FontAwesomeIcon icon={Icons.mapPin} /> View Safe Places ({nearbySafePlaces.length})
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Heatmap Tab */}
                    {activeTab === "heatmap" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                            {/* Heatmap Stats */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                                <div style={{ padding: "1rem", borderRadius: "12px", background: "#fee2e2", textAlign: "center" }}>
                                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#dc2626" }}>{heatmapStats.hotspotCount}</div>
                                    <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#991b1b" }}>Hotspots</div>
                                </div>
                                <div style={{ padding: "1rem", borderRadius: "12px", background: "#fef3c7", textAlign: "center" }}>
                                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#d97706" }}>{heatmapStats.maxDensity}</div>
                                    <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#92400e" }}>Max Density</div>
                                </div>
                                <div style={{ padding: "1rem", borderRadius: "12px", background: "#dbeafe", textAlign: "center" }}>
                                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#2563eb" }}>{heatmapStats.totalCells}</div>
                                    <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#1e40af" }}>Areas</div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div style={{
                                padding: "1.25rem",
                                borderRadius: "12px",
                                background: "white",
                                border: `1px solid ${theme.colors.border}`
                            }}>
                                <h4 style={{ margin: "0 0 1rem", fontWeight: 700, fontSize: "0.9rem" }}><FontAwesomeIcon icon={Icons.thermometer} /> Heat Legend</h4>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                        <div style={{ width: "40px", height: "20px", background: "#dc2626", borderRadius: "4px", opacity: 0.7 }} />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>High Density</div>
                                            <div style={{ fontSize: "0.75rem", color: theme.colors.text.muted }}>5+ reports per area</div>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                        <div style={{ width: "40px", height: "20px", background: "#f97316", borderRadius: "4px", opacity: 0.6 }} />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>Medium Density</div>
                                            <div style={{ fontSize: "0.75rem", color: theme.colors.text.muted }}>3-5 reports per area</div>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                        <div style={{ width: "40px", height: "20px", background: "#fbbf24", borderRadius: "4px", opacity: 0.5 }} />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>Low Density</div>
                                            <div style={{ fontSize: "0.75rem", color: theme.colors.text.muted }}>1-2 reports per area</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Insight */}
                            <div style={{
                                padding: "1rem",
                                borderRadius: "12px",
                                background: "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)",
                                border: "1px solid #c7d2fe"
                            }}>
                                <div style={{ fontWeight: 700, marginBottom: "0.5rem", color: theme.colors.primary }}>
                                    <FontAwesomeIcon icon={Icons.lightbulb} /> Insight
                                </div>
                                <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.5, color: theme.colors.text.secondary }}>
                                    {heatmapStats.hotspotCount > 3
                                        ? `${heatmapStats.hotspotCount} hotspots detected. These areas need priority attention from city services.`
                                        : heatmapStats.hotspotCount > 0
                                            ? `${heatmapStats.hotspotCount} hotspot areas identified. Consider investigating these zones.`
                                            : "No significant hotspots detected. Reports are evenly distributed across the area."}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* AI Analyst Tab */}
                    {activeTab === "ai" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {!aiInsight ? (
                                <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                                    <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}><FontAwesomeIcon icon={Icons.robot} /></div>
                                    <h3 style={{ margin: "0 0 0.5rem", fontWeight: 800 }}>AI Urban Analyst</h3>
                                    <p style={{ color: theme.colors.text.secondary, marginBottom: "1.5rem", fontSize: "0.9rem" }}>
                                        Get AI-powered insights based on local reports and nearby infrastructure.
                                    </p>

                                    {/* Quick Local Analysis */}
                                    <button
                                        onClick={() => setAiInsight(generateLocalInsight())}
                                        style={{
                                            ...theme.button.base,
                                            ...theme.button.secondary,
                                            width: "100%",
                                            marginBottom: "0.75rem",
                                            padding: "0.875rem"
                                        }}
                                    >
                                        <FontAwesomeIcon icon={Icons.bolt} /> Quick Analysis (Local)
                                    </button>

                                    {/* Full AI Analysis */}
                                    <button
                                        onClick={handleAnalyzeArea}
                                        disabled={aiLoading || !geo.lat}
                                        style={{
                                            ...theme.button.base,
                                            ...theme.button.primary,
                                            width: "100%",
                                            opacity: (aiLoading || !geo.lat) ? 0.6 : 1,
                                            padding: "0.875rem"
                                        }}
                                    >
                                        {aiLoading ? "🔄 Analyzing..." : "✨ Full AI Analysis"}
                                    </button>

                                    {!geo.lat && (
                                        <p style={{ color: theme.colors.status.warning, fontSize: "0.75rem", marginTop: "0.75rem" }}>
                                            <FontAwesomeIcon icon={Icons.safety} /> Enable location for better results
                                        </p>
                                    )}
                                    {aiError && (
                                        <p style={{ color: theme.colors.status.danger, fontSize: "0.75rem", marginTop: "0.75rem" }}>
                                            {aiError}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div style={{ animation: "fadeIn 0.3s ease" }}>
                                    {/* Priority Card */}
                                    <div style={{
                                        padding: "1.25rem",
                                        borderRadius: "14px",
                                        background: aiInsight.priorityLevel === "High"
                                            ? "linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)"
                                            : aiInsight.priorityLevel === "Medium"
                                                ? "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)"
                                                : "linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)",
                                        border: `2px solid ${aiInsight.priorityLevel === "High" ? "#ef4444"
                                            : aiInsight.priorityLevel === "Medium" ? "#f59e0b"
                                                : "#22c55e"
                                            }`,
                                        marginBottom: "1rem"
                                    }}>
                                        <div style={{
                                            display: "inline-block",
                                            fontSize: "0.7rem",
                                            fontWeight: 800,
                                            letterSpacing: "1px",
                                            padding: "4px 10px",
                                            borderRadius: "20px",
                                            background: aiInsight.priorityLevel === "High" ? "#ef4444"
                                                : aiInsight.priorityLevel === "Medium" ? "#f59e0b" : "#22c55e",
                                            color: "white",
                                            marginBottom: "0.75rem"
                                        }}>
                                            {aiInsight.priorityLevel.toUpperCase()} PRIORITY
                                        </div>
                                        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", fontWeight: 800 }}>{aiInsight.mainIssue}</h2>
                                        <p style={{ margin: 0, fontSize: "0.85rem", color: theme.colors.text.secondary, lineHeight: 1.5 }}>{aiInsight.reasoning}</p>
                                    </div>

                                    {/* Solution Card */}
                                    <div style={{
                                        padding: "1.25rem",
                                        borderRadius: "14px",
                                        background: "white",
                                        border: `1px solid ${theme.colors.border}`,
                                        boxShadow: theme.shadows.sm
                                    }}>
                                        <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "0 0 0.75rem", fontSize: "1rem" }}>
                                            <FontAwesomeIcon icon={Icons.lightbulb} /> Proposed Solution
                                        </h3>
                                        <p style={{ margin: 0, lineHeight: 1.6, fontSize: "0.9rem" }}>{aiInsight.proposedSolution}</p>

                                        {aiInsight.missingInfrastructure.length > 0 && (
                                            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: `1px dashed ${theme.colors.border}` }}>
                                                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.colors.text.secondary, marginBottom: "0.5rem" }}>RECOMMENDED INFRASTRUCTURE</div>
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                                                    {aiInsight.missingInfrastructure.map(item => (
                                                        <span key={item} style={{
                                                            fontSize: "0.75rem",
                                                            padding: "5px 10px",
                                                            background: "#eef2ff",
                                                            borderRadius: "8px",
                                                            color: theme.colors.primary,
                                                            fontWeight: 600
                                                        }}>
                                                            + {item}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* POI Info */}
                                    {pois.length > 0 && (
                                        <div style={{
                                            marginTop: "1rem",
                                            padding: "1rem",
                                            borderRadius: "12px",
                                            background: theme.colors.surfaceHover,
                                            fontSize: "0.8rem"
                                        }}>
                                            <strong><FontAwesomeIcon icon={Icons.mapPin} /> Found {pois.length} infrastructure points nearby</strong>
                                            <div style={{ color: theme.colors.text.muted, marginTop: "0.25rem" }}>
                                                Shown on map as icons
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => { setAiInsight(null); setPois([]); }}
                                        style={{ ...theme.button.base, ...theme.button.ghost, width: "100%", marginTop: "1rem" }}
                                    >
                                        🔄 New Analysis
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            {/* Safe Places Modal */}
            {showSafePlacesModal && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2000,
                    animation: "fadeIn 0.2s ease"
                }}>
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "20px",
                        width: "90%",
                        maxWidth: "500px",
                        maxHeight: "80vh",
                        overflow: "hidden",
                        boxShadow: "0 25px 50px rgba(0,0,0,0.25)"
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: "1.5rem",
                            background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                            color: "white",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>
                                    <FontAwesomeIcon icon={Icons.shieldHalved} /> Nearby Safe Places
                                </h2>
                                <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", opacity: 0.9 }}>
                                    {nearbySafePlaces.length} locations found
                                </p>
                            </div>
                            <button
                                onClick={() => setShowSafePlacesModal(false)}
                                style={{
                                    background: "rgba(255,255,255,0.2)",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: "36px",
                                    height: "36px",
                                    color: "white",
                                    fontSize: "1.25rem",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: "1rem", maxHeight: "60vh", overflowY: "auto" }}>
                            {safePlacesLoading ? (
                                <div style={{ padding: "2rem", textAlign: "center", color: theme.colors.text.muted }}>
                                    Loading safe places...
                                </div>
                            ) : nearbySafePlaces.length === 0 ? (
                                <div style={{ padding: "2rem", textAlign: "center", color: theme.colors.text.muted }}>
                                    No safe places found. Admin needs to add locations.
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                    {nearbySafePlaces.map((place) => (
                                        <div
                                            key={place.id}
                                            style={{
                                                padding: "1rem",
                                                borderRadius: "12px",
                                                border: `1px solid ${theme.colors.border}`,
                                                backgroundColor: "white",
                                                transition: "all 0.2s"
                                            }}
                                        >
                                            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                                                <div style={{
                                                    width: "44px",
                                                    height: "44px",
                                                    borderRadius: "10px",
                                                    background: "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "1.5rem",
                                                    flexShrink: 0
                                                }}>
                                                    {SAFE_PLACE_TYPES[place.type]?.icon || "📍"}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontWeight: 700,
                                                        fontSize: "0.95rem",
                                                        color: theme.colors.text.primary,
                                                        marginBottom: "0.25rem"
                                                    }}>
                                                        {place.name}
                                                    </div>
                                                    <div style={{
                                                        fontSize: "0.75rem",
                                                        color: theme.colors.text.muted,
                                                        textTransform: "uppercase",
                                                        fontWeight: 600,
                                                        marginBottom: "0.5rem"
                                                    }}>
                                                        {SAFE_PLACE_TYPES[place.type]?.label || place.type}
                                                    </div>
                                                    {place.address && (
                                                        <div style={{ fontSize: "0.8rem", color: theme.colors.text.secondary, marginBottom: "0.25rem" }}>
                                                            📍 {place.address}
                                                        </div>
                                                    )}
                                                    {place.phone && (
                                                        <a
                                                            href={`tel:${place.phone}`}
                                                            style={{
                                                                fontSize: "0.8rem",
                                                                color: theme.colors.primary,
                                                                textDecoration: "none",
                                                                display: "block",
                                                                marginBottom: "0.25rem"
                                                            }}
                                                        >
                                                            📞 {place.phone}
                                                        </a>
                                                    )}
                                                    <div style={{
                                                        display: "flex",
                                                        gap: "0.5rem",
                                                        marginTop: "0.5rem",
                                                        flexWrap: "wrap"
                                                    }}>
                                                        <span style={{
                                                            fontSize: "0.7rem",
                                                            padding: "3px 8px",
                                                            borderRadius: "20px",
                                                            backgroundColor: "#dbeafe",
                                                            color: "#1e40af",
                                                            fontWeight: 600
                                                        }}>
                                                            📏 {place.distance < 1000 ? `${place.distance}m` : `${(place.distance / 1000).toFixed(1)}km`}
                                                        </span>
                                                        {place.is24Hours && (
                                                            <span style={{
                                                                fontSize: "0.7rem",
                                                                padding: "3px 8px",
                                                                borderRadius: "20px",
                                                                backgroundColor: "#dcfce7",
                                                                color: "#166534",
                                                                fontWeight: 600
                                                            }}>
                                                                ✓ 24 Hours
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
