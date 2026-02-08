import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import { subscribeZones } from "../services/collectionZones";
import { subscribeSchedules } from "../services/wasteSchedules";
import { getUserSubscriptions } from "../services/zoneSubscriptions";
import ScheduleCalendar from "../components/ScheduleCalendar";
import ScheduleCard from "../components/ScheduleCard";
import ZoneSubscribeButton from "../components/ZoneSubscribeButton";
import type { CollectionZone, WasteSchedule, ZoneSubscription } from "../types/wasteSchedule";
import { theme } from "../theme";

type ViewMode = "calendar" | "list" | "zones";

export default function WasteSchedulePage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("calendar");

    const [zones, setZones] = useState<CollectionZone[]>([]);
    const [schedules, setSchedules] = useState<WasteSchedule[]>([]);
    const [subscriptions, setSubscriptions] = useState<ZoneSubscription[]>([]);
    const [selectedZone, setSelectedZone] = useState<string | null>(null);

    // Auth
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setUserId(user?.uid ?? null);
        });
        return () => unsub();
    }, []);

    // Load zones
    useEffect(() => {
        const unsub = subscribeZones(setZones);
        return () => unsub();
    }, []);

    // Load schedules
    useEffect(() => {
        const unsub = subscribeSchedules(setSchedules);
        return () => unsub();
    }, []);

    // Load user subscriptions
    useEffect(() => {
        if (!userId) {
            setSubscriptions([]);
            return;
        }
        getUserSubscriptions(userId).then(setSubscriptions);
    }, [userId]);

    const subscribedZoneIds = new Set(subscriptions.map((s) => s.zoneId));

    // Filter schedules by selected zone
    const filteredSchedules = selectedZone
        ? schedules.filter((s) => s.zoneId === selectedZone)
        : schedules;

    // Upcoming schedules (next 7 days)
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingSchedules = filteredSchedules
        .filter((s) => {
            const date = s.scheduledDate?.toDate?.();
            return date && date >= now && date <= weekFromNow && s.status === "scheduled";
        })
        .sort((a, b) => {
            const dateA = a.scheduledDate?.toDate?.()?.getTime() ?? 0;
            const dateB = b.scheduledDate?.toDate?.()?.getTime() ?? 0;
            return dateA - dateB;
        });

    // Next collection for subscribed zones
    const nextSubscribedCollections = schedules
        .filter((s) => subscribedZoneIds.has(s.zoneId) && s.status === "scheduled")
        .filter((s) => (s.scheduledDate?.toDate?.() ?? new Date(0)) >= now)
        .sort((a, b) => {
            const dateA = a.scheduledDate?.toDate?.()?.getTime() ?? 0;
            const dateB = b.scheduledDate?.toDate?.()?.getTime() ?? 0;
            return dateA - dateB;
        })
        .slice(0, 3);

    return (
        <div style={theme.layout.pageContainer}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1 style={{ margin: 0, color: theme.colors.text.primary }}>
                    Waste Collection Schedule
                </h1>
            </div>

            {/* Next Collection Alert */}
            {nextSubscribedCollections.length > 0 && userId && (
                <div
                    style={{
                        padding: "1rem",
                        backgroundColor: "#ecfdf5",
                        border: `1px solid ${theme.colors.status.success}`,
                        borderRadius: theme.rounded.lg,
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                    }}
                >
                    <div
                        style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            backgroundColor: theme.colors.status.success,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "1.25rem",
                        }}
                    >
                        🚛
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, color: "#166534" }}>
                            Next Collection in Your Area
                        </div>
                        <div style={{ fontSize: theme.typography.sizes.sm, color: "#166534" }}>
                            {nextSubscribedCollections[0].zoneName} -{" "}
                            {nextSubscribedCollections[0].scheduledDate?.toDate?.()?.toLocaleDateString()}
                        </div>
                    </div>
                </div>
            )}

            {/* View Tabs */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
                {(["calendar", "list", "zones"] as ViewMode[]).map((mode) => (
                    <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        style={{
                            ...theme.button.base,
                            ...(viewMode === mode ? theme.button.primary : theme.button.ghost),
                            padding: "0.5rem 1rem",
                            textTransform: "capitalize",
                        }}
                    >
                        {mode}
                    </button>
                ))}

                {/* Zone filter */}
                <div style={{ marginLeft: "auto" }}>
                    <select
                        value={selectedZone ?? ""}
                        onChange={(e) => setSelectedZone(e.target.value || null)}
                        style={{ ...theme.input, padding: "0.4rem" }}
                    >
                        <option value="">All Zones</option>
                        {zones.map((z) => (
                            <option key={z.id} value={z.id}>
                                {z.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Calendar View */}
            {viewMode === "calendar" && (
                <ScheduleCalendar
                    schedules={filteredSchedules}
                    onScheduleClick={(s) => console.log("Schedule:", s)}
                />
            )}

            {/* List View */}
            {viewMode === "list" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "1rem" }}>
                    {upcomingSchedules.length === 0 ? (
                        <div
                            style={{
                                gridColumn: "1 / -1",
                                textAlign: "center",
                                padding: "3rem",
                                color: theme.colors.text.secondary,
                            }}
                        >
                            No upcoming schedules found
                            {selectedZone && " for this zone"}
                        </div>
                    ) : (
                        upcomingSchedules.map((schedule) => (
                            <ScheduleCard key={schedule.id} schedule={schedule} />
                        ))
                    )}
                </div>
            )}

            {/* Zones View */}
            {viewMode === "zones" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                    {zones.map((zone) => {
                        const zoneSchedules = schedules.filter(
                            (s) => s.zoneId === zone.id && s.status === "scheduled"
                        );
                        const nextSchedule = zoneSchedules
                            .filter((s) => (s.scheduledDate?.toDate?.() ?? new Date(0)) >= now)
                            .sort((a, b) => {
                                const dateA = a.scheduledDate?.toDate?.()?.getTime() ?? 0;
                                const dateB = b.scheduledDate?.toDate?.()?.getTime() ?? 0;
                                return dateA - dateB;
                            })[0];

                        const isSubscribed = subscribedZoneIds.has(zone.id);

                        return (
                            <div
                                key={zone.id}
                                style={{
                                    ...theme.card,
                                    padding: "1rem",
                                    border: isSubscribed ? `2px solid ${theme.colors.primary}` : undefined,
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        <div
                                            style={{
                                                width: "16px",
                                                height: "16px",
                                                borderRadius: "4px",
                                                backgroundColor: zone.color,
                                            }}
                                        />
                                        <h3 style={{ margin: 0, fontSize: theme.typography.sizes.base }}>
                                            {zone.name}
                                        </h3>
                                    </div>
                                    {userId && (
                                        <ZoneSubscribeButton
                                            zoneId={zone.id}
                                            zoneName={zone.name}
                                            variant="compact"
                                        />
                                    )}
                                </div>

                                {nextSchedule ? (
                                    <div>
                                        <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.secondary, marginBottom: "0.25rem" }}>
                                            Next Collection:
                                        </div>
                                        <div style={{ fontWeight: 600, color: theme.colors.text.primary }}>
                                            {nextSchedule.scheduledDate?.toDate?.()?.toLocaleDateString()} at{" "}
                                            {nextSchedule.scheduledDate?.toDate?.()?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.secondary }}>
                                        No upcoming collections scheduled
                                    </div>
                                )}

                                {userId && !isSubscribed && (
                                    <div style={{ marginTop: "0.75rem" }}>
                                        <ZoneSubscribeButton zoneId={zone.id} zoneName={zone.name} />
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {zones.length === 0 && (
                        <div
                            style={{
                                gridColumn: "1 / -1",
                                textAlign: "center",
                                padding: "3rem",
                                color: theme.colors.text.secondary,
                            }}
                        >
                            No collection zones have been set up yet
                        </div>
                    )}
                </div>
            )}

            {/* Login prompt for notifications */}
            {!userId && (
                <div
                    style={{
                        ...theme.card,
                        padding: "1.5rem",
                        textAlign: "center",
                        backgroundColor: "#f8fafc",
                    }}
                >
                    <div style={{ fontSize: theme.typography.sizes.lg, fontWeight: 600, marginBottom: "0.5rem" }}>
                        Get Notified
                    </div>
                    <div style={{ color: theme.colors.text.secondary, marginBottom: "1rem" }}>
                        Sign in to subscribe to zones and receive notifications about upcoming collections
                    </div>
                    <a
                        href="/login"
                        style={{
                            ...theme.button.base,
                            ...theme.button.primary,
                            textDecoration: "none",
                        }}
                    >
                        Sign In
                    </a>
                </div>
            )}
        </div>
    );
}
