// Types for route planning
export type LatLng = { lat: number; lng: number };

export type RouteGeometry = {
    coordinates: [number, number][]; // [lng, lat] pairs from OSRM
    distance: number; // meters
    duration: number; // seconds
};

export type RouteWithScore = {
    geometry: RouteGeometry;
    dangerScore: number;
    safetyScore: number; // higher = safer
    dangerZonesCount: number;
    highRiskSegments: { start: number; end: number }[]; // indices into coordinates
    recommendation: "safest" | "fastest" | "balanced" | null;
};

export type RoutePlanResult = {
    routes: RouteWithScore[];
    startPoint: LatLng;
    endPoint: LatLng;
    aiRecommendation?: {
        recommendedIndex: number;
        explanation: string;
    };
};

/**
 * Fetch route alternatives from OSRM public API
 */
export async function getOSRMRoutes(
    start: LatLng,
    end: LatLng,
    alternatives: number = 3
): Promise<RouteGeometry[]> {
    const url = `https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${end.lng},${end.lat}?alternatives=${alternatives}&geometries=geojson&overview=full`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== "Ok" || !data.routes) {
        throw new Error(`OSRM error: ${data.code || "No routes found"}`);
    }

    return data.routes.map((route: any) => ({
        coordinates: route.geometry.coordinates,
        distance: route.distance,
        duration: route.duration,
    }));
}

/**
 * Check if a point is within distance of a line segment
 */
function pointToSegmentDistance(
    point: LatLng,
    segStart: [number, number],
    segEnd: [number, number]
): number {
    // Convert to simple planar approximation (good enough for short distances)
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const lat1 = toRad(segStart[1]);
    const lng1 = toRad(segStart[0]);
    const lat2 = toRad(segEnd[1]);
    const lng2 = toRad(segEnd[0]);
    const latP = toRad(point.lat);
    const lngP = toRad(point.lng);

    // Simple distance to line using cross product
    const dx = lng2 - lng1;
    const dy = lat2 - lat1;
    const dpx = lngP - lng1;
    const dpy = latP - lat1;

    const t = Math.max(0, Math.min(1, (dpx * dx + dpy * dy) / (dx * dx + dy * dy || 1)));

    const closestLng = lng1 + t * dx;
    const closestLat = lat1 + t * dy;

    const dlat = latP - closestLat;
    const dlng = lngP - closestLng;

    return R * Math.sqrt(dlat * dlat + dlng * dlng * Math.cos(latP) * Math.cos(latP));
}

export type DangerZone = {
    lat: number;
    lng: number;
    severity: number;
    priorityScore: number;
    category: string;
};


import type { AdminRouteSegment } from "./adminRoutes";

/**
 * Check if a point is within distance of a polyline
 */
function pointToPolylineDistance(
    point: LatLng,
    polyline: { lat: number; lng: number }[]
): number {
    let minDistance = Infinity;
    for (let i = 0; i < polyline.length - 1; i++) {
        const dist = pointToSegmentDistance(
            point,
            [polyline[i].lng, polyline[i].lat],
            [polyline[i + 1].lng, polyline[i + 1].lat]
        );
        if (dist < minDistance) minDistance = dist;
    }
    return minDistance;
}

/**
 * Score a route based on danger zones and admin routes
 */
export function scoreRouteWithDangerZones(
    route: RouteGeometry,
    dangerZones: DangerZone[],
    adminRoutes: AdminRouteSegment[] = [],
    proximityThreshold: number = 150 // meters
): RouteWithScore {
    let totalDangerScore = 0;
    let dangerZonesCount = 0;
    const highRiskSegments: { start: number; end: number }[] = [];

    const coords = route.coordinates;

    // Check each segment of the route
    for (let i = 0; i < coords.length - 1; i++) {
        let segmentDanger = 0;
        const pt = { lat: coords[i][1], lng: coords[i][0] };

        // 1. Check Danger Zones (Signals)
        for (const zone of dangerZones) {
            // Use point distance for signals (points)
            const distance = pointToSegmentDistance(
                { lat: zone.lat, lng: zone.lng },
                coords[i],
                coords[i + 1]
            );

            if (distance <= proximityThreshold) {
                segmentDanger += zone.priorityScore;
                dangerZonesCount++;
            }
        }

        // 2. Check Admin Routes
        for (const ar of adminRoutes) {
            // Check if current route point is close to the admin route
            const dist = pointToPolylineDistance(pt, ar.points);

            if (dist <= 50) { // Closer threshold for manually drawn routes
                if (ar.type === "unsafe") {
                    segmentDanger += 20; // High penalty for marked unsafe zones
                    dangerZonesCount++;
                } else if (ar.type === "safe") {
                    segmentDanger -= 5; // Bonus for safe zones
                }
            }
        }

        if (segmentDanger > 0) {
            totalDangerScore += segmentDanger;

            // Track high-risk segments (danger > 10)
            if (segmentDanger >= 10) {
                // Merge with previous segment if adjacent
                const last = highRiskSegments[highRiskSegments.length - 1];
                if (last && last.end === i) {
                    last.end = i + 1;
                } else {
                    highRiskSegments.push({ start: i, end: i + 1 });
                }
            }
        }
    }

    // Ensure score doesn't go below 0
    totalDangerScore = Math.max(0, totalDangerScore);

    // Safety score: inverse of danger, normalized by distance
    // Higher = safer
    const safetyScore = route.distance / (1 + totalDangerScore);

    return {
        geometry: route,
        dangerScore: Math.round(totalDangerScore * 10) / 10,
        safetyScore: Math.round(safetyScore),
        dangerZonesCount,
        highRiskSegments,
        recommendation: null,
    };
}

/**
 * Plan routes and score them
 */
export async function planSafeRoute(
    start: LatLng,
    end: LatLng,
    dangerZones: DangerZone[],
    adminRoutes: AdminRouteSegment[] = []
): Promise<RoutePlanResult> {
    const rawRoutes = await getOSRMRoutes(start, end, 3);

    const scoredRoutes = rawRoutes.map((route) =>
        scoreRouteWithDangerZones(route, dangerZones, adminRoutes)
    );

    // Sort by safety score (highest first)
    scoredRoutes.sort((a, b) => b.safetyScore - a.safetyScore);

    // Label recommendations
    if (scoredRoutes.length > 0) {
        scoredRoutes[0].recommendation = "safest";
    }

    // Find fastest (shortest distance)
    const fastest = [...scoredRoutes].sort(
        (a, b) => a.geometry.distance - b.geometry.distance
    )[0];
    if (fastest && fastest !== scoredRoutes[0]) {
        fastest.recommendation = "fastest";
    }

    return {
        routes: scoredRoutes,
        startPoint: start,
        endPoint: end,
    };
}

/**
 * Convert route danger zones from signals
 */
export function signalsToDangerZones(signals: any[]): DangerZone[] {
    const safetyCategories = new Set(["safety", "transport", "flooding", "public_space"]);

    return signals
        .filter((s) => safetyCategories.has(s.category) && s.severity >= 2)
        .map((s) => ({
            lat: s.lat,
            lng: s.lng,
            severity: s.severity,
            priorityScore: s.priorityScore ?? s.severity * 2,
            category: s.category,
        }));
}
