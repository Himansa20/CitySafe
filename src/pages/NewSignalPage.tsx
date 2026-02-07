import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
  CircleMarker,
} from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { createSignal } from "../services/signals";
import { saveLocalPhoto } from "../services/localPhotos";
import { useAuth } from "../services/useAuth";
import { useGeolocation } from "../services/useGeolocation";
import {
  AFFECTED_GROUPS,
  CATEGORIES,
  type AffectedGroup,
  type Category,
  type NewSignalInput,
} from "../types/signal";

const DEFAULT_CENTER: [number, number] = [6.9271, 79.8612];

function MapAutoCenter({
  enabled,
  lat,
  lng,
  zoom = 16,
}: {
  enabled: boolean;
  lat: number | null;
  lng: number | null;
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;
    if (lat == null || lng == null) return;
    // DEBUG
    // eslint-disable-next-line no-console
    console.log("[MapAutoCenter] setView ->", { lat, lng, zoom });
    map.setView([lat, lng], zoom, { animate: true });
  }, [enabled, lat, lng, zoom, map]);

  return null;
}

function LocationPicker({
  value,
  onChange,
  myLocation,
  followMe,
  accuracy,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (v: { lat: number; lng: number }) => void;
  myLocation: { lat: number | null; lng: number | null };
  followMe: boolean;
  accuracy: number | null;
}) {
  function ClickHandler() {
    useMapEvents({
      click(e) {
        // DEBUG
        // eslint-disable-next-line no-console
        console.log("[LocationPicker] map click ->", e.latlng);
        onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });
    return null;
  }

  const center: [number, number] =
    value
      ? [value.lat, value.lng]
      : myLocation.lat != null && myLocation.lng != null
        ? [myLocation.lat, myLocation.lng]
        : DEFAULT_CENTER;

  return (
    <div style={{ height: 360, border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Follow/center on realtime location */}
        <MapAutoCenter enabled={followMe} lat={myLocation.lat} lng={myLocation.lng} zoom={16} />

        <ClickHandler />

        {/* DEBUG: show location even if not following */}
        {myLocation.lat != null && myLocation.lng != null && (
          <>
            {/* Accuracy halo (bigger + visible for debugging) */}
            {accuracy != null && (
              <CircleMarker
                center={[myLocation.lat, myLocation.lng]}
                radius={Math.min(Math.max(accuracy / 6, 18), 60)} // visible halo
                pathOptions={{
                  color: "blue",
                  fillColor: "blue",
                  fillOpacity: 0.15,
                  weight: 1,
                }}
              />
            )}

            {/* 🔵 Blue dot (big + solid for debugging) */}
            <CircleMarker
              center={[myLocation.lat, myLocation.lng]}
              radius={14}
              pathOptions={{
                color: "blue",
                fillColor: "blue",
                fillOpacity: 1,
                weight: 2,
              }}
            />
          </>
        )}

        {/* 📍 User-selected pin */}
        {value && <Marker position={[value.lat, value.lng]} />}
      </MapContainer>
    </div>
  );
}

export default function NewSignalPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  // follow controls only centering — we ALWAYS watch geolocation so dot can show
  const [followMe, setFollowMe] = useState(true);
  const geo = useGeolocation(true);

  // DEBUG: log geolocation changes
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[Geo] state ->", geo);
  }, [geo.ok, geo.lat, geo.lng, geo.accuracy, geo.error, geo.watching]);

  const [category, setCategory] = useState<Category>("waste");
  const [affectedGroups, setAffectedGroups] = useState<AffectedGroup[]>([]);
  const [severity, setSeverity] = useState<number>(3);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return !!user && description.trim().length >= 5 && !!location && severity >= 1 && severity <= 5;
  }, [user, description, location, severity]);

  function toggleGroup(g: AffectedGroup) {
    setAffectedGroups((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!location) {
      setError("Pick a location by clicking on the map.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const input: NewSignalInput = {
        category,
        affectedGroups,
        severity,
        description: description.trim(),
        lat: location.lat,
        lng: location.lng,
        status: "new",
        hasLocalPhoto: !!photoFile,
        createdBy: user.uid,
      };

      // DEBUG
      // eslint-disable-next-line no-console
      console.log("[Submit] creating signal ->", input);

      const signalId = await createSignal(input);

      // DEBUG
      // eslint-disable-next-line no-console
      console.log("[Submit] created signalId ->", signalId);

      if (photoFile) {
        await saveLocalPhoto(signalId, photoFile);
        // DEBUG
        // eslint-disable-next-line no-console
        console.log("[Submit] saved local photo for ->", signalId);
      }

      nav(`/signal/${signalId}`);
    } catch (err) {
      setError((err as Error)?.message ?? "Failed to create signal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
      <h2>New Signal</h2>

      {/* DEBUG panel */}
      <div style={{ padding: 10, border: "1px dashed #ddd", borderRadius: 10, fontSize: 12, background: "#fafafa" }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Debug</div>
        <div>followMe: {String(followMe)}</div>
        <div>geo.ok: {String(geo.ok)}</div>
        <div>
          geo.lat/lng: {geo.lat ?? "null"}, {geo.lng ?? "null"}
        </div>
        <div>geo.accuracy: {geo.accuracy ?? "null"}</div>
        <div>geo.error: {geo.error ?? "null"}</div>
      </div>

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)} style={{ marginLeft: 8 }}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <div>
          <div style={{ marginBottom: 6 }}>Affected groups</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {AFFECTED_GROUPS.map((g) => (
              <label key={g} style={{ border: "1px solid #eee", padding: "6px 10px", borderRadius: 999 }}>
                <input type="checkbox" checked={affectedGroups.includes(g)} onChange={() => toggleGroup(g)} /> {g}
              </label>
            ))}
          </div>
        </div>

        <label>
          Severity: <b>{severity}</b>
          <input
            type="range"
            min={1}
            max={5}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe the issue..."
            style={{ width: "100%" }}
          />
        </label>

        <div>
          <div style={{ marginBottom: 6 }}>Location (click map to drop pin)</div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
            <button type="button" onClick={() => setFollowMe(true)} style={{ padding: "6px 10px" }}>
              Follow my location
            </button>
            <button type="button" onClick={() => setFollowMe(false)} style={{ padding: "6px 10px" }}>
              Stop following
            </button>
            {geo.error && <span style={{ color: "crimson", fontSize: 12 }}>{geo.error}</span>}
          </div>

          <LocationPicker
            value={location}
            onChange={(v) => {
              setLocation(v);
              setFollowMe(false); // stop auto-centering after user pins
            }}
            followMe={followMe}
            myLocation={{ lat: geo.lat, lng: geo.lng }}
            accuracy={geo.accuracy}
          />

          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
            {location ? `Pinned at (${location.lat.toFixed(5)}, ${location.lng.toFixed(5)})` : "No pin yet."}
          </div>
        </div>

        <label>
          Optional photo (saved ONLY on this device)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            style={{ display: "block", marginTop: 6 }}
          />
        </label>

        {error && <div style={{ color: "crimson" }}>{error}</div>}

        <button type="submit" disabled={!canSubmit || submitting} style={{ padding: "10px 12px" }}>
          {submitting ? "Submitting..." : "Submit Signal"}
        </button>

        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Out of scope: editing signals, upvotes, NGO/admin actions, unsafe paths, heatmaps.
        </div>
      </form>
    </div>
  );
}
