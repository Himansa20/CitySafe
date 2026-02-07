import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function MapAutoCenter({
  lat,
  lng,
  zoom = 15,
  enabled,
}: {
  lat: number | null;
  lng: number | null;
  zoom?: number;
  enabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;
    if (lat == null || lng == null) return;
    map.setView([lat, lng], zoom, { animate: true });
  }, [enabled, lat, lng, zoom, map]);

  return null;
}
