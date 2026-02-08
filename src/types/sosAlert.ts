import type { Timestamp } from "firebase/firestore";

export type SOSAlertType = "medical" | "safety" | "fire" | "other";
export type SOSAlertStatus = "active" | "responding" | "resolved" | "cancelled";

export type SOSAlert = {
    id: string;
    userId: string;
    userName: string;
    userPhone?: string;
    lat: number;
    lng: number;
    message?: string;
    type: SOSAlertType;
    status: SOSAlertStatus;
    createdAt: Timestamp;
    resolvedAt?: Timestamp;
    respondersCount: number;
    responderIds: string[];
};

export type NewSOSAlertInput = {
    type: SOSAlertType;
    message?: string;
    lat: number;
    lng: number;
};

// Type icons and labels
export const SOS_TYPE_INFO: Record<SOSAlertType, { icon: string; label: string; color: string }> = {
    medical: { icon: "🏥", label: "Medical Emergency", color: "#ef4444" },
    safety: { icon: "🚨", label: "Safety Threat", color: "#f97316" },
    fire: { icon: "🔥", label: "Fire Emergency", color: "#dc2626" },
    other: { icon: "❓", label: "Other Emergency", color: "#6366f1" },
};
