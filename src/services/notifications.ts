import {
    addDoc,
    collection,
    doc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
    writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
    NewNotificationInput,
    UserNotification,
} from "../types/wasteSchedule";

const notificationsCol = collection(db, "userNotifications");

// ─────────────────────────────────────────────────────────────
// Core Operations
// ─────────────────────────────────────────────────────────────

/**
 * Create a notification for a user
 */
export async function createNotification(
    input: NewNotificationInput
): Promise<string> {
    const docRef = await addDoc(notificationsCol, {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        scheduleId: input.scheduleId ?? null,
        zoneId: input.zoneId ?? null,
        read: false,
        createdAt: serverTimestamp(),
    });

    return docRef.id;
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(id: string): Promise<void> {
    const ref = doc(db, "userNotifications", id);
    await updateDoc(ref, { read: true });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
    const q = query(
        notificationsCol,
        where("userId", "==", userId),
        where("read", "==", false)
    );

    const snap = await getDocs(q);
    const batch = writeBatch(db);

    snap.docs.forEach((d) => {
        batch.update(d.ref, { read: true });
    });

    await batch.commit();
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
    const q = query(
        notificationsCol,
        where("userId", "==", userId),
        where("read", "==", false)
    );

    const snap = await getDocs(q);
    return snap.size;
}

/**
 * List notifications for a user
 */
export async function listUserNotifications(
    userId: string,
    opts?: { limit?: number; unreadOnly?: boolean }
): Promise<UserNotification[]> {
    const constraints: Parameters<typeof query>[1][] = [
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
    ];

    if (opts?.unreadOnly) {
        constraints.push(where("read", "==", false));
    }

    const q = query(notificationsCol, ...constraints);
    const snap = await getDocs(q);

    let results = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<UserNotification, "id">),
    }));

    if (opts?.limit) {
        results = results.slice(0, opts.limit);
    }

    return results;
}

/**
 * Subscribe to user notifications in real-time
 */
export function subscribeUserNotifications(
    userId: string,
    callback: (notifications: UserNotification[]) => void,
    onError?: (err: unknown) => void
) {
    const q = query(
        notificationsCol,
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(
        q,
        (snap) => {
            const notifications = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<UserNotification, "id">),
            }));
            callback(notifications);
        },
        (err) => onError?.(err)
    );
}

// ─────────────────────────────────────────────────────────────
// Batch Notification Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Notify all users subscribed to a zone
 */
export async function notifyZoneSubscribers(
    zoneId: string,
    notification: Omit<NewNotificationInput, "userId" | "zoneId">
): Promise<number> {
    // Get all subscriptions for this zone
    const subsQ = query(
        collection(db, "zoneSubscriptions"),
        where("zoneId", "==", zoneId)
    );
    const subsSnap = await getDocs(subsQ);

    if (subsSnap.empty) return 0;

    const batch = writeBatch(db);
    let count = 0;

    for (const subDoc of subsSnap.docs) {
        const userId = subDoc.data().userId as string;
        const notifRef = doc(notificationsCol);

        batch.set(notifRef, {
            userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            scheduleId: notification.scheduleId ?? null,
            zoneId,
            read: false,
            createdAt: serverTimestamp(),
        });

        count++;
    }

    await batch.commit();
    return count;
}
