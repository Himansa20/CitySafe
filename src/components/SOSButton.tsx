import { useState, useRef, useEffect } from "react";
import { useAuth } from "../services/useAuth";
import { useGeolocation } from "../services/useGeolocation";
import { createSOSAlert, cancelSOSAlert, subscribeUserSOSAlerts } from "../services/sosAlerts";
import type { SOSAlert, SOSAlertType } from "../types/sosAlert";
import { SOS_TYPE_INFO } from "../types/sosAlert";
import { theme } from "../theme";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '../icons';

type ModalState = "closed" | "type-select" | "confirming" | "active" | "error";

export default function SOSButton() {
    const { user } = useAuth();
    const geo = useGeolocation(true);

    const [modalState, setModalState] = useState<ModalState>("closed");
    const [selectedType, setSelectedType] = useState<SOSAlertType>("safety");
    const [message, setMessage] = useState("");
    const [activeAlert, setActiveAlert] = useState<SOSAlert | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [holdProgress, setHoldProgress] = useState(0);

    const holdTimerRef = useRef<number | null>(null);
    const progressIntervalRef = useRef<number | null>(null);

    // Subscribe to user's active alerts
    useEffect(() => {
        if (!user) return;

        const unsub = subscribeUserSOSAlerts(user.uid, (alerts) => {
            const active = alerts.find((a) => a.status === "active" || a.status === "responding");
            setActiveAlert(active ?? null);
            if (active) {
                setModalState("active");
            }
        });

        return () => unsub();
    }, [user]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, []);

    const startHold = () => {
        if (!user) {
            setError("Please sign in to use SOS");
            setModalState("error");
            return;
        }

        setHoldProgress(0);

        // Progress animation
        progressIntervalRef.current = window.setInterval(() => {
            setHoldProgress((prev) => Math.min(prev + 2, 100));
        }, 30);

        // Complete after 1.5 seconds
        holdTimerRef.current = window.setTimeout(() => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            setHoldProgress(100);
            setModalState("type-select");
        }, 1500);
    };

    const cancelHold = () => {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setHoldProgress(0);
    };

    const handleSendSOS = async () => {
        if (!user) return;
        if (geo.lat === null || geo.lng === null) {
            setError("Location required for SOS");
            setModalState("error");
            return;
        }

        setModalState("confirming");

        try {
            await createSOSAlert(
                {
                    type: selectedType,
                    message: message || undefined,
                    lat: geo.lat,
                    lng: geo.lng,
                },
                user.uid,
                user.displayName || "Anonymous",
                undefined
            );
            setMessage("");
            setModalState("active");
        } catch (err) {
            setError((err as Error)?.message ?? "Failed to send SOS");
            setModalState("error");
        }
    };

    const handleCancelAlert = async () => {
        if (!activeAlert) return;

        try {
            await cancelSOSAlert(activeAlert.id);
            setActiveAlert(null);
            setModalState("closed");
        } catch (err) {
            setError((err as Error)?.message ?? "Failed to cancel");
        }
    };

    const closeModal = () => {
        setModalState("closed");
        setError(null);
        setMessage("");
    };

    return (
        <>
            {/* SOS Button */}
            <button
                onMouseDown={startHold}
                onMouseUp={cancelHold}
                onMouseLeave={cancelHold}
                onTouchStart={startHold}
                onTouchEnd={cancelHold}
                style={{
                    position: "relative",
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    border: "none",
                    background: activeAlert
                        ? "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)"
                        : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    color: "white",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: activeAlert
                        ? "0 0 20px rgba(239, 68, 68, 0.6)"
                        : "0 4px 12px rgba(239, 68, 68, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                    animation: activeAlert ? "pulse 1.5s infinite" : "none",
                    overflow: "hidden",
                }}
                title={activeAlert ? "SOS Active - Click to view" : "Hold for SOS"}
                onClick={activeAlert ? () => setModalState("active") : undefined}
            >
                {/* Progress ring */}
                {holdProgress > 0 && holdProgress < 100 && (
                    <svg
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            transform: "rotate(-90deg)",
                        }}
                    >
                        <circle
                            cx="22"
                            cy="22"
                            r="20"
                            fill="none"
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth="4"
                        />
                        <circle
                            cx="22"
                            cy="22"
                            r="20"
                            fill="none"
                            stroke="white"
                            strokeWidth="4"
                            strokeDasharray={`${(holdProgress / 100) * 125.6} 125.6`}
                        />
                    </svg>
                )}
                <span style={{ position: "relative", zIndex: 1 }}>
                    {activeAlert ? <FontAwesomeIcon icon={Icons.sos} /> : "SOS"}
                </span>
            </button>

            {modalState !== "closed" && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: "100vw",
                        height: "100vh",
                        backgroundColor: "rgba(0, 0, 0, 0.6)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 99999,
                        overflow: "hidden",
                    }}
                    onClick={closeModal}
                >
                    <div
                        style={{
                            ...theme.card,
                            maxWidth: "400px",
                            width: "calc(100% - 2rem)",
                            maxHeight: "calc(100vh - 4rem)",
                            overflowY: "auto",
                            padding: "1.5rem",
                            animation: "slideUp 0.2s ease-out",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Type Selection */}
                        {modalState === "type-select" && (
                            <>
                                <div style={{
                                    textAlign: "center",
                                    marginBottom: "1.5rem"
                                }}>
                                    <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}><FontAwesomeIcon icon={Icons.sos} style={{ color: theme.colors.status.danger }} /></div>
                                    <h2 style={{
                                        margin: 0,
                                        fontSize: theme.typography.sizes.xl,
                                        fontWeight: 700,
                                        color: theme.colors.status.danger
                                    }}>
                                        Emergency SOS
                                    </h2>
                                    <p style={{
                                        margin: "0.5rem 0 0",
                                        fontSize: theme.typography.sizes.sm,
                                        color: theme.colors.text.secondary
                                    }}>
                                        Select emergency type
                                    </p>
                                </div>

                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "0.75rem",
                                    marginBottom: "1rem"
                                }}>
                                    {(Object.keys(SOS_TYPE_INFO) as SOSAlertType[]).map((type) => {
                                        const info = SOS_TYPE_INFO[type];
                                        const isSelected = selectedType === type;
                                        return (
                                            <button
                                                key={type}
                                                onClick={() => setSelectedType(type)}
                                                style={{
                                                    padding: "1rem",
                                                    borderRadius: theme.rounded.lg,
                                                    border: `2px solid ${isSelected ? info.color : theme.colors.border}`,
                                                    backgroundColor: isSelected ? `${info.color}10` : "white",
                                                    cursor: "pointer",
                                                    transition: "all 0.2s",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    gap: "0.5rem",
                                                }}
                                            >
                                                <span style={{ fontSize: "1.5rem" }}><FontAwesomeIcon icon={info.icon} /></span>
                                                <span style={{
                                                    fontSize: theme.typography.sizes.xs,
                                                    fontWeight: 600,
                                                    color: isSelected ? info.color : theme.colors.text.secondary
                                                }}>
                                                    {info.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <textarea
                                    placeholder="Brief description (optional)"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    style={{
                                        ...theme.input,
                                        minHeight: "80px",
                                        marginBottom: "1rem",
                                        resize: "vertical",
                                    }}
                                />

                                {geo.lat === null && (
                                    <div style={{
                                        padding: "0.75rem",
                                        backgroundColor: theme.colors.status.warningLight,
                                        borderRadius: theme.rounded.md,
                                        marginBottom: "1rem",
                                        fontSize: theme.typography.sizes.sm,
                                        color: "#92400e"
                                    }}>
                                        <FontAwesomeIcon icon={Icons.safety} /> Location access required for SOS
                                    </div>
                                )}

                                <div style={{ display: "flex", gap: "0.75rem" }}>
                                    <button
                                        onClick={closeModal}
                                        style={{
                                            ...theme.button.base,
                                            ...theme.button.secondary,
                                            flex: 1
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSendSOS}
                                        disabled={geo.lat === null}
                                        style={{
                                            ...theme.button.base,
                                            ...theme.button.danger,
                                            flex: 1,
                                            opacity: geo.lat === null ? 0.5 : 1,
                                        }}
                                    >
                                        <FontAwesomeIcon icon={Icons.alert} /> Send SOS
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Confirming */}
                        {modalState === "confirming" && (
                            <div style={{ textAlign: "center", padding: "2rem 0" }}>
                                <div style={{
                                    width: "60px",
                                    height: "60px",
                                    borderRadius: "50%",
                                    border: "4px solid #e2e8f0",
                                    borderTopColor: theme.colors.status.danger,
                                    animation: "spin 1s linear infinite",
                                    margin: "0 auto 1rem"
                                }} />
                                <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                                    Sending SOS Alert...
                                </div>
                                <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.secondary }}>
                                    Alerting nearby users and authorities
                                </div>
                            </div>
                        )}

                        {/* Active Alert */}
                        {modalState === "active" && activeAlert && (
                            <>
                                <div style={{
                                    textAlign: "center",
                                    marginBottom: "1.5rem"
                                }}>
                                    <div style={{
                                        width: "80px",
                                        height: "80px",
                                        borderRadius: "50%",
                                        backgroundColor: theme.colors.status.dangerLight,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        margin: "0 auto 1rem",
                                        animation: "pulse 2s infinite",
                                    }}>
                                        <span style={{ fontSize: "2.5rem" }}>
                                            <FontAwesomeIcon icon={SOS_TYPE_INFO[activeAlert.type].icon} />
                                        </span>
                                    </div>
                                    <h2 style={{
                                        margin: 0,
                                        fontSize: theme.typography.sizes.xl,
                                        fontWeight: 700,
                                        color: theme.colors.status.danger
                                    }}>
                                        SOS Active
                                    </h2>
                                    <p style={{
                                        margin: "0.5rem 0 0",
                                        fontSize: theme.typography.sizes.sm,
                                        color: theme.colors.text.secondary
                                    }}>
                                        Help is on the way
                                    </p>
                                </div>

                                <div style={{
                                    backgroundColor: theme.colors.bg,
                                    borderRadius: theme.rounded.lg,
                                    padding: "1rem",
                                    marginBottom: "1rem"
                                }}>
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        marginBottom: "0.75rem"
                                    }}>
                                        <span style={{ color: theme.colors.text.muted, fontSize: theme.typography.sizes.sm }}>
                                            Type
                                        </span>
                                        <span style={{ fontWeight: 600 }}>
                                            {SOS_TYPE_INFO[activeAlert.type].label}
                                        </span>
                                    </div>
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        marginBottom: "0.75rem"
                                    }}>
                                        <span style={{ color: theme.colors.text.muted, fontSize: theme.typography.sizes.sm }}>
                                            Responders
                                        </span>
                                        <span style={{ fontWeight: 600, color: theme.colors.status.success }}>
                                            {activeAlert.respondersCount} responding
                                        </span>
                                    </div>
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between"
                                    }}>
                                        <span style={{ color: theme.colors.text.muted, fontSize: theme.typography.sizes.sm }}>
                                            Location shared
                                        </span>
                                        <span style={{ fontWeight: 600, color: theme.colors.status.success }}>
                                            <FontAwesomeIcon icon={Icons.check} /> Yes
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: "0.75rem" }}>
                                    <button
                                        onClick={closeModal}
                                        style={{
                                            ...theme.button.base,
                                            ...theme.button.secondary,
                                            flex: 1
                                        }}
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={handleCancelAlert}
                                        style={{
                                            ...theme.button.base,
                                            backgroundColor: theme.colors.status.warning,
                                            color: "white",
                                            flex: 1
                                        }}
                                    >
                                        I'm Safe - Cancel
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Error */}
                        {modalState === "error" && (
                            <>
                                <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                                    <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}><FontAwesomeIcon icon={Icons.xmark} style={{ color: theme.colors.status.danger }} /></div>
                                    <h2 style={{
                                        margin: 0,
                                        fontSize: theme.typography.sizes.lg,
                                        fontWeight: 700,
                                    }}>
                                        Unable to Send SOS
                                    </h2>
                                    <p style={{
                                        margin: "0.5rem 0 0",
                                        fontSize: theme.typography.sizes.sm,
                                        color: theme.colors.status.danger
                                    }}>
                                        {error}
                                    </p>
                                </div>
                                <button
                                    onClick={closeModal}
                                    style={{
                                        ...theme.button.base,
                                        ...theme.button.primary,
                                        width: "100%"
                                    }}
                                >
                                    Close
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Keyframe animations */}
            <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </>
    );
}
