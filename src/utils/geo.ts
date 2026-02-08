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
