import {
    collection,
    doc,
    addDoc,
    updateDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    serverTimestamp,
    arrayUnion,
    increment,
} from "firebase/firestore";
import { db } from "./firebase";
import type { SOSAlert, NewSOSAlertInput, SOSAlertStatus } from "../types/sosAlert";

const sosAlertsCol = collection(db, "sosAlerts");

/**
 * Create a new SOS alert
 */
export async function createSOSAlert(
    input: NewSOSAlertInput,
    userId: string,
    userName: string,
    userPhone?: string
): Promise<string> {
    const docRef = await addDoc(sosAlertsCol, {
        userId,
        userName,
        userPhone: userPhone ?? null,
        lat: input.lat,
        lng: input.lng,
        message: input.message ?? null,
        type: input.type,
        status: "active" as SOSAlertStatus,
        createdAt: serverTimestamp(),
        respondersCount: 0,
        responderIds: [],
    });

    return docRef.id;
}

/**
 * Subscribe to active SOS alerts in real-time
 */
export function subscribeActiveSOSAlerts(
    callback: (alerts: SOSAlert[]) => void,
    onError?: (err: unknown) => void
) {
    const q = query(
        sosAlertsCol,
        where("status", "in", ["active", "responding"]),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(
        q,
        (snap) => {
            const alerts = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<SOSAlert, "id">),
            }));
            callback(alerts);
        },
        (err) => onError?.(err)
    );
}

/**
 * Subscribe to user's own SOS alerts
 */
export function subscribeUserSOSAlerts(
    userId: string,
    callback: (alerts: SOSAlert[]) => void,
    onError?: (err: unknown) => void
) {
    const q = query(
        sosAlertsCol,
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(
        q,
        (snap) => {
            const alerts = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<SOSAlert, "id">),
            }));
            callback(alerts);
        },
        (err) => onError?.(err)
    );
}

/**
 * Mark as responding to an alert
 */
export async function respondToSOSAlert(alertId: string, responderId: string): Promise<void> {
    const ref = doc(db, "sosAlerts", alertId);
    await updateDoc(ref, {
        status: "responding",
        respondersCount: increment(1),
        responderIds: arrayUnion(responderId),
    });
}

/**
 * Resolve an SOS alert (mark as handled)
 */
export async function resolveSOSAlert(alertId: string): Promise<void> {
    const ref = doc(db, "sosAlerts", alertId);
    await updateDoc(ref, {
        status: "resolved",
        resolvedAt: serverTimestamp(),
    });
}

/**
 * Cancel an SOS alert (by the creator)
 */
export async function cancelSOSAlert(alertId: string): Promise<void> {
    const ref = doc(db, "sosAlerts", alertId);
    await updateDoc(ref, {
        status: "cancelled",
        resolvedAt: serverTimestamp(),
    });
}
