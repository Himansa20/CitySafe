import type { Signal } from "../types/signal";

// Grid cell approach: round lat/lng to 2 decimals (~1.1km)
export function areaIdFromLatLng(lat: number, lng: number): string {
  const rLat = Math.round(lat * 100) / 100;
  const rLng = Math.round(lng * 100) / 100;
  return `${rLat.toFixed(2)}_${rLng.toFixed(2)}`;
}

export type AreaVPI = {
  areaId: string;
  centerLat: number;
  centerLng: number;
  vpi: number;
  count: number;
};

export function computeVPI(signals: Signal[], since: Date): AreaVPI[] {
  const m = new Map<string, { vpi: number; count: number; lat: number; lng: number }>();

  for (const s of signals) {
    const dt = s.eventTime?.toDate?.() ?? new Date(0);
    if (dt < since) continue;

    const areaId = areaIdFromLatLng(s.lat, s.lng);
    const centerLat = Math.round(s.lat * 100) / 100;
    const centerLng = Math.round(s.lng * 100) / 100;

    const prev = m.get(areaId) ?? { vpi: 0, count: 0, lat: centerLat, lng: centerLng };
    prev.vpi += Number(s.priorityScore ?? 0);
    prev.count += 1;
    prev.lat = centerLat;
    prev.lng = centerLng;
    m.set(areaId, prev);
  }

  return Array.from(m.entries())
    .map(([areaId, v]) => ({
      areaId,
      centerLat: v.lat,
      centerLng: v.lng,
      vpi: v.vpi,
      count: v.count,
    }))
    .sort((a, b) => b.vpi - a.vpi);
}
