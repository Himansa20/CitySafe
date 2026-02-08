import { useEffect, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import { subscribeZones, createZone, deleteZone } from "../services/collectionZones";
import {
    subscribeSchedules,
    createSchedule,
    updateScheduleStatus,
    deleteSchedule,
} from "../services/wasteSchedules";
import { listSignals } from "../services/signals";
import { computeWasteHotspots, getWasteAnalytics, getRecommendedSchedules } from "../services/wasteHotspots";
import { notifyZoneSubscribers } from "../services/notifications";
import ZoneDrawer from "../components/ZoneDrawer";
import HotspotMap, { HotspotLegend } from "../components/HotspotMap";
import ScheduleCard from "../components/ScheduleCard";
import ScheduleCalendar from "../components/ScheduleCalendar";
import type {
    CollectionZone,
    LatLng,
    NewScheduleInput,
    RecurrenceType,
    WasteHotspot,
    WasteSchedule,
} from "../types/wasteSchedule";
import { RECURRENCE_LABELS, ZONE_COLORS } from "../types/wasteSchedule";
import type { Signal } from "../types/signal";
import { theme } from "../theme";

type Tab = "zones" | "schedules" | "analytics";

const DEFAULT_CENTER: [number, number] = [6.9271, 79.8612];

export default function WasteAdminPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>("zones");

    // Data
    const [zones, setZones] = useState<CollectionZone[]>([]);
    const [schedules, setSchedules] = useState<WasteSchedule[]>([]);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [hotspots, setHotspots] = useState<WasteHotspot[]>([]);

    // Zone drawing
    const [isDrawing, setIsDrawing] = useState(false);
    const [selectedZone, setSelectedZone] = useState<CollectionZone | null>(null);
    const [newZoneName, setNewZoneName] = useState("");

    // Schedule creation
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [scheduleForm, setScheduleForm] = useState<{
        title: string;
        description: string;
        zoneId: string;
        scheduledDate: string;
        scheduledTime: string;
        recurrence: RecurrenceType;
        estimatedDuration: number;
        assignedTeam: string;
    }>({
        title: "",
        description: "",
        zoneId: "",
        scheduledDate: "",
        scheduledTime: "08:00",
        recurrence: "weekly",
        estimatedDuration: 120,
        assignedTeam: "",
    });

    // Auth
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setUserId(user?.uid ?? null);
        });
        return () => unsub();
    }, []);

    // Subscribe to zones
    useEffect(() => {
        const unsub = subscribeZones(setZones);
        return () => unsub();
    }, []);

    // Subscribe to schedules
    useEffect(() => {
        const unsub = subscribeSchedules(setSchedules);
        return () => unsub();
    }, []);

    // Load signals and compute hotspots
    useEffect(() => {
        listSignals({ limit: 500 }).then(setSignals);
    }, []);

    useEffect(() => {
        if (zones.length > 0) {
            const computed = computeWasteHotspots({ signals, zones, schedules });
            setHotspots(computed);
        }
    }, [signals, zones, schedules]);

    // Zone creation
    const handleZoneComplete = async (polygon: LatLng[]) => {
        if (!userId || !newZoneName.trim()) {
            alert("Please enter a zone name");
            return;
        }

        const colorIndex = zones.length % ZONE_COLORS.length;
        await createZone(
            { name: newZoneName, polygon, color: ZONE_COLORS[colorIndex] },
            userId
        );

        setNewZoneName("");
        setIsDrawing(false);
    };

    const handleDeleteZone = async (zoneId: string) => {
        if (!confirm("Delete this zone? This cannot be undone.")) return;
        await deleteZone(zoneId);
        setSelectedZone(null);
    };

    // Schedule creation
    const handleCreateSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;

        const date = new Date(`${scheduleForm.scheduledDate}T${scheduleForm.scheduledTime}`);

        const input: NewScheduleInput = {
            title: scheduleForm.title,
            description: scheduleForm.description,
            zoneId: scheduleForm.zoneId,
            scheduledDate: date,
            recurrence: scheduleForm.recurrence,
            estimatedDuration: scheduleForm.estimatedDuration,
            assignedTeam: scheduleForm.assignedTeam || undefined,
        };

        const scheduleId = await createSchedule(input, userId);

        // Notify subscribers
        const zone = zones.find((z) => z.id === scheduleForm.zoneId);
        if (zone) {
            await notifyZoneSubscribers(scheduleForm.zoneId, {
                type: "schedule_created",
                title: "New Collection Scheduled",
                message: `Waste collection in ${zone.name} on ${date.toLocaleDateString()}`,
                scheduleId,
            });
        }

        setShowScheduleForm(false);
        setScheduleForm({
            title: "",
            description: "",
            zoneId: "",
            scheduledDate: "",
            scheduledTime: "08:00",
            recurrence: "weekly",
            estimatedDuration: 120,
            assignedTeam: "",
        });
    };

    const handleStatusChange = async (id: string, status: WasteSchedule["status"]) => {
        await updateScheduleStatus(id, status);
    };

    const handleDeleteSchedule = async (id: string) => {
        if (!confirm("Delete this schedule?")) return;
        await deleteSchedule(id);
    };

    // Quick schedule from recommendation
    const handleQuickSchedule = (zoneId: string, zoneName: string) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        setScheduleForm({
            title: `Collection - ${zoneName}`,
            description: "Scheduled based on demand analysis",
            zoneId,
            scheduledDate: tomorrow.toISOString().split("T")[0],
            scheduledTime: "08:00",
            recurrence: "weekly",
            estimatedDuration: 120,
            assignedTeam: "",
        });
        setShowScheduleForm(true);
        setActiveTab("schedules");
    };

    const analytics = getWasteAnalytics({ signals, zones, schedules });
    const recommendations = getRecommendedSchedules(hotspots, schedules);

    return (
        <div style={theme.layout.pageContainer}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <div>
                    <h1 style={{
                        margin: 0,
                        fontSize: theme.typography.sizes["2xl"],
                        fontWeight: 800,
                        color: theme.colors.text.primary
                    }}>
                        🗑️ Waste Management
                    </h1>
                    <p style={{ margin: "0.25rem 0 0 0", color: theme.colors.text.secondary, fontSize: theme.typography.sizes.sm }}>
                        Manage collection zones, schedules, and view analytics
                    </p>
                </div>
            </div>

            {/* Tabs - matching AdminPage style */}
            <div style={{ display: "flex", gap: "1rem", borderBottom: `1px solid ${theme.colors.border}`, marginBottom: "1.5rem" }}>
                {(["zones", "schedules", "analytics"] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: "0.75rem 1rem",
                            background: "transparent",
                            border: "none",
                            borderBottom: activeTab === tab
                                ? `2px solid ${theme.colors.primary}`
                                : "2px solid transparent",
                            color: activeTab === tab ? theme.colors.primary : theme.colors.text.secondary,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.2s",
                            textTransform: "capitalize",
                        }}
                    >
                        {tab === "zones" && "📍 "}
                        {tab === "schedules" && "📅 "}
                        {tab === "analytics" && "📊 "}
                        {tab}
                    </button>
                ))}
            </div>

            {/* Zones Tab */}
            {activeTab === "zones" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem", height: "calc(100vh - 240px)" }}>
                    {/* Map */}
                    <div style={{ ...theme.card, padding: 0, overflow: "hidden" }}>
                        {isDrawing ? (
                            <div style={{ height: "100%" }}>
                                <div style={{ padding: "0.75rem 1rem", backgroundColor: "#f0f5ff", borderBottom: `1px solid ${theme.colors.border}` }}>
                                    <input
                                        type="text"
                                        placeholder="Zone name (e.g., Downtown Area)"
                                        value={newZoneName}
                                        onChange={(e) => setNewZoneName(e.target.value)}
                                        style={{ ...theme.input, maxWidth: "300px" }}
                                    />
                                </div>
                                <MapContainer center={DEFAULT_CENTER} zoom={13} style={{ height: "calc(100% - 54px)" }}>
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <ZoneDrawer
                                        existingZones={zones}
                                        isDrawing={isDrawing}
                                        onComplete={handleZoneComplete}
                                        onCancel={() => { setIsDrawing(false); setNewZoneName(""); }}
                                        selectedZoneId={selectedZone?.id}
                                    />
                                </MapContainer>
                            </div>
                        ) : (
                            <HotspotMap
                                zones={zones}
                                hotspots={hotspots}
                                signals={signals}
                                center={DEFAULT_CENTER}
                                height="100%"
                                selectedZoneId={selectedZone?.id}
                                onZoneClick={(z) => setSelectedZone(zones.find((zone) => zone.id === ("zoneId" in z ? z.zoneId : z.id)) ?? null)}
                            />
                        )}
                    </div>

                    {/* Zone List */}
                    <div style={{ ...theme.card, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <div style={{ padding: "0.75rem 1rem", borderBottom: `1px solid ${theme.colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontWeight: 600 }}>Collection Zones</span>
                            <button
                                onClick={() => setIsDrawing(true)}
                                style={{ ...theme.button.base, ...theme.button.primary, padding: "0.35rem 0.75rem", fontSize: theme.typography.sizes.sm }}
                            >
                                + Draw Zone
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
                            {zones.length === 0 ? (
                                <div style={{ padding: "2rem 1rem", textAlign: "center", color: theme.colors.text.secondary }}>
                                    No zones yet. Click "Draw Zone" to create one.
                                </div>
                            ) : (
                                zones.map((zone) => {
                                    const hotspot = hotspots.find((h) => h.zoneId === zone.id);
                                    return (
                                        <div
                                            key={zone.id}
                                            onClick={() => setSelectedZone(zone)}
                                            style={{
                                                padding: "0.75rem",
                                                marginBottom: "0.5rem",
                                                borderRadius: theme.rounded.md,
                                                border: `2px solid ${selectedZone?.id === zone.id ? theme.colors.primary : theme.colors.border}`,
                                                backgroundColor: selectedZone?.id === zone.id ? "#f0f5ff" : "white",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                    <div style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: zone.color }} />
                                                    <span style={{ fontWeight: 500 }}>{zone.name}</span>
                                                </div>
                                                {hotspot && (
                                                    <span style={{
                                                        fontSize: theme.typography.sizes.xs,
                                                        padding: "2px 6px",
                                                        borderRadius: theme.rounded.full,
                                                        backgroundColor: hotspot.demandScore >= 25 ? "#fee2e2" : "#f0fdf4",
                                                        color: hotspot.demandScore >= 25 ? "#991b1b" : "#166534",
                                                    }}>
                                                        Score: {hotspot.demandScore}
                                                    </span>
                                                )}
                                            </div>
                                            {selectedZone?.id === zone.id && (
                                                <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleQuickSchedule(zone.id, zone.name); }}
                                                        style={{ ...theme.button.base, ...theme.button.primary, padding: "0.25rem 0.5rem", fontSize: theme.typography.sizes.xs }}
                                                    >
                                                        Create Schedule
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteZone(zone.id); }}
                                                        style={{ ...theme.button.base, ...theme.button.danger, padding: "0.25rem 0.5rem", fontSize: theme.typography.sizes.xs }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div style={{ padding: "0.5rem 1rem", borderTop: `1px solid ${theme.colors.border}` }}>
                            <HotspotLegend />
                        </div>
                    </div>
                </div>
            )}

            {/* Schedules Tab */}
            {activeTab === "schedules" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "1rem" }}>
                    {/* Calendar */}
                    <ScheduleCalendar
                        schedules={schedules}
                        onScheduleClick={(s) => console.log("Schedule clicked:", s)}
                    />

                    {/* Schedule Management */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <button
                            onClick={() => setShowScheduleForm(!showScheduleForm)}
                            style={{ ...theme.button.base, ...theme.button.primary }}
                        >
                            {showScheduleForm ? "Cancel" : "+ New Schedule"}
                        </button>

                        {showScheduleForm && (
                            <form onSubmit={handleCreateSchedule} style={{ ...theme.card, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                <input
                                    type="text"
                                    placeholder="Title"
                                    value={scheduleForm.title}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                                    required
                                    style={theme.input}
                                />
                                <textarea
                                    placeholder="Description"
                                    value={scheduleForm.description}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                                    style={{ ...theme.input, minHeight: "60px", resize: "vertical" }}
                                />
                                <select
                                    value={scheduleForm.zoneId}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, zoneId: e.target.value })}
                                    required
                                    style={theme.input}
                                >
                                    <option value="">Select Zone</option>
                                    {zones.map((z) => (
                                        <option key={z.id} value={z.id}>{z.name}</option>
                                    ))}
                                </select>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <input
                                        type="date"
                                        value={scheduleForm.scheduledDate}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
                                        required
                                        style={{ ...theme.input, flex: 1 }}
                                    />
                                    <input
                                        type="time"
                                        value={scheduleForm.scheduledTime}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledTime: e.target.value })}
                                        required
                                        style={{ ...theme.input, width: "100px" }}
                                    />
                                </div>
                                <select
                                    value={scheduleForm.recurrence}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, recurrence: e.target.value as RecurrenceType })}
                                    style={theme.input}
                                >
                                    {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    placeholder="Assigned Team (optional)"
                                    value={scheduleForm.assignedTeam}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, assignedTeam: e.target.value })}
                                    style={theme.input}
                                />
                                <button type="submit" style={{ ...theme.button.base, ...theme.button.primary }}>
                                    Create Schedule
                                </button>
                            </form>
                        )}

                        {/* Recommendations */}
                        {recommendations.filter((r) => !r.hasScheduled).length > 0 && (
                            <div style={{ ...theme.card, padding: "1rem" }}>
                                <h3 style={{ margin: "0 0 0.75rem", fontSize: theme.typography.sizes.base }}>
                                    AI Recommendations
                                </h3>
                                {recommendations.filter((r) => !r.hasScheduled).slice(0, 3).map((rec) => (
                                    <div key={rec.zoneId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: `1px solid ${theme.colors.border}` }}>
                                        <div>
                                            <div style={{ fontWeight: 500 }}>{rec.zoneName}</div>
                                            <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary }}>
                                                Demand: {rec.demandScore} • Suggest: {RECURRENCE_LABELS[rec.recommendedFrequency]}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleQuickSchedule(rec.zoneId, rec.zoneName)}
                                            style={{ ...theme.button.base, ...theme.button.primary, padding: "0.25rem 0.5rem", fontSize: theme.typography.sizes.xs }}
                                        >
                                            Schedule
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Schedule List */}
                        <div style={{ flex: 1, overflowY: "auto" }}>
                            {schedules.filter((s) => s.status === "scheduled").map((schedule) => (
                                <div key={schedule.id} style={{ marginBottom: "0.75rem" }}>
                                    <ScheduleCard
                                        schedule={schedule}
                                        showActions
                                        onStatusChange={(status) => handleStatusChange(schedule.id, status)}
                                        onDelete={() => handleDeleteSchedule(schedule.id)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Analytics Tab */}
            {activeTab === "analytics" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {/* Stats Cards Row */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                        <StatCard label="Waste Signals" value={analytics.totalWasteSignals} color={theme.colors.status.warning} icon="📋" />
                        <StatCard label="Unresolved" value={analytics.unresolvedCount} color={theme.colors.status.danger} icon="⚠️" />
                        <StatCard label="Scheduled" value={analytics.scheduledCollections} color={theme.colors.status.info} icon="📅" />
                        <StatCard label="Coverage" value={`${analytics.coveragePercent}%`} color={theme.colors.status.success} icon="✅" />
                    </div>

                    {/* Charts Row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                        {/* Hotspot Map */}
                        <div style={{ ...theme.card, padding: "1.5rem" }}>
                            <h3 style={{ margin: "0 0 1rem", fontSize: theme.typography.sizes.lg, fontWeight: 700 }}>Demand Heatmap</h3>
                            <HotspotMap
                                zones={zones}
                                hotspots={hotspots}
                                signals={signals}
                                height="350px"
                                showSignals={false}
                            />
                            <div style={{ marginTop: "1rem" }}>
                                <HotspotLegend />
                            </div>
                        </div>

                        {/* Top Hotspots */}
                        <div style={{ ...theme.card, padding: "1.5rem" }}>
                            <h3 style={{ margin: "0 0 1rem", fontSize: theme.typography.sizes.lg, fontWeight: 700 }}>Top Hotspots</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                {analytics.topHotspots.length === 0 ? (
                                    <div style={{ padding: "2rem", textAlign: "center", color: theme.colors.text.secondary }}>
                                        No hotspot data available
                                    </div>
                                ) : (
                                    analytics.topHotspots.map((h, i) => (
                                        <div key={h.zoneId} style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "0.75rem",
                                            backgroundColor: i === 0 ? theme.colors.status.dangerLight : theme.colors.surfaceHover,
                                            borderRadius: theme.rounded.md,
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                                <span style={{
                                                    fontWeight: 700,
                                                    color: "white",
                                                    backgroundColor: i === 0 ? theme.colors.status.danger : theme.colors.text.muted,
                                                    width: "24px",
                                                    height: "24px",
                                                    borderRadius: theme.rounded.full,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: theme.typography.sizes.xs,
                                                }}>{i + 1}</span>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{h.zoneName}</div>
                                                    <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary }}>
                                                        {h.wasteSignalCount} signals
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                                <span style={{
                                                    fontWeight: 700,
                                                    color: h.demandScore >= 25 ? theme.colors.status.danger : theme.colors.text.primary,
                                                    fontSize: theme.typography.sizes.lg,
                                                }}>
                                                    {h.demandScore}
                                                </span>
                                                <button
                                                    onClick={() => handleQuickSchedule(h.zoneId, h.zoneName)}
                                                    style={{ ...theme.button.base, ...theme.button.primary, padding: "0.35rem 0.75rem", fontSize: theme.typography.sizes.xs }}
                                                >
                                                    Schedule
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon?: string }) {
    return (
        <div style={{ ...theme.card, padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            {icon && (
                <div style={{
                    fontSize: "1.5rem",
                    width: "48px",
                    height: "48px",
                    borderRadius: theme.rounded.lg,
                    backgroundColor: `${color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}>{icon}</div>
            )}
            <div>
                <div style={{ fontSize: theme.typography.sizes["2xl"], fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.secondary }}>{label}</div>
            </div>
        </div>
    );
}
