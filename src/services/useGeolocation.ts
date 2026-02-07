import { useEffect, useState } from "react";

export type GeoState = {
  ok: boolean;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  error: string | null;
  watching: boolean;
};

export function useGeolocation(watch: boolean) {
  const [state, setState] = useState<GeoState>({
    ok: false,
    lat: null,
    lng: null,
    accuracy: null,
    error: null,
    watching: false,
  });

  useEffect(() => {
    if (!watch) return;
    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, error: "Geolocation not supported in this browser." }));
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          ok: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          error: null,
          watching: true,
        });
      },
      (err) => {
        setState((s) => ({
          ...s,
          ok: false,
          error: err.message || "Location permission denied/unavailable.",
          watching: true,
        }));
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [watch]);

  return state;
}
