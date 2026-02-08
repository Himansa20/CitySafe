import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";

export type AdminRouteType = "safe" | "unsafe";

export type AdminRouteSegment = {
    id: string;
    type: AdminRouteType;
    name: string;
    points: { lat: number; lng: number }[];
    description?: string;
    createdAt: any;
    createdBy: string;
};

const COLLECTION = "adminRoutes";

/**
 * Add a new managed route segment
 */
export async function addAdminRoute(
    type: AdminRouteType,
    name: string,
    points: { lat: number; lng: number }[],
    userId: string,
    description?: string
) {
    await addDoc(collection(db, COLLECTION), {
        type,
        name,
        points, // Firestore stores array of objects fine
        createdBy: userId,
        description: description || null,
        createdAt: serverTimestamp(),
    });
}

/**
 * Delete a managed route segment
 */
export async function deleteAdminRoute(routeId: string) {
    await deleteDoc(doc(db, COLLECTION, routeId));
}

/**
 * Subscribe to all managed routes
 */
export function subscribeAdminRoutes(
    callback: (routes: AdminRouteSegment[]) => void,
    onError?: (err: unknown) => void
) {
    const q = query(collection(db, COLLECTION));

    return onSnapshot(
        q,
        (snap) => {
            const routes = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<AdminRouteSegment, "id">),
            }));
            callback(routes);
        },
        (err) => onError?.(err)
    );
}
