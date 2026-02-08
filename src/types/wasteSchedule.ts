import type { Timestamp } from "firebase/firestore";

// ─────────────────────────────────────────────────────────────
// Schedule Types
// ─────────────────────────────────────────────────────────────

export type RecurrenceType = "once" | "daily" | "weekly" | "biweekly" | "monthly";
export type ScheduleStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

// ─────────────────────────────────────────────────────────────
// Collection Zone (Admin-drawn polygon on map)
// ─────────────────────────────────────────────────────────────

export type LatLng = {
    lat: number;
    lng: number;
};

export type CollectionZone = {
    id: string;
    name: string;
    polygon: LatLng[];
    centerLat: number;
    centerLng: number;
    color: string;
    createdBy: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
};

export type NewZoneInput = {
    name: string;
    polygon: LatLng[];
    color: string;
};

// ─────────────────────────────────────────────────────────────
// Waste Collection Schedule
// ─────────────────────────────────────────────────────────────

export type WasteSchedule = {
    id: string;
    title: string;
    description: string;
    zoneId: string;
    zoneName: string;
    zonePolygon: LatLng[];
    scheduledDate: Timestamp;
    recurrence: RecurrenceType;
    estimatedDuration: number; // minutes
    status: ScheduleStatus;
    assignedTeam?: string;
    createdBy: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
};

export type NewScheduleInput = {
    title: string;
    description: string;
    zoneId: string;
    scheduledDate: Date;
    recurrence: RecurrenceType;
    estimatedDuration: number;
    assignedTeam?: string;
};

// ─────────────────────────────────────────────────────────────
// Waste Hotspot (Computed analytics)
// ─────────────────────────────────────────────────────────────

export type WasteHotspot = {
    zoneId: string;
    zoneName: string;
    polygon: LatLng[];
    centerLat: number;
    centerLng: number;
    wasteSignalCount: number;
    totalPriorityScore: number;
    avgSeverity: number;
    unresolvedCount: number;
    lastCollectionDate?: Date;
    daysSinceCollection: number;
    demandScore: number;
    recommendedFrequency: RecurrenceType;
};

// ─────────────────────────────────────────────────────────────
// User Notifications
// ─────────────────────────────────────────────────────────────

export type NotificationType =
    | "schedule_created"
    | "schedule_reminder"
    | "schedule_updated"
    | "collection_complete"
    | "zone_alert";

export type UserNotification = {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    scheduleId?: string;
    zoneId?: string;
    read: boolean;
    createdAt: Timestamp;
};

export type NewNotificationInput = {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    scheduleId?: string;
    zoneId?: string;
};

// ─────────────────────────────────────────────────────────────
// User Zone Subscriptions
// ─────────────────────────────────────────────────────────────

export type ZoneSubscription = {
    id: string;
    userId: string;
    zoneId: string;
    zoneName: string;
    createdAt: Timestamp;
};

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

export const ZONE_COLORS = [
    "#6366f1", // indigo
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // violet
    "#06b6d4", // cyan
    "#ec4899", // pink
    "#84cc16", // lime
] as const;

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
    once: "One-time",
    daily: "Daily",
    weekly: "Weekly",
    biweekly: "Every 2 Weeks",
    monthly: "Monthly",
};

export const STATUS_LABELS: Record<ScheduleStatus, string> = {
    scheduled: "Scheduled",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
};
