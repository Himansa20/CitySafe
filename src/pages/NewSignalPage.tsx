import { useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { createSignal } from "../services/signals";
import { saveLocalPhoto } from "../services/localPhotos";
import { useAuth } from "../services/useAuth";
import {
  AFFECTED_GROUPS,
  CATEGORIES,
  type AffectedGroup,
  type Category,
  type NewSignalInput,
} from "../types/signal";

const DEFAULT_CENTER: [number, number] = [6.9271, 79.8612];

function LocationPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (v: { lat: number; lng: number }) => void;
}) {
  function ClickHandler() {
    useMapEvents({
      click(e) {
        onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });
    return null;
  }

  return (
    <div style={{ height: 340, border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
      <MapContainer center={value ? [value.lat, value.lng] : DEFAULT_CENTER} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler />
        {value && <Marker position={[value.lat, value.lng]} />}
      </MapContainer>
    </div>
  );
}

export default function NewSignalPage() {
  const { user } = useAuth();
  const nav = useNavigate();

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

      // 1) Write Firestore (no photo bytes)
      const signalId = await createSignal(input);

      // 2) Save photo locally (IndexedDB), keyed by signalId
      if (photoFile) {
        await saveLocalPhoto(signalId, photoFile);
      }

      // 3) Navigate to detail
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
          <LocationPicker value={location} onChange={setLocation} />
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
