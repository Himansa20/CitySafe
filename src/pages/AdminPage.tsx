// src/pages/AdminPage.tsx
import { useEffect, useMemo, useState } from "react";
import {
  subscribePriorityQueue,
  updateSignalStatus,
  addActionLog,
  createHelpRequest,
  closeHelpRequest,
  subscribeOpenHelpRequests,
  listSignalsLast7d,
} from "../services/admin";
import type { Signal, SignalStatus } from "../types/signal";
import type { ActionType, HelpRequestType, UserRole } from "../types/admin";
import { useAuth } from "../services/useAuth";
import { getUserRole, getOrCreateUser } from "../services/users";
import { MapContainer, TileLayer, CircleMarker, Marker, Popup } from "react-leaflet";
import AdminNightSafety from "./admin/AdminNightSafety";
import { computeVPI } from "../utils/area";
import { theme } from "../theme";
import AIInsightPanel from "../components/AIInsightPanel";

const DEFAULT_CENTER: [number, number] = [6.9271, 79.8612];

type Tab = "queue" | "help" | "insights" | "night";

export default function AdminPage() {
  const { user } = useAuth();

  const [role, setRole] = useState<UserRole>("citizen");
  const [orgName, setOrgName] = useState<string>("");

  const [tab, setTab] = useState<Tab>("queue");
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);

  // status update form
  const [newStatus, setNewStatus] = useState<SignalStatus>("acknowledged");
  const [assignedOrg, setAssignedOrg] = useState("");

  // action log form
  const [actionType, setActionType] = useState<ActionType>("inspection");
  const [note, setNote] = useState("");

  // help requests
  const [helpReqs, setHelpReqs] = useState<any[]>([]);
  const [helpTitle, setHelpTitle] = useState("");
  const [helpDesc, setHelpDesc] = useState("");
  const [helpType, setHelpType] = useState<HelpRequestType>("volunteer");

  // insights/VPI
  const [vpiAreas, setVpiAreas] = useState<any[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  const [showSignals, setShowSignals] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showHelp, setShowHelp] = useState(true);

  // Role bootstrap
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user) return;
      await getOrCreateUser();
      const r = await getUserRole(user.uid);
      if (!cancelled) setRole(r);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Priority queue subscription
  useEffect(() => {
    return subscribePriorityQueue(setSignals);
  }, []);

  // Open help requests subscription
  useEffect(() => {
    return subscribeOpenHelpRequests(setHelpReqs);
  }, []);

  // VPI compute (last 7 days) + default selected area
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const all = await listSignalsLast7d();
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const areas = computeVPI(all, since).slice(0, 30);
      if (cancelled) return;

      setVpiAreas(areas);

      // pick first area by default
      if (!selectedAreaId && areas[0]?.areaId) {
        setSelectedAreaId(areas[0].areaId);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedAreaId]);

  const center = useMemo(() => {
    if (selectedSignal) return [selectedSignal.lat, selectedSignal.lng] as [number, number];
    if (signals.length) return [signals[0].lat, signals[0].lng] as [number, number];
    return DEFAULT_CENTER;
  }, [selectedSignal, signals]);

  async function onUpdateStatus() {
    if (!selectedSignal) return;
    await updateSignalStatus(selectedSignal.id, { status: newStatus, assignedOrg: assignedOrg || orgName || null });
    alert("Status updated");
  }

  async function onAddActionLog() {
    if (!selectedSignal) return;
    if (!user) return;
    if (!note.trim()) return alert("Add a note");

    await addActionLog({
      signalId: selectedSignal.id,
      createdBy: user.uid,
      createdByRole: role,
      orgName: assignedOrg || orgName || null,
      actionType,
      note: note.trim(),
    });

    setNote("");
    alert("Action log added");
  }

  async function onCreateHelpRequest() {
    if (!user) return;
    if (!helpTitle.trim() || !helpDesc.trim()) return alert("Title + description required");

    await createHelpRequest({
      title: helpTitle.trim(),
      description: helpDesc.trim(),
      type: helpType,
      orgName: (assignedOrg || orgName || "NGO/Admin").trim(),
      createdBy: user.uid,
      signalId: selectedSignal?.id ?? null,
      lat: selectedSignal?.lat ?? null,
      lng: selectedSignal?.lng ?? null,
      areaId: null,
    });

    setHelpTitle("");
    setHelpDesc("");
    alert("Help request created");
  }

  return (
    <div style={{ ...theme.layout.pageContainer, maxWidth: "1400px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2
            style={{
              fontSize: theme.typography.sizes["2xl"],
              fontWeight: 800,
              color: theme.colors.text.primary,
              marginBottom: "0.25rem",
            }}
          >
            Admin Dashboard
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.secondary,
            }}
          >
            <span style={{ fontWeight: 600 }}>Role: {role.toUpperCase()}</span>
            {orgName && <span>• {orgName}</span>}
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: theme.typography.sizes.sm }}>
          <span style={{ color: theme.colors.text.secondary }}>Organization:</span>
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Enter Org Name"
            style={{ ...theme.input, padding: "4px 8px" }}
          />
        </label>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "1rem", borderBottom: `1px solid ${theme.colors.border}`, marginBottom: "1.5rem" }}>
        {[
          { id: "queue", label: "Priority Queue" },
          { id: "help", label: "Help Requests" },
          { id: "insights", label: "Area Insights" },
          { id: "night", label: "Night Safety" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            style={{
              padding: "0.75rem 1rem",
              background: "transparent",
              border: "none",
              borderBottom: tab === t.id ? `2px solid ${theme.colors.primary}` : "2px solid transparent",
              color: tab === t.id ? theme.colors.primary : theme.colors.text.secondary,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: "500px" }}>
        {tab === "night" && <AdminNightSafety />}

        {tab === "queue" && (
          <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "1.5rem", height: "calc(100vh - 250px)" }}>
            {/* List */}
            <div style={{ ...theme.card, display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "1rem", borderBottom: `1px solid ${theme.colors.border}`, fontWeight: 700, backgroundColor: "#f8fafc" }}>
                Priority Queue ({signals.length})
              </div>
              <div style={{ padding: "0.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {signals.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSignal(s)}
                    style={{
                      textAlign: "left",
                      padding: "0.75rem",
                      borderRadius: theme.rounded.md,
                      border: selectedSignal?.id === s.id ? `1px solid ${theme.colors.primary}` : `1px solid ${theme.colors.border}`,
                      backgroundColor: selectedSignal?.id === s.id ? "#eef2ff" : "white",
                      cursor: "pointer",
                      transition: "all 0.1s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <span style={{ fontWeight: 700, fontSize: theme.typography.sizes.sm }}>{String(s.category).replace("_", " ")}</span>
                      <span
                        style={{
                          fontSize: theme.typography.sizes.xs,
                          fontWeight: 600,
                          color: s.status === "new" ? theme.colors.status.danger : theme.colors.text.secondary,
                        }}
                      >
                        {s.status}
                      </span>
                    </div>
                    <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary }}>
                      Score: {Math.round((s.priorityScore ?? 0) * 10) / 10} • Sev: {s.severity}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Detail / Triage */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", paddingRight: "0.5rem" }}>
              {!selectedSignal ? (
                <div style={{ ...theme.card, padding: "3rem", textAlign: "center", color: theme.colors.text.secondary }}>
                  Select a signal from the queue to view details and take action.
                </div>
              ) : (
                <>
                  <div style={{ ...theme.card, padding: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                      <h3 style={{ margin: 0, fontSize: theme.typography.sizes.lg, fontWeight: 800 }}>Signal Details</h3>
                      <span style={{ padding: "2px 8px", borderRadius: "999px", backgroundColor: "#f1f5f9", fontSize: theme.typography.sizes.xs, fontWeight: 600 }}>
                        {selectedSignal.id}
                      </span>
                    </div>

                    <div style={{ marginBottom: "1rem" }}>
                      <strong>Description: </strong> {selectedSignal.description}
                    </div>

                    <div style={{ height: "300px", borderRadius: theme.rounded.md, overflow: "hidden", border: `1px solid ${theme.colors.border}` }}>
                      <MapContainer center={[selectedSignal.lat, selectedSignal.lng]} zoom={15} style={{ height: "100%", width: "100%" }}>
                        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[selectedSignal.lat, selectedSignal.lng]}>
                          <Popup>{selectedSignal.category}</Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    {/* Update Status */}
                    <div style={{ ...theme.card, padding: "1.5rem" }}>
                      <h4 style={{ margin: "0 0 1rem 0", fontSize: theme.typography.sizes.base, fontWeight: 700 }}>Update Status</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as SignalStatus)} style={theme.input}>
                          <option value="new">New</option>
                          <option value="acknowledged">Acknowledged</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                        <input value={assignedOrg} onChange={(e) => setAssignedOrg(e.target.value)} placeholder="Assign Organization (Optional)" style={theme.input} />
                        <button onClick={onUpdateStatus} style={{ ...theme.button.base, ...theme.button.primary, padding: "0.6rem" }}>
                          Update Status
                        </button>
                      </div>
                    </div>

                    {/* Add Action Log */}
                    <div style={{ ...theme.card, padding: "1.5rem" }}>
                      <h4 style={{ margin: "0 0 1rem 0", fontSize: theme.typography.sizes.base, fontWeight: 700 }}>Log Action</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <select value={actionType} onChange={(e) => setActionType(e.target.value as ActionType)} style={theme.input}>
                          <option value="inspection">Inspection</option>
                          <option value="cleanup">Cleanup</option>
                          <option value="lighting_request">Lighting Request</option>
                          <option value="patrol">Patrol</option>
                          <option value="repair">Repair</option>
                          <option value="other">Other</option>
                        </select>
                        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Action Note" style={theme.input} />
                        <button onClick={onAddActionLog} style={{ ...theme.button.base, ...theme.button.secondary, padding: "0.6rem" }}>
                          Add Log Entry
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Create Help Request */}
                  <div style={{ ...theme.card, padding: "1.5rem" }}>
                    <h4 style={{ margin: "0 0 1rem 0", fontSize: theme.typography.sizes.base, fontWeight: 700 }}>Request Community Help</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <input value={helpTitle} onChange={(e) => setHelpTitle(e.target.value)} placeholder="Request Title" style={theme.input} />
                        <select value={helpType} onChange={(e) => setHelpType(e.target.value as HelpRequestType)} style={theme.input}>
                          <option value="volunteer">Volunteer</option>
                          <option value="supplies">Supplies</option>
                          <option value="donation">Donation</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <textarea value={helpDesc} onChange={(e) => setHelpDesc(e.target.value)} placeholder="Description" rows={3} style={theme.input} />
                        <button onClick={onCreateHelpRequest} style={{ ...theme.button.base, ...theme.button.primary, padding: "0.6rem" }}>
                          Publish Request
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {tab === "help" && (
          <div style={{ ...theme.card, padding: "0", overflow: "hidden" }}>
            <div style={{ padding: "1rem", borderBottom: `1px solid ${theme.colors.border}`, fontWeight: 700, backgroundColor: "#f8fafc" }}>
              Active Help Requests
            </div>
            <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
              {helpReqs.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", color: theme.colors.text.secondary, padding: "2rem" }}>No open help requests.</div>
              ) : (
                helpReqs.map((r) => (
                  <div key={r.id} style={{ border: `1px solid ${theme.colors.border}`, borderRadius: theme.rounded.md, padding: "1.5rem", display: "flex", flexDirection: "column" }}>
                    <div style={{ fontWeight: 700, fontSize: theme.typography.sizes.lg, marginBottom: "0.5rem" }}>{r.title}</div>
                    <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary, textTransform: "uppercase", marginBottom: "1rem" }}>
                      {r.type} • {r.orgName}
                    </div>
                    <p style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.secondary, flex: 1, margin: "0 0 1.5rem 0" }}>{r.description}</p>
                    <button
                      onClick={() => closeHelpRequest(r.id)}
                      style={{ ...theme.button.base, ...theme.button.secondary, width: "100%", padding: "0.5rem", fontSize: theme.typography.sizes.sm }}
                    >
                      Close Request
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "insights" && (
          <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "1.5rem" }}>
            {/* Left: VPI list */}
            <div style={{ ...theme.card, padding: 0, overflow: "hidden", height: "fit-content" }}>
              <div style={{ padding: "1rem", borderBottom: `1px solid ${theme.colors.border}`, fontWeight: 700, backgroundColor: "#f8fafc" }}>
                High Priority Areas (VPI)
              </div>

              <div style={{ padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {vpiAreas.slice(0, 10).map((a: any, i: number) => {
                  const active = a.areaId === selectedAreaId;
                  return (
                    <button
                      key={a.areaId}
                      type="button"
                      onClick={() => setSelectedAreaId(a.areaId)}
                      style={{
                        textAlign: "left",
                        width: "100%",
                        padding: "0.75rem",
                        border: "none",
                        borderBottom: i < 9 ? `1px solid ${theme.colors.border}` : "none",
                        background: active ? "#eef2ff" : "white",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: theme.typography.sizes.sm }}>
                        {a.areaId} {active ? "• selected" : ""}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary, marginTop: "0.25rem" }}>
                        <span>
                          VPI Score: <strong>{Math.round(a.vpi * 10) / 10}</strong>
                        </span>
                        <span>Signals: {a.count}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Map + AI panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Map Card */}
              <div style={{ ...theme.card, padding: 0, overflow: "hidden" }}>
                <div
                  style={{
                    padding: "1rem",
                    borderBottom: `1px solid ${theme.colors.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>Data Visualization</div>
                  <div style={{ display: "flex", gap: "1rem", fontSize: theme.typography.sizes.sm }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}>
                      <input type="checkbox" checked={showSignals} onChange={(e) => setShowSignals(e.target.checked)} />
                      Individual Signals
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}>
                      <input type="checkbox" checked={showHotspots} onChange={(e) => setShowHotspots(e.target.checked)} />
                      Area Hotspots
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}>
                      <input type="checkbox" checked={showHelp} onChange={(e) => setShowHelp(e.target.checked)} />
                      Open Help Requests
                    </label>
                  </div>
                </div>

                <div style={{ height: "600px" }}>
                  <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
                    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {showHotspots &&
                      vpiAreas.slice(0, 50).map((a: any) => {
                        const radius = Math.min(60, Math.max(10, a.vpi / 2));
                        const opacity = Math.min(0.6, Math.max(0.15, a.vpi / 40));
                        return (
                          <CircleMarker
                            key={a.areaId}
                            center={[a.centerLat, a.centerLng]}
                            radius={radius}
                            pathOptions={{
                              color: theme.colors.status.danger,
                              fillColor: theme.colors.status.danger,
                              fillOpacity: opacity,
                              weight: 1,
                            }}
                          />
                        );
                      })}

                    {showSignals &&
                      signals.slice(0, 200).map((s) => (
                        <CircleMarker
                          key={s.id}
                          center={[s.lat, s.lng]}
                          radius={6}
                          pathOptions={{
                            color: theme.colors.primary,
                            fillColor: theme.colors.primary,
                            fillOpacity: 0.6,
                            weight: 1,
                          }}
                        >
                          <Popup>
                            <div style={{ fontWeight: 700 }}>{s.category}</div>
                            <div style={{ fontSize: 12 }}>Score: {Math.round((s.priorityScore ?? 0) * 10) / 10}</div>
                          </Popup>
                        </CircleMarker>
                      ))}

                    {showHelp &&
                      helpReqs
                        .filter((r) => r.lat != null && r.lng != null)
                        .map((r) => (
                          <CircleMarker
                            key={r.id}
                            center={[r.lat, r.lng]}
                            radius={8}
                            pathOptions={{
                              color: theme.colors.status.success,
                              fillColor: theme.colors.status.success,
                              fillOpacity: 0.7,
                              weight: 1,
                            }}
                          >
                            <Popup>
                              <div style={{ fontWeight: 700 }}>{r.title}</div>
                              <div style={{ fontSize: 12 }}>{r.type}</div>
                            </Popup>
                          </CircleMarker>
                        ))}
                  </MapContainer>
                </div>
              </div>

              {/* AI Insight Card */}
              {selectedAreaId ? (
                <AIInsightPanel areaId={selectedAreaId} />
              ) : (
                <div style={{ ...theme.card, padding: "1rem", color: theme.colors.text.secondary }}>
                  Select an area to generate an AI Insight.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
