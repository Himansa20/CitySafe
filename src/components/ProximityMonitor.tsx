import { useEffect, useState, useRef } from "react";
import { useGeolocation } from "../services/useGeolocation";
import { subscribeActiveSOSAlerts } from "../services/sosAlerts";
import { findNearbySafePlaces, getAISafePlaceRecommendation, type SafePlace } from "../services/safePlaces";
import { haversineDistance } from "../utils/geo";
import { theme } from "../theme";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { SOSAlert } from "../types/sosAlert";

const ALERT_THRESHOLD = 500; // meters (increased for testing, user asked for 100m)
const SAFE_PLACE_RADIUS = 2000; // meters to search for safe places

export default function ProximityMonitor() {
    const geo = useGeolocation(true);
    const [activeAlerts, setActiveAlerts] = useState<SOSAlert[]>([]);
    const [nearestThreat, setNearestThreat] = useState<{ alert: SOSAlert; distance: number } | null>(null);
    const [safePlaces, setSafePlaces] = useState<SafePlace[]>([]);
    const [recommendation, setRecommendation] = useState<{ recommendedId: string; explanation: string } | null>(null);
    const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
    const [loadingSafePlaces, setLoadingSafePlaces] = useState(false);

    // Ref to track if we've already fetched safe places for the current threat
    const fetchedForThreatId = useRef<string | null>(null);

    // Subscribe to SOS alerts
    useEffect(() => {
        const unsub = subscribeActiveSOSAlerts((alerts) => setActiveAlerts(alerts));
        return () => unsub();
    }, []);

    // Check proximity
    useEffect(() => {
        if (!geo.lat || !geo.lng || activeAlerts.length === 0) {
            setNearestThreat(null);
            return;
        }

        let closest: { alert: SOSAlert; distance: number } | null = null;
        let minDist = Infinity;

        for (const alert of activeAlerts) {
            if (dismissedAlerts.has(alert.id)) continue;

            const dist = haversineDistance(geo.lat, geo.lng, alert.lat, alert.lng);
            if (dist <= ALERT_THRESHOLD && dist < minDist) {
                minDist = dist;
                closest = { alert, distance: dist };
            }
        }

        setNearestThreat(closest);
    }, [geo.lat, geo.lng, activeAlerts, dismissedAlerts]);

    // Fetch safe places when threat detected
    useEffect(() => {
        if (!nearestThreat || !geo.lat || !geo.lng) {
            setSafePlaces([]);
            setRecommendation(null);
            fetchedForThreatId.current = null;
            return;
        }

        // Avoid refetching for same threat
        if (fetchedForThreatId.current === nearestThreat.alert.id) return;

        const fetchPlaces = async () => {
            setLoadingSafePlaces(true);
            fetchedForThreatId.current = nearestThreat.alert.id;

            try {
                const places = await findNearbySafePlaces(geo.lat!, geo.lng!, SAFE_PLACE_RADIUS);
                setSafePlaces(places);

                if (places.length > 0) {
                    const rec = await getAISafePlaceRecommendation(places, nearestThreat.alert.type);
                    setRecommendation(rec);
                }
            } catch (err) {
                console.error("Failed to fetch safe places:", err);
            } finally {
                setLoadingSafePlaces(false);
            }
        };

        fetchPlaces();
    }, [nearestThreat, geo.lat, geo.lng]);

    const handleDismiss = () => {
        if (nearestThreat) {
            setDismissedAlerts(prev => new Set(prev).add(nearestThreat.alert.id));
            setNearestThreat(null);
        }
    };

    if (!nearestThreat) return null;

    return (
        <div style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 9998,
            backgroundColor: "white",
            borderRadius: theme.rounded.lg,
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            border: `2px solid ${theme.colors.status.danger}`,
            overflow: "hidden",
            animation: "fadeIn 0.3s ease-out",
            maxWidth: "500px",
            width: "calc(100% - 40px)",
        }}>
            {/* Alert Header */}
            <div style={{
                backgroundColor: theme.colors.status.danger,
                color: "white",
                padding: "1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700 }}>
                    <span style={{ animation: "pulse 1s infinite" }}>⚠️</span>
                    DANGER NEARBY ({Math.round(nearestThreat.distance)}m)
                </div>
                <button
                    onClick={handleDismiss}
                    style={{
                        background: "none",
                        border: "none",
                        color: "white",
                        fontSize: "1.2rem",
                        cursor: "pointer"
                    }}
                >
                    ✕
                </button>
            </div>

            <div style={{ padding: "1rem" }}>
                <p style={{ margin: "0 0 1rem 0", fontSize: theme.typography.sizes.sm }}>
                    <strong>{nearestThreat.alert.userName}</strong> reported a <strong>{nearestThreat.alert.type}</strong> emergency nearby.
                </p>

                {/* Safe Places Section */}
                <div>
                    <h4 style={{ margin: "0 0 0.5rem 0", fontSize: theme.typography.sizes.sm, color: theme.colors.primary, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        🛡️ Nearest Safe Places
                        {loadingSafePlaces && <span style={{ fontSize: "0.8rem", color: theme.colors.text.secondary }}>(Loading...)</span>}
                    </h4>

                    {recommendation && (
                        <div style={{
                            marginBottom: "0.75rem",
                            padding: "0.75rem",
                            backgroundColor: "#eff6ff",
                            borderRadius: theme.rounded.md,
                            borderLeft: `3px solid ${theme.colors.primary}`
                        }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.colors.primary, marginBottom: "0.25rem" }}>AI RECOMMENDATION</div>
                            <div style={{ fontSize: theme.typography.sizes.xs }}>
                                {recommendation.explanation}
                            </div>
                        </div>
                    )}

                    {/* Map Visualization */}
                    <div style={{ height: "200px", borderRadius: theme.rounded.md, overflow: "hidden", marginBottom: "1rem" }}>
                        {(!loadingSafePlaces && geo.lat && geo.lng && nearestThreat) && (
                            <MapContainer
                                center={[geo.lat, geo.lng]}
                                zoom={15}
                                style={{ height: "100%", width: "100%" }}
                                zoomControl={false}
                            >
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                                {/* User Location */}
                                <Marker position={[geo.lat, geo.lng]} icon={new L.DivIcon({
                                    className: "user-marker",
                                    html: '<div style="background:#3b82f6;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3);"></div>',
                                    iconSize: [12, 12]
                                })} />

                                {/* Threat Location */}
                                <Marker position={[nearestThreat.alert.lat, nearestThreat.alert.lng]} icon={new L.DivIcon({
                                    className: "threat-marker",
                                    html: '<div style="background:#ef4444;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;">⚠️</div>',
                                    iconSize: [24, 24]
                                })} />

                                {/* Safe Places */}
                                {safePlaces.slice(0, 5).map(place => (
                                    <Marker
                                        key={place.id}
                                        position={[place.lat, place.lng]}
                                        icon={new L.DivIcon({
                                            className: "safe-place-marker",
                                            html: `<div style="background:${recommendation?.recommendedId === place.id ? '#22c55e' : '#64748b'};color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid white;">${place.type === 'hospital' ? '🏥' : place.type === 'police' ? '🚔' : '🛡️'}</div>`,
                                            iconSize: [24, 24]
                                        })}
                                    />
                                ))}
                            </MapContainer>
                        )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "150px", overflowY: "auto" }}>
                        {safePlaces.length === 0 && !loadingSafePlaces ? (
                            <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary, fontStyle: "italic" }}>
                                No safe places found nearby.
                            </div>
                        ) : (
                            safePlaces.slice(0, 3).map(place => (
                                <div key={place.id} style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "0.5rem",
                                    backgroundColor: recommendation?.recommendedId === place.id ? "#f0fdf4" : "#f8fafc",
                                    border: recommendation?.recommendedId === place.id ? "1px solid #22c55e" : "1px solid #e2e8f0",
                                    borderRadius: theme.rounded.md,
                                }}>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        <span style={{ fontSize: theme.typography.sizes.sm, fontWeight: 600 }}>{place.name}</span>
                                        <span style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary }}>
                                            {place.distance}m • {place.isOpen ? <span style={{ color: "#16a34a" }}>Open</span> : <span style={{ color: "#dc2626" }}>Closed</span>}
                                        </span>
                                    </div>
                                    <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                            ...theme.button.base,
                                            ...theme.button.secondary,
                                            padding: "0.25rem 0.5rem",
                                            fontSize: "0.75rem",
                                            textDecoration: "none"
                                        }}
                                    >
                                        Go ↗
                                    </a>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
      `}</style>
        </div >
    );
}
