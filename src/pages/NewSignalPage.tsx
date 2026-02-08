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
import { theme } from "../theme";
import { haversineDistance, formatDistance, REPORTING_RADIUS_METERS } from "../utils/geo";

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
    <div style={{ height: 360, borderRadius: theme.rounded.lg, overflow: "hidden", border: `1px solid ${theme.colors.border}`, position: "relative" }}>
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapAutoCenter enabled={followMe} lat={myLocation.lat} lng={myLocation.lng} zoom={16} />
        <ClickHandler />

        {myLocation.lat != null && myLocation.lng != null && (
          <>
            {accuracy != null && (
              <CircleMarker
                center={[myLocation.lat, myLocation.lng]}
                radius={Math.min(Math.max(accuracy / 6, 18), 60)}
                pathOptions={{
                  color: theme.colors.status.info,
                  fillColor: theme.colors.status.info,
                  fillOpacity: 0.15,
                  weight: 1,
                }}
              />
            )}
            <CircleMarker
              center={[myLocation.lat, myLocation.lng]}
              radius={8}
              pathOptions={{
                color: "white",
                fillColor: theme.colors.primary,
                fillOpacity: 1,
                weight: 2,
              }}
            />
          </>
        )}

        {value && <Marker position={[value.lat, value.lng]} />}
      </MapContainer>

      {!value && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "rgba(255,255,255,0.9)",
          padding: "0.5rem 1rem",
          borderRadius: theme.rounded.full,
          fontSize: theme.typography.sizes.sm,
          fontWeight: 600,
          color: theme.colors.text.secondary,
          pointerEvents: "none",
          zIndex: 400,
          boxShadow: theme.shadows.md
        }}>
          Click map to set location
        </div>
      )}
    </div>
  );
}

export default function NewSignalPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [followMe, setFollowMe] = useState(true);
  const geo = useGeolocation(true);

  const [category, setCategory] = useState<Category>("waste");
  const [affectedGroups, setAffectedGroups] = useState<AffectedGroup[]>([]);
  const [severity, setSeverity] = useState<number>(3);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate distance from user's location
  const distanceFromUser = useMemo(() => {
    if (geo.lat === null || geo.lng === null || !location) return null;
    return haversineDistance(geo.lat, geo.lng, location.lat, location.lng);
  }, [geo.lat, geo.lng, location]);

  const isTooFar = distanceFromUser !== null && distanceFromUser > REPORTING_RADIUS_METERS;

  const canSubmit = useMemo(() => {
    return !!user && description.trim().length >= 5 && !!location && severity >= 1 && severity <= 5 && !isTooFar;
  }, [user, description, location, severity, isTooFar]);

  function toggleGroup(g: AffectedGroup) {
    setAffectedGroups((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!location) {
      setError("Please select a location on the map.");
      return;
    }
    if (isTooFar) {
      setError(`Location must be within ${formatDistance(REPORTING_RADIUS_METERS)} of your current position.`);
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

      const signalId = await createSignal(input);

      if (photoFile) {
        await saveLocalPhoto(signalId, photoFile);
      }

      nav(`/signal/${signalId}`);
    } catch (err) {
      setError((err as Error)?.message ?? "Failed to create signal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ ...theme.layout.pageContainer, maxWidth: "800px" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: theme.typography.sizes["2xl"], fontWeight: 800, color: theme.colors.text.primary, marginBottom: "0.5rem" }}>
          Report a New Issue
        </h2>
        <p style={{ color: theme.colors.text.secondary }}>
          Identifying problems in your community helps everyone. Please provide accurate details.
        </p>
      </div>

      <div style={{ ...theme.card, padding: "2rem" }}>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Section 1: What & Where */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
              <span style={{ fontSize: theme.typography.sizes.sm, fontWeight: 600, color: theme.colors.text.primary }}>CATEGORY</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                style={theme.input}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace("_", " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ fontSize: theme.typography.sizes.sm, fontWeight: 600, color: theme.colors.text.primary }}>SEVERITY (1-5)</span>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", height: "100%" }}>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value))}
                  style={{ flex: 1, accentColor: theme.colors.primary }}
                />
                <span style={{
                  fontWeight: 800,
                  fontSize: theme.typography.sizes.lg,
                  color: theme.colors.primary,
                  width: "1.5rem",
                  textAlign: "center"
                }}>{severity}</span>
              </div>
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: theme.typography.sizes.sm, fontWeight: 600, color: theme.colors.text.primary }}>DESCRIPTION</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the issue in detail..."
              style={{ ...theme.input, resize: "vertical" }}
            />
          </label>

          <div>
            <span style={{ display: "block", fontSize: theme.typography.sizes.sm, fontWeight: 600, color: theme.colors.text.primary, marginBottom: "0.75rem" }}>
              AFFECTED GROUPS
            </span>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {AFFECTED_GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGroup(g)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "999px",
                    border: `1px solid ${affectedGroups.includes(g) ? theme.colors.primary : theme.colors.border}`,
                    background: affectedGroups.includes(g) ? theme.colors.primary : "transparent",
                    color: affectedGroups.includes(g) ? "white" : theme.colors.text.secondary,
                    fontSize: theme.typography.sizes.sm,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: theme.typography.sizes.sm, fontWeight: 600, color: theme.colors.text.primary }}>
                LOCATION 📍
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setFollowMe(true)}
                  style={{ ...theme.button.base, ...theme.button.ghost, padding: "4px 8px", fontSize: theme.typography.sizes.xs }}
                >
                  Current Location
                </button>
              </div>
            </div>

            <LocationPicker
              value={location}
              onChange={(v) => {
                setLocation(v);
                setFollowMe(false);
              }}
              followMe={followMe}
              myLocation={{ lat: geo.lat, lng: geo.lng }}
              accuracy={geo.accuracy}
            />
            <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary, marginTop: "0.5rem", textAlign: "right" }}>
              {location ? `Selected: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "Click on map to select precise location"}
            </div>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: theme.typography.sizes.sm, fontWeight: 600, color: theme.colors.text.primary }}>PHOTO (Optional)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              style={{ ...theme.input, padding: "0.5rem" }}
            />
            <span style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary }}>
              Note: Photos are saved locally on your device for privacy.
            </span>
          </label>

          {error && <div style={{ color: theme.colors.status.danger, textAlign: "center" }}>{error}</div>}

          <div style={{ borderTop: `1px solid ${theme.colors.border}`, paddingTop: "1.5rem", marginTop: "0.5rem" }}>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              style={{
                ...theme.button.base,
                ...theme.button.primary,
                width: "100%",
                padding: "1rem",
                fontSize: theme.typography.sizes.lg,
                opacity: (!canSubmit || submitting) ? 0.6 : 1
              }}
            >
              {submitting ? "Submitting Report..." : "Submit Signal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
