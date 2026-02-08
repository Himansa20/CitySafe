import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import { useAuth } from "../services/useAuth";
import { useGeolocation } from "../services/useGeolocation";
import { subscribeActiveSOSAlerts, respondToSOSAlert } from "../services/sosAlerts";
import type { SOSAlert } from "../types/sosAlert";
import { SOS_TYPE_INFO } from "../types/sosAlert";
import { haversineDistance, formatDistance } from "../utils/geo";
import { theme } from "../theme";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '../icons';

type Props = {
    maxDistance?: number; // meters, default 5km
};

export default function SOSAlertsPanel({ maxDistance = 5000 }: Props) {
    const { user } = useAuth();
    const geo = useGeolocation(true);
    const [alerts, setAlerts] = useState<SOSAlert[]>([]);
    const [responding, setResponding] = useState<string | null>(null);
    const [mapAlert, setMapAlert] = useState<SOSAlert | null>(null);

    useEffect(() => {
        const unsub = subscribeActiveSOSAlerts(
            setAlerts,
            (err: unknown) => console.error("SOS alerts error:", err)
        );
        return () => unsub();
    }, []);

    // Filter alerts by distance and exclude own alerts
    const nearbyAlerts = alerts.filter((a) => {
        if (user && a.userId === user.uid) return false;
        if (geo.lat === null || geo.lng === null) return true;
        const dist = haversineDistance(geo.lat, geo.lng, a.lat, a.lng);
        return dist <= maxDistance;
    });

    const handleRespond = async (alertId: string) => {
        if (!user) return;
        setResponding(alertId);
        try {
            await respondToSOSAlert(alertId, user.uid);
        } catch (err) {
            console.error("Failed to respond:", err);
        } finally {
            setResponding(null);
        }
    };

    if (nearbyAlerts.length === 0) return null;

    return (
        <>
            <div style={{
                ...theme.card,
                padding: 0,
                border: `2px solid ${theme.colors.status.danger}`,
                overflow: "hidden",
                animation: "urgentPulse 2s infinite",
            }}>
                {/* Header */}
                <div style={{
                    background: theme.colors.gradients.warm,
                    padding: "0.875rem 1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        color: "white",
                        fontWeight: 700,
                        fontSize: theme.typography.sizes.sm
                    }}>
                        <span style={{ animation: "flash 1s infinite" }}><FontAwesomeIcon icon={Icons.sos} /></span>
                        Active Emergencies Nearby
                    </div>
                    <span style={{
                        backgroundColor: "rgba(255,255,255,0.2)",
                        color: "white",
                        padding: "4px 10px",
                        borderRadius: theme.rounded.full,
                        fontSize: theme.typography.sizes.xs,
                        fontWeight: 600
                    }}>
                        {nearbyAlerts.length}
                    </span>
                </div>

                {/* Alerts List */}
                <div style={{
                    maxHeight: "300px",
                    overflowY: "auto",
                    backgroundColor: theme.colors.status.dangerLight,
                }}>
                    {nearbyAlerts.map((alert) => {
                        const typeInfo = SOS_TYPE_INFO[alert.type];
                        const distance = geo.lat !== null && geo.lng !== null
                            ? haversineDistance(geo.lat, geo.lng, alert.lat, alert.lng)
                            : null;
                        const isResponding = responding === alert.id;
                        const hasResponded = user && alert.responderIds?.includes(user.uid);

                        return (
                            <div
                                key={alert.id}
                                style={{
                                    padding: "1rem",
                                    borderBottom: `1px solid ${theme.colors.border}`,
                                    backgroundColor: "white",
                                }}
                            >
                                {/* Alert Header */}
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    marginBottom: "0.75rem"
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                        <div style={{
                                            width: "48px",
                                            height: "48px",
                                            borderRadius: theme.rounded.lg,
                                            backgroundColor: `${typeInfo.color}15`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "1.5rem"
                                        }}>
                                            <FontAwesomeIcon icon={typeInfo.icon} />
                                        </div>
                                        <div>
                                            <div style={{
                                                fontWeight: 700,
                                                color: typeInfo.color,
                                                marginBottom: "2px"
                                            }}>
                                                {typeInfo.label}
                                            </div>
                                            <div style={{
                                                fontSize: theme.typography.sizes.xs,
                                                color: theme.colors.text.secondary
                                            }}>
                                                {alert.userName} • {distance !== null ? formatDistance(distance) + " away" : "Location unknown"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Time */}
                                    <div style={{
                                        fontSize: theme.typography.sizes.xs,
                                        color: theme.colors.status.danger,
                                        fontWeight: 600
                                    }}>
                                        {alert.createdAt?.toDate?.()
                                            ? formatTimeAgo(alert.createdAt.toDate())
                                            : "Just now"}
                                    </div>
                                </div>

                                {/* Message */}
                                {alert.message && (
                                    <div style={{
                                        fontSize: theme.typography.sizes.sm,
                                        color: theme.colors.text.secondary,
                                        marginBottom: "0.75rem",
                                        padding: "0.5rem 0.75rem",
                                        backgroundColor: theme.colors.bg,
                                        borderRadius: theme.rounded.md,
                                        borderLeft: `3px solid ${typeInfo.color}`
                                    }}>
                                        "{alert.message}"
                                    </div>
                                )}

                                {/* Stats & Actions */}
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: "0.5rem"
                                }}>
                                    <span style={{
                                        fontSize: theme.typography.sizes.xs,
                                        color: theme.colors.text.muted
                                    }}>
                                        <FontAwesomeIcon icon={Icons.users} /> {alert.respondersCount} responding
                                    </span>

                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        {/* View on Map Button */}
                                        <button
                                            onClick={() => setMapAlert(alert)}
                                            style={{
                                                ...theme.button.base,
                                                ...theme.button.secondary,
                                                padding: "0.375rem 0.75rem",
                                                fontSize: theme.typography.sizes.xs,
                                            }}
                                        >
                                            <FontAwesomeIcon icon={Icons.map} /> View Map
                                        </button>

                                        {user && (
                                            <button
                                                onClick={() => handleRespond(alert.id)}
                                                disabled={isResponding || !!hasResponded}
                                                style={{
                                                    ...theme.button.base,
                                                    ...(hasResponded ? theme.button.success : theme.button.primary),
                                                    padding: "0.375rem 0.875rem",
                                                    fontSize: theme.typography.sizes.xs,
                                                    opacity: isResponding ? 0.7 : 1,
                                                }}
                                            >
                                                {hasResponded ? <><FontAwesomeIcon icon={Icons.check} /> Responding</> : isResponding ? "..." : <><FontAwesomeIcon icon={Icons.car} /> I'll Help</>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Keyframe animations */}
                <style>{`
          @keyframes urgentPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
            50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          }
          @keyframes flash {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
            </div>

            {/* Map Modal */}
            {mapAlert && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                        padding: "1rem",
                    }}
                    onClick={() => setMapAlert(null)}
                >
                    <div
                        style={{
                            ...theme.card,
                            width: "90%",
                            maxWidth: "600px",
                            maxHeight: "80vh",
                            overflow: "hidden",
                            animation: "slideUp 0.2s ease-out",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: "1rem",
                            borderBottom: `1px solid ${theme.colors.border}`,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: theme.colors.status.dangerLight,
                        }}>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                fontWeight: 700,
                                color: theme.colors.status.danger,
                            }}>
                                <span><FontAwesomeIcon icon={SOS_TYPE_INFO[mapAlert.type].icon} /></span>
                                {mapAlert.userName}'s Location
                            </div>
                            <button
                                onClick={() => setMapAlert(null)}
                                style={{
                                    ...theme.button.base,
                                    ...theme.button.ghost,
                                    padding: "0.25rem 0.5rem",
                                    fontSize: "1.25rem",
                                }}
                            >
                                <FontAwesomeIcon icon={Icons.xmark} />
                            </button>
                        </div>

                        {/* Map */}
                        <div style={{ height: "400px" }}>
                            <MapContainer
                                center={[mapAlert.lat, mapAlert.lng]}
                                zoom={15}
                                style={{ height: "100%", width: "100%" }}
                            >
                                <TileLayer
                                    attribution="&copy; OpenStreetMap contributors"
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />

                                {/* SOS Location Marker */}
                                <CircleMarker
                                    center={[mapAlert.lat, mapAlert.lng]}
                                    radius={30}
                                    pathOptions={{
                                        color: theme.colors.status.danger,
                                        fillColor: theme.colors.status.danger,
                                        fillOpacity: 0.2,
                                        weight: 2,
                                    }}
                                />
                                <Marker position={[mapAlert.lat, mapAlert.lng]}>
                                    <Popup>
                                        <div style={{ fontWeight: 600, color: theme.colors.status.danger }}>
                                            <FontAwesomeIcon icon={Icons.sos} /> {SOS_TYPE_INFO[mapAlert.type].label}
                                        </div>
                                        <div style={{ fontSize: theme.typography.sizes.sm }}>
                                            {mapAlert.userName}
                                        </div>
                                    </Popup>
                                </Marker>

                                {/* Your Location */}
                                {geo.lat !== null && geo.lng !== null && (
                                    <CircleMarker
                                        center={[geo.lat, geo.lng]}
                                        radius={8}
                                        pathOptions={{
                                            color: "white",
                                            fillColor: theme.colors.primary,
                                            fillOpacity: 1,
                                            weight: 3,
                                        }}
                                    >
                                        <Popup><FontAwesomeIcon icon={Icons.mapPin} /> Your Location</Popup>
                                    </CircleMarker>
                                )}
                            </MapContainer>
                        </div>

                        {/* Distance Info */}
                        <div style={{
                            padding: "1rem",
                            backgroundColor: theme.colors.bg,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}>
                            <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.secondary }}>
                                <FontAwesomeIcon icon={Icons.mapPin} /> {mapAlert.lat.toFixed(5)}, {mapAlert.lng.toFixed(5)}
                            </div>
                            {geo.lat !== null && geo.lng !== null && (
                                <div style={{
                                    fontWeight: 600,
                                    color: theme.colors.status.danger,
                                }}>
                                    {formatDistance(haversineDistance(geo.lat, geo.lng, mapAlert.lat, mapAlert.lng))} away
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </>
    );
}

function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}
