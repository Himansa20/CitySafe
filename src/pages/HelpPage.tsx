import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { subscribeHelpRequests, pledgeHelp, hasPledged } from "../services/help";
import { useAuth } from "../services/useAuth";
import { theme } from "../theme";
import { Icon, Icons } from "../icons";

const DEFAULT_CENTER: [number, number] = [6.9271, 79.8612];

type HelpType = "all" | "volunteer" | "supplies" | "donation" | "other";

export default function HelpPage() {
  const { user } = useAuth();
  const [reqs, setReqs] = useState<any[]>([]);
  const [type, setType] = useState<HelpType>("all");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pledged, setPledged] = useState<Record<string, boolean>>({});

  // Subscribe to open help requests
  useEffect(() => {

    const unsub = subscribeHelpRequests(
      { status: "open" },
      (items) => setReqs(items),
      (e) => console.error("Failed to load help requests", e)
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const base = type === "all" ? reqs : reqs.filter((r) => r.type === type);
    return base.map((r) => ({
      ...r,
      lat: r.lat != null ? Number(r.lat) : null,
      lng: r.lng != null ? Number(r.lng) : null,
    }));
  }, [reqs, type]);

  const firstWithCoords = useMemo(() => filtered.find((r) => r.lat != null && r.lng != null), [filtered]);
  const center: [number, number] = firstWithCoords ? [firstWithCoords.lat, firstWithCoords.lng] : DEFAULT_CENTER;

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user) return setPledged({});
      const m: Record<string, boolean> = {};
      for (const r of filtered) {
        m[r.id] = await hasPledged(r.id, user.uid);
      }
      if (!cancelled) setPledged(m);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [filtered, user]);

  async function onPledge(helpRequestId: string) {
    if (!user) {
      alert("Please sign in to pledge.");
      return;
    }
    setBusy(helpRequestId);
    try {
      await pledgeHelp({ helpRequestId, userId: user.uid, message: msg.trim() || undefined });
      setPledged((p) => ({ ...p, [helpRequestId]: true }));
      setMsg("");
    } catch (e) {
      alert((e as Error)?.message ?? "Pledge failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ ...theme.layout.pageContainer, maxWidth: "1200px" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: theme.typography.sizes["2xl"], fontWeight: 800, color: theme.colors.text.primary, marginBottom: "0.5rem" }}>
          Community Help Center
        </h2>
        <p style={{ color: theme.colors.text.secondary }}>
          View open requests for assistance and pledge your support.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "1.5rem", height: "calc(100vh - 180px)" }}>

        {/* Left Column: Map */}
        <div style={{ ...theme.card, padding: 0, overflow: "hidden", position: "relative" }}>
          <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filtered
              .filter((r) => r.lat != null && r.lng != null)
              .map((r) => (
                <Marker key={r.id} position={[r.lat, r.lng]}>
                  <Popup>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div style={{ fontWeight: 700, color: theme.colors.text.primary }}>{r.title}</div>
                      <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary }}>
                        {r.type.toUpperCase()} • {r.orgName}
                      </div>
                      <div style={{ fontSize: theme.typography.sizes.sm }}>{r.description}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>

          <div style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            zIndex: 1000,
            backgroundColor: "white",
            padding: "0.5rem",
            borderRadius: theme.rounded.md,
            boxShadow: theme.shadows.md,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <span style={{ fontSize: theme.typography.sizes.xs, fontWeight: 700, color: theme.colors.text.secondary }}>FILTER:</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as HelpType)}
              style={{ ...theme.input, padding: "2px 8px", fontSize: theme.typography.sizes.xs }}
            >
              <option value="all">All Types</option>
              <option value="volunteer">Volunteer</option>
              <option value="supplies">Supplies</option>
              <option value="donation">Donation</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Right Column: List */}
        <div style={{ ...theme.card, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{
            padding: "1rem",
            borderBottom: `1px solid ${theme.colors.border}`,
            fontWeight: 700,
            fontSize: theme.typography.sizes.lg,
            backgroundColor: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>Active Requests</span>
            <span style={{
              backgroundColor: theme.colors.primary,
              color: "white",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "0.75rem"
            }}>
              {filtered.length}
            </span>
          </div>

          <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", flex: 1 }}>
            {/* Pledge Message Input (Sticky) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: theme.typography.sizes.xs, fontWeight: 600, color: theme.colors.text.secondary }}>
                YOUR PLEDGE MESSAGE (OPTIONAL)
              </label>
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="I can help with this..."
                style={theme.input}
              />
            </div>

            <div style={{ height: "1px", backgroundColor: theme.colors.border, margin: "0.5rem 0" }} />

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: theme.colors.text.secondary }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}><Icon icon={Icons.handshake} size="2rem" color={theme.colors.text.secondary} /></div>
                No matching help requests found.
              </div>
            ) : (
              filtered.map((r) => (
                <div key={r.id} style={{
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.rounded.md,
                  padding: "1rem",
                  transition: "box-shadow 0.2s"
                }}>
                  <div style={{ fontWeight: 700, color: theme.colors.text.primary, marginBottom: "0.25rem" }}>{r.title}</div>
                  <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary, textTransform: "uppercase", marginBottom: "0.5rem" }}>
                    {r.type} • <span style={{ fontWeight: 600 }}>{r.orgName}</span>
                  </div>
                  <p style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.secondary, margin: "0 0 1rem 0" }}>
                    {r.description}
                  </p>

                  <button
                    type="button"
                    onClick={() => onPledge(r.id)}
                    disabled={pledged[r.id] || busy === r.id}
                    style={{
                      ...theme.button.base,
                      ...(pledged[r.id] ? theme.button.secondary : theme.button.primary),
                      backgroundColor: pledged[r.id] ? theme.colors.status.success : undefined,
                      color: pledged[r.id] ? "white" : undefined,
                      border: pledged[r.id] ? "none" : undefined,
                      width: "100%",
                      padding: "0.6rem",
                      fontSize: theme.typography.sizes.sm
                    }}
                  >
                    {pledged[r.id] ? <><Icon icon={Icons.check} size="0.75rem" /> You Pledged</> : busy === r.id ? "Pledging..." : "Pledge Support"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
