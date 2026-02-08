import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import { db } from "./firebase";
import { getZoneById } from "./collectionZones";
import type {
    NewScheduleInput,
    ScheduleStatus,
    WasteSchedule,
} from "../types/wasteSchedule";

const schedulesCol = collection(db, "wasteSchedules");

// ─────────────────────────────────────────────────────────────
// CRUD Operations
// ─────────────────────────────────────────────────────────────

/**
 * Create a new waste collection schedule
 */
export async function createSchedule(
    input: NewScheduleInput,
    createdBy: string
): Promise<string> {
    // Fetch zone data to denormalize
    const zone = await getZoneById(input.zoneId);
    if (!zone) {
        throw new Error("Zone not found");
    }

    const docRef = await addDoc(schedulesCol, {
        title: input.title,
        description: input.description,
        zoneId: input.zoneId,
        zoneName: zone.name,
        zonePolygon: zone.polygon,
        scheduledDate: Timestamp.fromDate(input.scheduledDate),
        recurrence: input.recurrence,
        estimatedDuration: input.estimatedDuration,
        status: "scheduled" as ScheduleStatus,
        assignedTeam: input.assignedTeam ?? null,
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return docRef.id;
}

/**
 * Update an existing schedule
 */
export async function updateSchedule(
    id: string,
    updates: Partial<
        Pick<
            WasteSchedule,
            | "title"
            | "description"
            | "scheduledDate"
            | "recurrence"
            | "estimatedDuration"
            | "status"
            | "assignedTeam"
        >
    >
): Promise<void> {
    const ref = doc(db, "wasteSchedules", id);

    const updateData: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.scheduledDate !== undefined) updateData.scheduledDate = updates.scheduledDate;
    if (updates.recurrence !== undefined) updateData.recurrence = updates.recurrence;
    if (updates.estimatedDuration !== undefined) updateData.estimatedDuration = updates.estimatedDuration;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.assignedTeam !== undefined) updateData.assignedTeam = updates.assignedTeam;

    await updateDoc(ref, updateData);
}

/**
 * Update schedule status
 */
export async function updateScheduleStatus(
    id: string,
    status: ScheduleStatus
): Promise<void> {
    await updateSchedule(id, { status });
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(id: string): Promise<void> {
    const ref = doc(db, "wasteSchedules", id);
    await deleteDoc(ref);
}

/**
 * Get schedule by ID
 */
export async function getScheduleById(id: string): Promise<WasteSchedule | null> {
    const ref = doc(db, "wasteSchedules", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<WasteSchedule, "id">) };
}

/**
 * List all schedules
 */
export async function listSchedules(opts?: {
    zoneId?: string;
    status?: ScheduleStatus;
    limit?: number;
}): Promise<WasteSchedule[]> {
    const constraints: Parameters<typeof query>[1][] = [
        orderBy("scheduledDate", "asc"),
    ];

    if (opts?.zoneId) {
        constraints.push(where("zoneId", "==", opts.zoneId));
    }

    if (opts?.status) {
        constraints.push(where("status", "==", opts.status));
    }

    const q = query(schedulesCol, ...constraints);
    const snap = await getDocs(q);

    return snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WasteSchedule, "id">),
    }));
}

/**
 * Get upcoming schedules for a zone within N days
 */
export async function getUpcomingSchedules(
    zoneId: string,
    days: number = 7
): Promise<WasteSchedule[]> {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const q = query(
        schedulesCol,
        where("zoneId", "==", zoneId),
        where("scheduledDate", ">=", Timestamp.fromDate(now)),
        where("scheduledDate", "<=", Timestamp.fromDate(future)),
        orderBy("scheduledDate", "asc")
    );

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WasteSchedule, "id">),
    }));
}

/**
 * Subscribe to real-time schedule updates
 */
export function subscribeSchedules(
    callback: (schedules: WasteSchedule[]) => void,
    onError?: (err: unknown) => void,
    opts?: { zoneIds?: string[] }
) {
    const constraints: Parameters<typeof query>[1][] = [
        orderBy("scheduledDate", "asc"),
    ];

    if (opts?.zoneIds?.length && opts.zoneIds.length <= 10) {
        constraints.push(where("zoneId", "in", opts.zoneIds));
    }

    const q = query(schedulesCol, ...constraints);

    return onSnapshot(
        q,
        (snap) => {
            const schedules = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<WasteSchedule, "id">),
            }));
            callback(schedules);
        },
        (err) => onError?.(err)
    );
}

/**
 * Get schedules for the current week
 */
export async function getWeekSchedules(): Promise<WasteSchedule[]> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const q = query(
        schedulesCol,
        where("scheduledDate", ">=", Timestamp.fromDate(startOfWeek)),
        where("scheduledDate", "<", Timestamp.fromDate(endOfWeek)),
        orderBy("scheduledDate", "asc")
    );

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WasteSchedule, "id">),
    }));
}
