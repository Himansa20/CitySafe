import type { Timestamp } from "firebase/firestore";
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
    faHospital,
    faTriangleExclamation,
    faFire,
    faCircleQuestion,
} from '@fortawesome/free-solid-svg-icons';

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

// Type icons and labels (now uses Font Awesome icons)
export const SOS_TYPE_INFO: Record<SOSAlertType, { icon: IconDefinition; label: string; color: string }> = {
    medical: { icon: faHospital, label: "Medical Emergency", color: "#ef4444" },
    safety: { icon: faTriangleExclamation, label: "Safety Threat", color: "#f97316" },
    fire: { icon: faFire, label: "Fire Emergency", color: "#dc2626" },
    other: { icon: faCircleQuestion, label: "Other Emergency", color: "#6366f1" },
};
