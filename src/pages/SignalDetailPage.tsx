import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { Link, useParams } from "react-router-dom";
import { subscribeSignalById } from "../services/signals";
import { loadLocalPhotoUrl } from "../services/localPhotos";
import type { Signal } from "../types/signal";
import ConfirmButton from "../components/ConfirmButton";
import { formatScore, getPriorityBadge } from "../utils/scoring";
import { subscribeActionLogsBySignal, subscribeOpenHelpRequests } from "../services/admin";
import { pledgeHelp, hasPledged } from "../services/help";
import { useAuth } from "../services/useAuth";
import { theme } from "../theme";
import { Icon, Icons } from "../icons";

function StatusTimeline({ status }: { status: Signal["status"] }) {
  const steps: Signal["status"][] = ["new", "acknowledged", "in_progress", "resolved"];
  const idx = steps.indexOf(status);

  return (
    <div style={{ display: "flex", padding: "1rem 0", position: "relative", justifyContent: "space-between", maxWidth: "400px" }}>
      {/* Connector Line */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "0",
        right: "0",
        height: "2px",
        backgroundColor: theme.colors.border,
        zIndex: 0,
        transform: "translateY(-50%)"
      }} />

      {steps.map((s, i) => {
        const isActive = i <= idx;
        const isCurrent = i === idx;

        return (
          <div key={s} style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
            <div style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: isActive ? theme.colors.status.success : theme.colors.border,
              border: isCurrent ? `2px solid white` : "none",
              boxShadow: isCurrent ? `0 0 0 2px ${theme.colors.status.success}` : "none",
              transition: "all 0.3s"
            }} />
            <span style={{
              fontSize: "0.65rem",
              color: isActive ? theme.colors.text.primary : theme.colors.text.secondary,
              fontWeight: isActive ? 600 : 400,
              textTransform: "uppercase",
              backgroundColor: theme.colors.surface,
              padding: "0 4px"
            }}>
              {s.replace("_", " ")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function SignalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoTried, setPhotoTried] = useState(false);

  const [logs, setLogs] = useState<any[]>([]);
  const [helpReqs, setHelpReqs] = useState<any[]>([]);
  const [pledgeBusy, setPledgeBusy] = useState<string | null>(null);
  const [pledgeMsg, setPledgeMsg] = useState("");
  const [pledgeState, setPledgeState] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    if (!id) return;
    return subscribeActionLogsBySignal(id, setLogs);
  }, [id]);

  useEffect(() => {
    return subscribeOpenHelpRequests((all) => {
      const related = all.filter((r) => r.signalId === id);
      setHelpReqs(related);
    });
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user) return setPledgeState({});
      const entries: Record<string, boolean> = {};
      for (const r of helpReqs) {
        entries[r.id] = await hasPledged(r.id, user.uid);
      }
      if (!cancelled) setPledgeState(entries);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [helpReqs, user]);

  async function onPledge(helpRequestId: string) {
    if (!user) {
      alert("Please sign in to pledge.");
      return;
    }
    setPledgeBusy(helpRequestId);
    try {
      await pledgeHelp({ helpRequestId, userId: user.uid, message: pledgeMsg.trim() || undefined });
      setPledgeState((p) => ({ ...p, [helpRequestId]: true }));
      setPledgeMsg("");
    } catch (e) {
      alert((e as Error)?.message ?? "Pledge failed");
    } finally {
      setPledgeBusy(null);
    }
  }

  if (loading) return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;

  if (error || !signal) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: theme.colors.status.danger }}>
        <div>{error ?? "Signal not found"}</div>
        <Link to="/" style={{ color: theme.colors.primary, marginTop: "1rem", display: "inline-block" }}>Back to Home</Link>
      </div>
    );
  }

  const badge = getPriorityBadge(signal.priorityScore ?? 0);

  return (
    <div style={{ ...theme.layout.pageContainer, maxWidth: "1000px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: theme.typography.sizes["2xl"], fontWeight: 800 }}>Signal Details</h2>
        <Link to="/" style={{ color: theme.colors.primary, textDecoration: "none", fontWeight: 600, fontSize: theme.typography.sizes.sm }}>
          <Icon icon={Icons.arrowLeft} size="0.75rem" /> Back to Map
        </Link>
      </div>

      {/* Main Card */}
      <div style={{ ...theme.card, padding: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "2rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <h1 style={{ fontSize: theme.typography.sizes["3xl"], fontWeight: 800, margin: 0, color: theme.colors.text.primary, textTransform: "capitalize" }}>
                {signal.category.replace("_", " ")} Issue
              </h1>
              <span style={{
                padding: "4px 12px",
                borderRadius: "999px",
                backgroundColor: theme.colors.primary,
                color: "white",
                fontSize: theme.typography.sizes.sm,
                fontWeight: 600
              }}>
                {badge} Priority
              </span>
            </div>

            <p style={{ fontSize: theme.typography.sizes.lg, color: theme.colors.text.secondary, marginTop: "1rem", lineHeight: 1.6 }}>
              {signal.description}
            </p>
          </div>

          <div style={{ minWidth: "200px" }}>
            <ConfirmButton signalId={signal.id} signalLat={signal.lat} signalLng={signal.lng} />
          </div>
        </div>

        <div style={{ marginTop: "2rem", borderTop: `1px solid ${theme.colors.border}`, paddingTop: "1.5rem" }}>
          <h4 style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.secondary, textTransform: "uppercase", letterSpacing: "1px", margin: 0 }}>Progress Tracker</h4>
          <StatusTimeline status={signal.status} />
        </div>

        <div style={{ marginTop: "1.5rem", display: "flex", gap: "2rem", flexWrap: "wrap", fontSize: theme.typography.sizes.sm, color: theme.colors.text.secondary, backgroundColor: "#f8fafc", padding: "1rem", borderRadius: theme.rounded.DEFAULT }}>
          <div>
            <strong>Affected Groups:</strong> {signal.affectedGroups.join(", ") || "None specified"}
          </div>
          <div>
            <strong>Confirmations:</strong> {signal.confirmationsCount ?? 0}
          </div>
          <div>
            <strong>Score:</strong> {formatScore(signal.priorityScore ?? 0)}
          </div>
        </div>
      </div>

      {/* Grid for Map & Photo */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div style={{ ...theme.card, overflow: "hidden" }}>
          <div style={{ padding: "1rem", borderBottom: `1px solid ${theme.colors.border}`, fontWeight: 700, backgroundColor: "#f8fafc" }}>Location</div>
          {position && (
            <div style={{ height: "350px" }}>
              <MapContainer center={position} zoom={15} style={{ height: "100%", width: "100%" }}>
                <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={position} />
              </MapContainer>
            </div>
          )}
        </div>

        <div style={{ ...theme.card, overflow: "hidden" }}>
          <div style={{ padding: "1rem", borderBottom: `1px solid ${theme.colors.border}`, fontWeight: 700, backgroundColor: "#f8fafc" }}>Photo Evidence</div>
          <div style={{ padding: "1.5rem", height: "350px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f1f5f9" }}>
            {signal.hasLocalPhoto ? (
              photoUrl ? (
                <img src={photoUrl} alt="Local" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: "8px", boxShadow: theme.shadows.md }} />
              ) : photoTried ? (
                <div style={{ textAlign: "center", color: theme.colors.text.secondary }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}><Icon icon={Icons.lock} size="2rem" color={theme.colors.text.secondary} /></div>
                  Photo stored locally on reporter's device
                </div>
              ) : (
                <div>Loading photo...</div>
              )
            ) : (
              <div style={{ color: theme.colors.text.secondary, textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}><Icon icon={Icons.camera} size="2rem" color={theme.colors.text.secondary} /></div>
                No photo attached
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid for Action Logs & Help Requests */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>

        {/* Action Logs */}
        <div style={{ ...theme.card, height: "fit-content" }}>
          <div style={{ padding: "1rem", borderBottom: `1px solid ${theme.colors.border}`, fontWeight: 700, backgroundColor: "#f8fafc" }}>
            Activity Log
          </div>
          <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {logs.length ? (
              logs.map((l) => (
                <div key={l.id} style={{ display: "flex", gap: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "40px" }}>
                    <div style={{ width: "2px", height: "100%", backgroundColor: theme.colors.border, marginBottom: "-10px" }} />
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: theme.colors.primary, border: "2px solid white" }} />
                  </div>
                  <div style={{ paddingBottom: "1.5rem" }}>
                    <div style={{ fontWeight: 600, color: theme.colors.text.primary, fontSize: theme.typography.sizes.sm }}>
                      {l.actionType.toUpperCase()} • <span style={{ color: theme.colors.text.secondary }}>{l.createdByRole} {l.orgName ? `(${l.orgName})` : ""}</span>
                    </div>
                    <div style={{ marginTop: "0.25rem", fontSize: theme.typography.sizes.sm, color: theme.colors.text.secondary }}>
                      {l.note}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: "1rem", borderRadius: "8px", border: `1px dashed ${theme.colors.border}`, textAlign: "center", color: theme.colors.text.secondary, fontSize: theme.typography.sizes.sm }}>
                No actions taken yet.
              </div>
            )}
          </div>
        </div>

        {/* Help Requests */}
        <div style={{ ...theme.card, height: "fit-content" }}>
          <div style={{
            padding: "1rem",
            borderBottom: `1px solid ${theme.colors.border}`,
            fontWeight: 700,
            backgroundColor: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>Help Needed</span>
            {helpReqs.length > 0 && (
              <span style={{ backgroundColor: theme.colors.status.warning, color: "white", padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem" }}>
                {helpReqs.length} Open
              </span>
            )}
          </div>

          <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {helpReqs.length ? (
              helpReqs.map((r) => {
                const pledged = pledgeState[r.id];
                return (
                  <div key={r.id} style={{ border: `1px solid ${theme.colors.border}`, borderRadius: theme.rounded.md, padding: "1rem", backgroundColor: pledged ? "#f0fdf4" : "white" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: 700, color: theme.colors.text.primary }}>{r.title}</span>
                      <span style={{ fontSize: "0.7rem", textTransform: "uppercase", color: theme.colors.text.secondary }}>{r.type}</span>
                    </div>
                    <p style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.secondary, margin: "0 0 1rem 0" }}>
                      {r.description}
                    </p>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {!pledged && (
                        <input
                          placeholder="Your message..."
                          value={pledgeMsg}
                          onChange={(e) => setPledgeMsg(e.target.value)}
                          style={{ ...theme.input, fontSize: "0.8rem", padding: "0.4rem" }}
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => onPledge(r.id)}
                        disabled={!!pledgeBusy || pledged}
                        style={{
                          ...theme.button.base,
                          ...(pledged ? theme.button.secondary : theme.button.primary),
                          backgroundColor: pledged ? theme.colors.status.success : undefined,
                          color: pledged ? "white" : undefined,
                          border: pledged ? "none" : undefined,
                          padding: "0.4rem 0.8rem",
                          fontSize: "0.8rem",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {pledged ? <><Icon icon={Icons.check} size="0.75rem" /> You Pledged</> : pledgeBusy === r.id ? "..." : "Pledge Support"}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: "1rem", borderRadius: "8px", border: `1px dashed ${theme.colors.border}`, textAlign: "center", color: theme.colors.text.secondary, fontSize: theme.typography.sizes.sm }}>
                No active help requests for this signal.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
