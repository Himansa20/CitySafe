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
    updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
    CollectionZone,
    LatLng,
    NewZoneInput,
} from "../types/wasteSchedule";

const zonesCol = collection(db, "collectionZones");

// ─────────────────────────────────────────────────────────────
// Geometry Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Calculate centroid of a polygon
 */
export function calculatePolygonCenter(polygon: LatLng[]): LatLng {
    if (!polygon.length) return { lat: 0, lng: 0 };

    const sum = polygon.reduce(
        (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
        { lat: 0, lng: 0 }
    );

    return {
        lat: sum.lat / polygon.length,
        lng: sum.lng / polygon.length,
    };
}

/**
 * Ray-casting algorithm to check if a point is inside a polygon
 */
export function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
    if (polygon.length < 3) return false;

    let inside = false;
    const { lat: x, lng: y } = point;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lat;
        const yi = polygon[i].lng;
        const xj = polygon[j].lat;
        const yj = polygon[j].lng;

        const intersect =
            yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

        if (intersect) inside = !inside;
    }

    return inside;
}

/**
 * Find which zone contains a given point
 */
export function findZoneForPoint(
    point: LatLng,
    zones: CollectionZone[]
): CollectionZone | null {
    for (const zone of zones) {
        if (isPointInPolygon(point, zone.polygon)) {
            return zone;
        }
    }
    return null;
}

// ─────────────────────────────────────────────────────────────
// CRUD Operations
// ─────────────────────────────────────────────────────────────

/**
 * Create a new collection zone
 */
export async function createZone(
    input: NewZoneInput,
    createdBy: string
): Promise<string> {
    const center = calculatePolygonCenter(input.polygon);

    const docRef = await addDoc(zonesCol, {
        name: input.name,
        polygon: input.polygon,
        centerLat: center.lat,
        centerLng: center.lng,
        color: input.color,
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return docRef.id;
}

/**
 * Update an existing zone
 */
export async function updateZone(
    id: string,
    updates: Partial<Pick<CollectionZone, "name" | "polygon" | "color">>
): Promise<void> {
    const ref = doc(db, "collectionZones", id);

    const updateData: Record<string, unknown> = {
        ...updates,
        updatedAt: serverTimestamp(),
    };

    // Recalculate center if polygon changed
    if (updates.polygon) {
        const center = calculatePolygonCenter(updates.polygon);
        updateData.centerLat = center.lat;
        updateData.centerLng = center.lng;
    }

    await updateDoc(ref, updateData);
}

/**
 * Delete a zone
 */
export async function deleteZone(id: string): Promise<void> {
    const ref = doc(db, "collectionZones", id);
    await deleteDoc(ref);
}

/**
 * Get a zone by ID
 */
export async function getZoneById(id: string): Promise<CollectionZone | null> {
    const ref = doc(db, "collectionZones", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<CollectionZone, "id">) };
}

/**
 * List all zones
 */
export async function listZones(): Promise<CollectionZone[]> {
    const q = query(zonesCol, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CollectionZone, "id">),
    }));
}

/**
 * Subscribe to real-time zone updates
 */
export function subscribeZones(
    callback: (zones: CollectionZone[]) => void,
    onError?: (err: unknown) => void
) {
    const q = query(zonesCol, orderBy("createdAt", "desc"));

    return onSnapshot(
        q,
        (snap) => {
            const zones = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<CollectionZone, "id">),
            }));
            callback(zones);
        },
        (err) => onError?.(err)
    );
}
