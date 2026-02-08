import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import {
    subscribeUserNotifications,
    markNotificationAsRead,
    markAllAsRead,
} from "../services/notifications";
import type { UserNotification } from "../types/wasteSchedule";
import { theme } from "../theme";

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (user) => {
            setUserId(user?.uid ?? null);
        });
        return () => unsubAuth();
    }, []);

    useEffect(() => {
        if (!userId) {
            setNotifications([]);
            return;
        }

        const unsub = subscribeUserNotifications(userId, setNotifications);
        return () => unsub();
    }, [userId]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const handleMarkAsRead = async (id: string) => {
        await markNotificationAsRead(id);
    };

    const handleMarkAllAsRead = async () => {
        if (userId) {
            await markAllAsRead(userId);
        }
    };

    if (!userId) return null;

    return (
        <div style={{ position: "relative" }}>
            {/* Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.5rem",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
                aria-label="Notifications"
            >
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={theme.colors.text.secondary}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>

                {/* Badge */}
                {unreadCount > 0 && (
                    <span
                        style={{
                            position: "absolute",
                            top: "2px",
                            right: "2px",
                            backgroundColor: theme.colors.status.danger,
                            color: "white",
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            minWidth: "16px",
                            height: "16px",
                            borderRadius: "9999px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 4px",
                        }}
                    >
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Click-away overlay */}
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999,
                        }}
                        onClick={() => setIsOpen(false)}
                    />

                    <div
                        style={{
                            position: "absolute",
                            top: "100%",
                            right: 0,
                            marginTop: "0.5rem",
                            width: "320px",
                            maxHeight: "400px",
                            backgroundColor: "white",
                            borderRadius: theme.rounded.lg,
                            boxShadow: theme.shadows.lg,
                            border: `1px solid ${theme.colors.border}`,
                            overflow: "hidden",
                            zIndex: 1000,
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                padding: "0.75rem 1rem",
                                borderBottom: `1px solid ${theme.colors.border}`,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <span
                                style={{
                                    fontWeight: 600,
                                    color: theme.colors.text.primary,
                                }}
                            >
                                Notifications
                            </span>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: theme.colors.primary,
                                        cursor: "pointer",
                                        fontSize: theme.typography.sizes.sm,
                                    }}
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div style={{ maxHeight: "340px", overflowY: "auto" }}>
                            {notifications.length === 0 ? (
                                <div
                                    style={{
                                        padding: "2rem 1rem",
                                        textAlign: "center",
                                        color: theme.colors.text.secondary,
                                        fontSize: theme.typography.sizes.sm,
                                    }}
                                >
                                    No notifications yet
                                </div>
                            ) : (
                                notifications.slice(0, 10).map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                                        style={{
                                            padding: "0.75rem 1rem",
                                            borderBottom: `1px solid ${theme.colors.border}`,
                                            backgroundColor: notif.read ? "white" : "#f0f5ff",
                                            cursor: notif.read ? "default" : "pointer",
                                            transition: "background-color 0.2s",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                                gap: "0.5rem",
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <div
                                                    style={{
                                                        fontWeight: notif.read ? 400 : 600,
                                                        color: theme.colors.text.primary,
                                                        fontSize: theme.typography.sizes.sm,
                                                        marginBottom: "0.25rem",
                                                    }}
                                                >
                                                    {notif.title}
                                                </div>
                                                <div
                                                    style={{
                                                        color: theme.colors.text.secondary,
                                                        fontSize: theme.typography.sizes.xs,
                                                        lineHeight: 1.4,
                                                    }}
                                                >
                                                    {notif.message}
                                                </div>
                                            </div>

                                            {!notif.read && (
                                                <div
                                                    style={{
                                                        width: "8px",
                                                        height: "8px",
                                                        borderRadius: "50%",
                                                        backgroundColor: theme.colors.primary,
                                                        flexShrink: 0,
                                                        marginTop: "4px",
                                                    }}
                                                />
                                            )}
                                        </div>

                                        <div
                                            style={{
                                                marginTop: "0.5rem",
                                                fontSize: theme.typography.sizes.xs,
                                                color: theme.colors.text.secondary,
                                            }}
                                        >
                                            {notif.createdAt?.toDate?.()?.toLocaleDateString() ?? ""}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
