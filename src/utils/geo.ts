import type { Timestamp } from "firebase/firestore";

export type LatLng = { lat: number; lng: number };

export type BBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export function computeBBox(polyline: LatLng[]): BBox {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const p of polyline) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return { minLat, maxLat, minLng, maxLng };
}

export function pointInExpandedBBox(point: LatLng, bbox: BBox, delta: number): boolean {
  return (
    point.lat >= bbox.minLat - delta &&
    point.lat <= bbox.maxLat + delta &&
    point.lng >= bbox.minLng - delta &&
    point.lng <= bbox.maxLng + delta
  );
}

export function polylineMidpoint(polyline: LatLng[]): LatLng {
  // MVP midpoint: take middle vertex (good enough for demo)
  const i = Math.floor(polyline.length / 2);
  return polyline[Math.max(0, Math.min(i, polyline.length - 1))];
}

export function isNightTimeLocal(ts: Timestamp | Date): boolean {
  const d = ts instanceof Date ? ts : ts.toDate();
  const h = d.getHours();
  // 19:00–05:00
  return h >= 19 || h < 5;
}

// ─────────────────────────────────────────────────────────────
// Distance calculations for proximity-based features
// ─────────────────────────────────────────────────────────────

/**
 * Calculate the Haversine distance between two coordinates
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if a point is within a given radius of another point
 */
export function isWithinRadius(
  userLat: number,
  userLng: number,
  targetLat: number,
  targetLng: number,
  radiusMeters: number
): boolean {
  const distance = haversineDistance(userLat, userLng, targetLat, targetLng);
  return distance <= radiusMeters;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

// Configuration constants
export const CONFIRMATION_RADIUS_METERS = 500; // Users must be within 500m to confirm
export const REPORTING_RADIUS_METERS = 2000; // Users can report issues within 2km

