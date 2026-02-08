import {
    addDoc,
    collection,
    deleteDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { ZoneSubscription } from "../types/wasteSchedule";

const subscriptionsCol = collection(db, "zoneSubscriptions");

// ─────────────────────────────────────────────────────────────
// User Zone Subscriptions
// ─────────────────────────────────────────────────────────────

/**
 * Subscribe a user to a zone for notifications
 */
export async function subscribeToZone(
    userId: string,
    zoneId: string,
    zoneName: string
): Promise<string> {
    // Check if already subscribed
    const existing = await getUserZoneSubscription(userId, zoneId);
    if (existing) return existing.id;

    const docRef = await addDoc(subscriptionsCol, {
        userId,
        zoneId,
        zoneName,
        createdAt: serverTimestamp(),
    });

    return docRef.id;
}

/**
 * Unsubscribe from a zone
 */
export async function unsubscribeFromZone(
    userId: string,
    zoneId: string
): Promise<void> {
    const q = query(
        subscriptionsCol,
        where("userId", "==", userId),
        where("zoneId", "==", zoneId)
    );

    const snap = await getDocs(q);
    for (const doc of snap.docs) {
        await deleteDoc(doc.ref);
    }
}

/**
 * Check if user is subscribed to a zone
 */
export async function isSubscribedToZone(
    userId: string,
    zoneId: string
): Promise<boolean> {
    const q = query(
        subscriptionsCol,
        where("userId", "==", userId),
        where("zoneId", "==", zoneId)
    );

    const snap = await getDocs(q);
    return !snap.empty;
}

/**
 * Get user's subscription to a specific zone
 */
async function getUserZoneSubscription(
    userId: string,
    zoneId: string
): Promise<ZoneSubscription | null> {
    const q = query(
        subscriptionsCol,
        where("userId", "==", userId),
        where("zoneId", "==", zoneId)
    );

    const snap = await getDocs(q);
    if (snap.empty) return null;

    const doc = snap.docs[0];
    return { id: doc.id, ...(doc.data() as Omit<ZoneSubscription, "id">) };
}

/**
 * Get all zones user is subscribed to
 */
export async function getUserSubscriptions(
    userId: string
): Promise<ZoneSubscription[]> {
    const q = query(
        subscriptionsCol,
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ZoneSubscription, "id">),
    }));
}

/**
 * Subscribe to real-time updates of user's subscriptions
 */
export function subscribeUserSubscriptions(
    userId: string,
    callback: (subscriptions: ZoneSubscription[]) => void,
    onError?: (err: unknown) => void
) {
    const q = query(
        subscriptionsCol,
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(
        q,
        (snap) => {
            const subs = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<ZoneSubscription, "id">),
            }));
            callback(subs);
        },
        (err) => onError?.(err)
    );
}

/**
 * Get all users subscribed to a zone
 */
export async function getZoneSubscribers(zoneId: string): Promise<string[]> {
    const q = query(subscriptionsCol, where("zoneId", "==", zoneId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data().userId as string);
}
