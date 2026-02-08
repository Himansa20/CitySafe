import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import {
    isSubscribedToZone,
    subscribeToZone,
    unsubscribeFromZone,
} from "../services/zoneSubscriptions";
import { theme } from "../theme";

type Props = {
    zoneId: string;
    zoneName: string;
    variant?: "default" | "compact";
};

export default function ZoneSubscribeButton({
    zoneId,
    zoneName,
    variant = "default",
}: Props) {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (user) => {
            setUserId(user?.uid ?? null);
        });
        return () => unsubAuth();
    }, []);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        isSubscribedToZone(userId, zoneId)
            .then(setIsSubscribed)
            .finally(() => setLoading(false));
    }, [userId, zoneId]);

    const handleToggle = async () => {
        if (!userId) return;

        setLoading(true);
        try {
            if (isSubscribed) {
                await unsubscribeFromZone(userId, zoneId);
                setIsSubscribed(false);
            } else {
                await subscribeToZone(userId, zoneId, zoneName);
                setIsSubscribed(true);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!userId) {
        return null; // Don't show for logged-out users
    }

    if (variant === "compact") {
        return (
            <button
                onClick={handleToggle}
                disabled={loading}
                style={{
                    background: "none",
                    border: "none",
                    cursor: loading ? "default" : "pointer",
                    padding: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: loading ? 0.5 : 1,
                }}
                title={isSubscribed ? "Unsubscribe from notifications" : "Subscribe to notifications"}
            >
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill={isSubscribed ? theme.colors.primary : "none"}
                    stroke={theme.colors.primary}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    {isSubscribed && <circle cx="18" cy="5" r="3" fill={theme.colors.status.success} stroke={theme.colors.status.success} />}
                </svg>
            </button>
        );
    }

    return (
        <button
            onClick={handleToggle}
            disabled={loading}
            style={{
                ...theme.button.base,
                ...(isSubscribed ? theme.button.secondary : theme.button.primary),
                padding: "0.4rem 0.75rem",
                fontSize: theme.typography.sizes.sm,
                opacity: loading ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
            }}
        >
            {/* Bell icon */}
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={isSubscribed ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {loading ? "..." : isSubscribed ? "Subscribed" : "Subscribe"}
        </button>
    );
}
