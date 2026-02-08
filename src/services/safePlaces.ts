/**
 * Safe Places Service
 * Uses Overpass API to find nearby safe locations (police, hospitals, post offices)
 */

export type SafePlaceType = "police" | "hospital" | "post_office" | "fire_station" | "pharmacy" | "shelter";

export type SafePlace = {
    id: string;
    name: string;
    type: SafePlaceType;
    lat: number;
    lng: number;
    distance: number; // meters from user
    address?: string;
    phone?: string;
    openingHours?: string;
    isOpen?: boolean;
    openUntil?: string;
};

const SAFE_PLACE_TYPES: Record<SafePlaceType, { osmTag: string; icon: string; label: string }> = {
    police: { osmTag: "amenity=police", icon: "🚔", label: "Police Station" },
    hospital: { osmTag: "amenity=hospital", icon: "🏥", label: "Hospital" },
    post_office: { osmTag: "amenity=post_office", icon: "📮", label: "Post Office" },
    fire_station: { osmTag: "amenity=fire_station", icon: "🚒", label: "Fire Station" },
    pharmacy: { osmTag: "amenity=pharmacy", icon: "💊", label: "Pharmacy" },
    shelter: { osmTag: "amenity=shelter", icon: "🏠", label: "Shelter" },
};

export { SAFE_PLACE_TYPES };


/**
 * Calculate distance between two points (Haversine formula)
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Parse OSM opening hours format
 * Returns whether place is currently open and when it closes
 */
function parseOpeningHours(hoursStr: string | undefined, currentTime: Date): { isOpen: boolean; openUntil?: string } {
    if (!hoursStr) return { isOpen: true }; // Assume open if no data

    // Handle 24/7
    if (hoursStr === "24/7") return { isOpen: true, openUntil: "24/7" };

    // Simple parsing for common formats like "Mo-Fr 08:00-17:00"
    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const currentDay = dayNames[currentTime.getDay()];
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentMinutes = currentHour * 60 + currentMinute;

    // Try to find today's hours
    const parts = hoursStr.split(";").map(s => s.trim());

    for (const part of parts) {
        // Match patterns like "Mo-Fr 08:00-17:00" or "Mo 09:00-18:00"
        const match = part.match(/([A-Za-z,-]+)\s+(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
        if (!match) continue;

        const [, days, openH, openM, closeH, closeM] = match;

        // Check if current day is in the days range
        const daysDef = days.toUpperCase();
        let includesDay = false;

        if (daysDef.includes("-")) {
            const [startDay, endDay] = daysDef.split("-");
            const startIdx = dayNames.findIndex(d => d.toUpperCase() === startDay.toUpperCase().substring(0, 2));
            const endIdx = dayNames.findIndex(d => d.toUpperCase() === endDay.toUpperCase().substring(0, 2));
            const currentIdx = dayNames.findIndex(d => d === currentDay);

            if (startIdx !== -1 && endIdx !== -1 && currentIdx !== -1) {
                if (startIdx <= endIdx) {
                    includesDay = currentIdx >= startIdx && currentIdx <= endIdx;
                } else {
                    includesDay = currentIdx >= startIdx || currentIdx <= endIdx;
                }
            }
        } else {
            includesDay = daysDef.includes(currentDay.toUpperCase());
        }

        if (includesDay) {
            const openMinutes = parseInt(openH) * 60 + parseInt(openM);
            const closeMinutes = parseInt(closeH) * 60 + parseInt(closeM);

            if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
                return { isOpen: true, openUntil: `${closeH}:${closeM}` };
            } else {
                return { isOpen: false, openUntil: `Opens ${openH}:${openM}` };
            }
        }
    }

    return { isOpen: false };
}

/**
 * Fetch nearby safe places using Overpass API
 */
export async function findNearbySafePlaces(
    userLat: number,
    userLng: number,
    radiusMeters: number = 1000,
    types: SafePlaceType[] = ["police", "hospital", "fire_station"]
): Promise<SafePlace[]> {
    // Build Overpass query
    const typeQueries = types.map(t => {
        const [key, value] = SAFE_PLACE_TYPES[t].osmTag.split("=");
        return `node["${key}"="${value}"](around:${radiusMeters},${userLat},${userLng});`;
    }).join("\n");

    const query = `
    [out:json][timeout:10];
    (
      ${typeQueries}
    );
    out body;
  `;

    try {
        const response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: query,
        });

        if (!response.ok) {
            throw new Error(`Overpass API error: ${response.status}`);
        }

        const data = await response.json();
        const currentTime = new Date();

        const places: SafePlace[] = data.elements.map((el: any) => {
            const type = types.find(t => {
                const [key, value] = SAFE_PLACE_TYPES[t].osmTag.split("=");
                return el.tags?.[key] === value;
            }) || "police";

            const distance = haversineDistance(userLat, userLng, el.lat, el.lon);
            const { isOpen, openUntil } = parseOpeningHours(el.tags?.opening_hours, currentTime);

            return {
                id: String(el.id),
                name: el.tags?.name || SAFE_PLACE_TYPES[type].label,
                type,
                lat: el.lat,
                lng: el.lon,
                distance: Math.round(distance),
                address: el.tags?.["addr:full"] || el.tags?.["addr:street"],
                phone: el.tags?.phone || el.tags?.["contact:phone"],
                openingHours: el.tags?.opening_hours,
                isOpen,
                openUntil,
            };
        });

        // Sort by distance
        places.sort((a, b) => a.distance - b.distance);

        return places;
    } catch (error) {
        console.error("Failed to fetch safe places:", error);
        return [];
    }
}

/**
 * Get AI recommendation for best safe place
 */
export async function getAISafePlaceRecommendation(
    places: SafePlace[],
    dangerType: string
): Promise<{ recommendedId: string; explanation: string } | null> {
    if (places.length === 0) return null;

    try {
        const response = await fetch("http://localhost:8787/recommendSafePlace", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                places: places.slice(0, 5).map(p => ({
                    id: p.id,
                    name: p.name,
                    type: p.type,
                    distance: p.distance,
                    isOpen: p.isOpen,
                    openUntil: p.openUntil,
                })),
                dangerType,
                currentTime: new Date().toISOString(),
            }),
        });

        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}

// ============================================
// ADMIN-MANAGED SAFE PLACES (Firebase)
// ============================================

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";

export type AdminSafePlace = {
    id: string;
    name: string;
    type: SafePlaceType;
    lat: number;
    lng: number;
    address?: string;
    phone?: string;
    is24Hours: boolean;
    description?: string;
    createdAt: Date;
    createdBy: string;
};

export type NewAdminSafePlaceInput = Omit<AdminSafePlace, "id" | "createdAt">;

const adminSafePlacesCol = collection(db, "safePlaces");

/**
 * Subscribe to admin-managed safe places
 */
export function subscribeAdminSafePlaces(
    onData: (places: AdminSafePlace[]) => void,
    onError?: (err: Error) => void
): () => void {
    const q = query(adminSafePlacesCol, orderBy("name"));

    return onSnapshot(
        q,
        (snapshot) => {
            const places: AdminSafePlace[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
            })) as AdminSafePlace[];
            onData(places);
        },
        (err) => {
            console.error("Error subscribing to admin safe places:", err);
            onError?.(err);
        }
    );
}

/**
 * Add a new admin-managed safe place
 */
export async function addAdminSafePlace(input: NewAdminSafePlaceInput): Promise<string> {
    const docRef = await addDoc(adminSafePlacesCol, {
        ...input,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
}

/**
 * Update an admin-managed safe place
 */
export async function updateAdminSafePlace(id: string, updates: Partial<NewAdminSafePlaceInput>): Promise<void> {
    const ref = doc(db, "safePlaces", id);
    await updateDoc(ref, updates);
}

/**
 * Delete an admin-managed safe place
 */
export async function deleteAdminSafePlace(id: string): Promise<void> {
    const ref = doc(db, "safePlaces", id);
    await deleteDoc(ref);
}

