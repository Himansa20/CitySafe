import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { Link, useParams } from "react-router-dom";
import { loadLocalPhotoUrl } from "../services/localPhotos";
import type { Signal } from "../types/signal";
import ConfirmButton from "../components/ConfirmButton";
import { formatScore, getPriorityBadge } from "../utils/scoring";
import { subscribeSignalById } from "../services/signals";

export default function SignalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoTried, setPhotoTried] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const position = useMemo(() => {
    if (!signal) return null;
    return [signal.lat, signal.lng] as [number, number];
  }, [signal]);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    const unsub = subscribeSignalById(
      id,
      async (s) => {
        if (!s) {
          setError("Signal not found.");
          setSignal(null);
          setLoading(false);
          return;
        }

        setSignal(s);
        setLoading(false);

        // Local photo logic (still local-only)
        if (s.hasLocalPhoto) {
          const url = await loadLocalPhotoUrl(s.id);
          setPhotoUrl(url);
          setPhotoTried(true);
        } else {
          setPhotoUrl(null);
          setPhotoTried(true);
        }
      },
      (err) => {
        setError((err as Error)?.message ?? "Failed to load signal");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [id]);

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson" }}>{error}</div>
        <div style={{ marginTop: 10 }}>
          <Link to="/">Back</Link>
        </div>
      </div>
    );
  }

  if (!signal) return null;

  const badge = getPriorityBadge(signal.priorityScore ?? 0);

  return (
    <div
      style={{
        padding: 16,
        maxWidth: 920,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Signal</h2>
        <Link to="/">Back</Link>
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 900 }}>
            {signal.category} • severity {signal.severity} • {signal.status}
          </div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            Priority: <b>{badge}</b> • Score{" "}
            <b>{formatScore(signal.priorityScore ?? 0)}</b>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>{signal.description}</div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
          Groups: {signal.affectedGroups.join(", ") || "—"} • Confirms:{" "}
          {signal.confirmationsCount ?? 0}
        </div>

        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
          Score = severity × confirmations × vulnerability weight
        </div>

        <div style={{ marginTop: 12 }}>
          <ConfirmButton signalId={signal.id} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #eee", fontWeight: 700 }}>
            Location
          </div>
          {position && (
            <div style={{ height: 320 }}>
              <MapContainer center={position} zoom={15} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={position} />
              </MapContainer>
            </div>
          )}
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #eee", fontWeight: 700 }}>
            Photo
          </div>

          <div style={{ padding: 12 }}>
            {signal.hasLocalPhoto ? (
              photoUrl ? (
                <img src={photoUrl} alt="Local" style={{ width: "100%", borderRadius: 8 }} />
              ) : photoTried ? (
                <div
                  style={{
                    padding: 10,
                    background: "#fafafa",
                    border: "1px dashed #ddd",
                    borderRadius: 8,
                  }}
                >
                  Photo stored locally by the reporter (not shared online).
                </div>
              ) : (
                <div>Checking local photo…</div>
              )
            ) : (
              <div
                style={{
                  padding: 10,
                  background: "#fafafa",
                  border: "1px dashed #ddd",
                  borderRadius: 8,
                }}
              >
                No photo attached.
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, opacity: 0.7 }}>
        Out of scope: NGO/admin actions/status changes, unsafe paths, heatmaps.
      </div>
    </div>
  );
}
