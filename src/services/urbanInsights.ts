
import type { Signal } from "../types/signal";

const AI_PROXY_URL = "http://localhost:8787";

export type UrbanPOI = {
    id: string;
    type: string;
    lat: number;
    lng: number;
    distance: number;
    tags: Record<string, string>;
};

export type AreaInsight = {
    priorityLevel: "High" | "Medium" | "Low";
    mainIssue: string;
    proposedSolution: string;
    reasoning: string;
    missingInfrastructure: string[];
};

/**
 * Fetch nearby urban infrastructure using Overpass API
 * We look for: street lights, police, hospitals, bus stops, waste bins
 */
export async function fetchUrbanInfrastructure(lat: number, lng: number, radius = 500): Promise<UrbanPOI[]> {
    const query = `
    [out:json][timeout:25];
    (
      node["highway"="street_lamp"](around:${radius},${lat},${lng});
      node["amenity"="police"](around:${radius},${lat},${lng});
      node["amenity"="hospital"](around:${radius},${lat},${lng});
      node["highway"="bus_stop"](around:${radius},${lat},${lng});
      node["amenity"="waste_basket"](around:${radius},${lat},${lng});
      node["amenity"="recycling"](around:${radius},${lat},${lng});
    );
    out body;
    >;
    out skel qt;
  `;

    try {
        const response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: query,
        });

        if (!response.ok) throw new Error("Overpass API failed");

        const data = await response.json();
        return data.elements.map((el: any) => ({
            id: el.id,
            type: mapOverpassType(el.tags),
            lat: el.lat,
            lng: el.lon,
            distance: calculateDistance(lat, lng, el.lat, el.lon),
            tags: el.tags || {},
        }));
    } catch (err) {
        console.error("Failed to fetch infrastructure", err);
        return [];
    }
}

function mapOverpassType(tags: any): string {
    if (tags.highway === "street_lamp") return "Street Light";
    if (tags.amenity === "police") return "Police Station";
    if (tags.amenity === "hospital") return "Hospital";
    if (tags.highway === "bus_stop") return "Bus Stop";
    if (tags.amenity === "waste_basket" || tags.amenity === "recycling") return "Waste Bin";
    return "Infrastructure";
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
}

/**
 * Get AI analysis for the area
 */
export async function getAreaInsight(
    signals: Signal[],
    pois: UrbanPOI[],
    userLocation: { lat: number; lng: number }
): Promise<AreaInsight> {
    try {
        const response = await fetch(`${AI_PROXY_URL}/areaInsight`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ signals, pois, userLocation }),
        });

        if (!response.ok) throw new Error("AI Proxy failed");
        return await response.json();
    } catch (err) {
        console.error("AI Insight failed", err);
        // Return safe fallback
        return {
            priorityLevel: "Low",
            mainIssue: "Data Analysis Unavailable",
            proposedSolution: "Please check back later.",
            reasoning: "AI service connection failed.",
            missingInfrastructure: []
        };
    }
}
