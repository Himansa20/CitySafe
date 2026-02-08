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

      // pick first area by default only if none selected
      setSelectedAreaId((prev) => prev ?? areas[0]?.areaId ?? null);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []); // Only run once on mount

  // Compute center for insights map based on selected area
  const insightsCenter = useMemo(() => {
    const area = vpiAreas.find((a: any) => a.areaId === selectedAreaId);
    if (area) return [area.centerLat, area.centerLng] as [number, number];
    return DEFAULT_CENTER;
  }, [selectedAreaId, vpiAreas]);

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
    <div style={{ ...theme.layout.pageContainer, maxWidth: "1400px", padding: "0" }}>
      {/* New Gradient Header */}
      <div style={{
        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
        padding: "2rem 2rem 4rem 2rem",
        marginBottom: "-3rem",
        borderRadius: "0 0 2rem 2rem",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{
              fontSize: "2rem",
              fontWeight: 800,
              color: "white",
              margin: "0 0 0.25rem 0",
              textShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}>
              ⚡ Admin Command Center
            </h1>
            <p style={{
              color: "rgba(255,255,255,0.85)",
              margin: 0,
              fontSize: theme.typography.sizes.sm,
            }}>
              Manage signals, help requests, area insights, and safety routes
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(8px)",
              padding: "0.5rem 1rem",
              borderRadius: theme.rounded.full,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}>
              <span style={{ color: "white", fontWeight: 700, fontSize: theme.typography.sizes.xs, textTransform: "uppercase" }}>
                {role}
              </span>
              {orgName && (
                <span style={{ color: "rgba(255,255,255,0.85)", fontSize: theme.typography.sizes.xs }}>
                  • {orgName}
                </span>
              )}
            </div>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Set Org Name"
              style={{
                ...theme.input,
                backgroundColor: "rgba(255,255,255,0.9)",
                padding: "0.4rem 0.75rem",
                fontSize: theme.typography.sizes.xs,
                width: "150px",
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area with Cards */}
      <div style={{ padding: "0 2rem 2rem 2rem" }}>

        {/* Stats Overview Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}>
          <div style={{
            ...theme.card,
            padding: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: theme.rounded.lg,
              background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
            }}>📋</div>
            <div>
              <div style={{ fontSize: theme.typography.sizes["2xl"], fontWeight: 700, color: theme.colors.text.primary }}>
                {signals.length}
              </div>
              <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary }}>Total Signals</div>
            </div>
          </div>

          <div style={{
            ...theme.card,
            padding: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: theme.rounded.lg,
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
            }}>🔥</div>
            <div>
              <div style={{ fontSize: theme.typography.sizes["2xl"], fontWeight: 700, color: theme.colors.status.danger }}>
                {signals.filter(s => s.status === "new" || s.status === "acknowledged").length}
              </div>
              <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary }}>Open Issues</div>
            </div>
          </div>

          <div style={{
            ...theme.card,
            padding: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: theme.rounded.lg,
              background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
            }}>📍</div>
            <div>
              <div style={{ fontSize: theme.typography.sizes["2xl"], fontWeight: 700, color: theme.colors.primary }}>
                {vpiAreas.length}
              </div>
              <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary }}>Priority Areas</div>
            </div>
          </div>

          <div style={{
            ...theme.card,
            padding: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: theme.rounded.lg,
              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
            }}>✅</div>
            <div>
              <div style={{ fontSize: theme.typography.sizes["2xl"], fontWeight: 700, color: theme.colors.status.success }}>
                {signals.filter(s => s.status === "resolved").length}
              </div>
              <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary }}>Resolved</div>
            </div>
          </div>
        </div>

        {/* Pill-Style Tabs */}
        <div style={{
          display: "flex",
          gap: "0.5rem",
          padding: "0.5rem",
          backgroundColor: theme.colors.surfaceHover,
          borderRadius: theme.rounded.lg,
          marginBottom: "1.5rem",
          width: "fit-content",
        }}>
          {[
            { id: "queue", label: "Priority Queue", icon: "🚨" },
            { id: "help", label: "Help Requests", icon: "🤝" },
            { id: "insights", label: "Area Insights", icon: "📊" },
            { id: "night", label: "Night Safety", icon: "🌙" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              style={{
                padding: "0.75rem 1.25rem",
                background: tab === t.id
                  ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                  : "transparent",
                border: "none",
                borderRadius: theme.rounded.md,
                color: tab === t.id ? "white" : theme.colors.text.secondary,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: tab === t.id ? theme.shadows.md : "none",
              }}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ minHeight: "500px" }}>
          {tab === "night" && <AdminNightSafety />}

          {tab === "queue" && (
            <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "1.5rem" }}>
              {/* Signal List */}
              <div style={{ ...theme.card, display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", maxHeight: "600px" }}>
                <div style={{
                  padding: "1rem",
                  borderBottom: `1px solid ${theme.colors.border}`,
                  fontWeight: 700,
                  backgroundColor: "#f8fafc",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span>🚨 Priority Queue</span>
                  <span style={{
                    backgroundColor: theme.colors.primary,
                    color: "white",
                    padding: "4px 10px",
                    borderRadius: theme.rounded.full,
                    fontSize: theme.typography.sizes.xs,
                    fontWeight: 700,
                  }}>{signals.length}</span>
                </div>
                <div style={{ padding: "0.75rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {signals.length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: theme.colors.text.secondary }}>
                      No signals in queue
                    </div>
                  ) : (
                    signals.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSignal(s)}
                        style={{
                          textAlign: "left",
                          padding: "1rem",
                          borderRadius: theme.rounded.lg,
                          border: selectedSignal?.id === s.id
                            ? `2px solid ${theme.colors.primary}`
                            : `1px solid ${theme.colors.border}`,
                          backgroundColor: selectedSignal?.id === s.id ? "#eef2ff" : "white",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          boxShadow: selectedSignal?.id === s.id ? theme.shadows.md : "none",
                        }}
                      >
                        {/* Category & Status Row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <span style={{
                            fontWeight: 700,
                            fontSize: theme.typography.sizes.sm,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                          }}>
                            <span style={{ fontSize: "1.1rem" }}>
                              {s.category === "waste" && "🗑️"}
                              {s.category === "safety" && "⚠️"}
                              {s.category === "transport" && "🚌"}
                              {s.category === "flooding" && "🌊"}
                              {s.category === "accessibility" && "♿"}
                              {s.category === "public_space" && "🏞️"}
                            </span>
                            {String(s.category).replace("_", " ").toUpperCase()}
                          </span>
                          <span
                            style={{
                              fontSize: theme.typography.sizes.xs,
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: theme.rounded.full,
                              backgroundColor: s.status === "new"
                                ? theme.colors.status.dangerLight
                                : s.status === "acknowledged"
                                  ? theme.colors.status.warningLight
                                  : s.status === "in_progress"
                                    ? theme.colors.status.infoLight
                                    : theme.colors.status.successLight,
                              color: s.status === "new"
                                ? theme.colors.status.danger
                                : s.status === "acknowledged"
                                  ? theme.colors.status.warning
                                  : s.status === "in_progress"
                                    ? theme.colors.status.info
                                    : theme.colors.status.success,
                            }}
                          >
                            {s.status.replace("_", " ")}
                          </span>
                        </div>

                        {/* Description */}
                        <div style={{
                          fontSize: theme.typography.sizes.sm,
                          color: theme.colors.text.primary,
                          marginBottom: "0.5rem",
                          lineHeight: 1.4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}>
                          {s.description || "No description provided"}
                        </div>

                        {/* Meta Row */}
                        <div style={{
                          display: "flex",
                          gap: "1rem",
                          fontSize: theme.typography.sizes.xs,
                          color: theme.colors.text.muted
                        }}>
                          <span>📊 Score: {Math.round((s.priorityScore ?? 0) * 10) / 10}</span>
                          <span>🔺 Severity: {s.severity}</span>
                          <span>👍 {s.confirmationsCount ?? 0}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Detail / Triage */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {!selectedSignal ? (
                  <div style={{ ...theme.card, padding: "3rem", textAlign: "center", color: theme.colors.text.secondary }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👈</div>
                    Select a signal from the queue to view details and take action.
                  </div>
                ) : (
                  <>
                    {/* Signal Details Card */}
                    <div style={{ ...theme.card, padding: "1.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                        <h3 style={{ margin: 0, fontSize: theme.typography.sizes.lg, fontWeight: 800 }}>📋 Signal Details</h3>
                        <span style={{ padding: "4px 12px", borderRadius: theme.rounded.full, backgroundColor: "#f1f5f9", fontSize: theme.typography.sizes.xs, fontWeight: 600 }}>
                          ID: {selectedSignal.id.slice(0, 8)}...
                        </span>
                      </div>

                      <div style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: theme.colors.surfaceHover, borderRadius: theme.rounded.md }}>
                        <strong>Description:</strong>
                        <p style={{ margin: "0.5rem 0 0 0", lineHeight: 1.5 }}>{selectedSignal.description || "No description"}</p>
                      </div>

                      {/* Map - smaller height */}
                      <div style={{ height: "200px", borderRadius: theme.rounded.lg, overflow: "hidden", border: `1px solid ${theme.colors.border}` }}>
                        <MapContainer key={selectedSignal.id} center={[selectedSignal.lat, selectedSignal.lng]} zoom={15} style={{ height: "100%", width: "100%" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: "1.5rem" }}>
              {/* Left: VPI list */}
              <div style={{ ...theme.card, padding: 0, overflow: "hidden", maxHeight: "750px" }}>
                <div style={{
                  padding: "1rem",
                  borderBottom: `1px solid ${theme.colors.border}`,
                  fontWeight: 700,
                  backgroundColor: "#f8fafc",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span>📍 High Priority Areas (VPI)</span>
                  <span style={{
                    backgroundColor: theme.colors.status.danger,
                    color: "white",
                    padding: "4px 10px",
                    borderRadius: theme.rounded.full,
                    fontSize: theme.typography.sizes.xs,
                    fontWeight: 700,
                  }}>{vpiAreas.length} areas</span>
                </div>

                <div style={{ padding: "0.75rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "680px" }}>
                  {vpiAreas.length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: theme.colors.text.secondary }}>
                      No priority areas detected
                    </div>
                  ) : (
                    vpiAreas.slice(0, 15).map((a: any, i: number) => {
                      const active = a.areaId === selectedAreaId;
                      // Calculate heat level for coloring
                      const heatLevel = Math.min(100, Math.max(0, (a.vpi / 30) * 100));
                      const heatColor = heatLevel > 66 ? theme.colors.status.danger
                        : heatLevel > 33 ? theme.colors.status.warning
                          : theme.colors.status.info;

                      return (
                        <button
                          key={a.areaId}
                          type="button"
                          onClick={() => setSelectedAreaId(a.areaId)}
                          style={{
                            textAlign: "left",
                            width: "100%",
                            padding: "1rem",
                            border: active ? `2px solid ${theme.colors.primary}` : `1px solid ${theme.colors.border}`,
                            borderRadius: theme.rounded.lg,
                            borderLeft: `4px solid ${heatColor}`,
                            background: active ? "#eef2ff" : "white",
                            cursor: "pointer",
                            transition: "all 0.15s",
                            boxShadow: active ? theme.shadows.md : "none",
                          }}
                        >
                          {/* Rank & Area Name */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                backgroundColor: heatColor,
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: theme.typography.sizes.xs,
                                fontWeight: 700,
                              }}>#{i + 1}</span>
                              <span style={{ fontWeight: 700, fontSize: theme.typography.sizes.sm }}>
                                Area {a.areaId.slice(0, 12)}...
                              </span>
                            </div>
                            {active && <span style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.primary, fontWeight: 600 }}>✓ Selected</span>}
                          </div>

                          {/* VPI Score Bar */}
                          <div style={{ marginBottom: "0.75rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: theme.typography.sizes.xs, marginBottom: "4px" }}>
                              <span style={{ color: theme.colors.text.secondary }}>VPI Score</span>
                              <span style={{ fontWeight: 700, color: heatColor }}>{Math.round(a.vpi * 10) / 10}</span>
                            </div>
                            <div style={{ height: "6px", backgroundColor: theme.colors.surfaceHover, borderRadius: "3px", overflow: "hidden" }}>
                              <div style={{
                                height: "100%",
                                width: `${Math.min(100, (a.vpi / 30) * 100)}%`,
                                background: `linear-gradient(90deg, ${theme.colors.status.info} 0%, ${theme.colors.status.warning} 50%, ${theme.colors.status.danger} 100%)`,
                                borderRadius: "3px",
                                transition: "width 0.3s",
                              }} />
                            </div>
                          </div>

                          {/* Stats Row */}
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: "0.5rem",
                            fontSize: theme.typography.sizes.xs,
                          }}>
                            <div style={{
                              backgroundColor: theme.colors.surfaceHover,
                              padding: "0.5rem",
                              borderRadius: theme.rounded.md,
                              textAlign: "center"
                            }}>
                              <div style={{ fontWeight: 700, color: theme.colors.text.primary }}>{a.count}</div>
                              <div style={{ color: theme.colors.text.muted }}>Signals</div>
                            </div>
                            <div style={{
                              backgroundColor: theme.colors.surfaceHover,
                              padding: "0.5rem",
                              borderRadius: theme.rounded.md,
                              textAlign: "center"
                            }}>
                              <div style={{ fontWeight: 700, color: theme.colors.text.primary }}>
                                {a.avgSeverity ? Math.round(a.avgSeverity * 10) / 10 : "N/A"}
                              </div>
                              <div style={{ color: theme.colors.text.muted }}>Avg Sev</div>
                            </div>
                            <div style={{
                              backgroundColor: theme.colors.surfaceHover,
                              padding: "0.5rem",
                              borderRadius: theme.rounded.md,
                              textAlign: "center"
                            }}>
                              <div style={{ fontWeight: 700, color: theme.colors.text.primary }}>
                                {a.mostCommonCategory ? a.mostCommonCategory.slice(0, 6) : "---"}
                              </div>
                              <div style={{ color: theme.colors.text.muted }}>Top Cat</div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right: Map + AI panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Map Card */}
                <div style={{ ...theme.card, padding: 0, overflow: "hidden", position: "relative" }}>
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
                    <div style={{ fontWeight: 700 }}>🗺️ Priority Heatmap</div>
                    <div style={{ display: "flex", gap: "1rem", fontSize: theme.typography.sizes.sm }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}>
                        <input type="checkbox" checked={showSignals} onChange={(e) => setShowSignals(e.target.checked)} />
                        Signals
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}>
                        <input type="checkbox" checked={showHotspots} onChange={(e) => setShowHotspots(e.target.checked)} />
                        Hotspots
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}>
                        <input type="checkbox" checked={showHelp} onChange={(e) => setShowHelp(e.target.checked)} />
                        Help Requests
                      </label>
                    </div>
                  </div>

                  <div style={{ height: "500px", position: "relative" }}>
                    <MapContainer key={`insights-${insightsCenter.join(',')}`} center={insightsCenter} zoom={14} style={{ height: "100%", width: "100%" }}>
                      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                      {/* Hotspots with gradient colors based on VPI */}
                      {showHotspots &&
                        vpiAreas.slice(0, 50).map((a: any) => {
                          // Realistic heat coloring based on VPI score
                          const normalizedVpi = Math.min(1, a.vpi / 30);
                          const radius = Math.min(80, Math.max(20, a.vpi * 2 + a.count * 2));
                          const opacity = Math.min(0.7, Math.max(0.2, normalizedVpi * 0.7));

                          // Color gradient: blue (low) -> yellow (medium) -> red (high)
                          let heatColor;
                          if (normalizedVpi < 0.33) {
                            heatColor = "#3b82f6"; // blue
                          } else if (normalizedVpi < 0.66) {
                            heatColor = "#f59e0b"; // amber/yellow
                          } else {
                            heatColor = "#ef4444"; // red
                          }

                          const isSelected = a.areaId === selectedAreaId;

                          return (
                            <CircleMarker
                              key={a.areaId}
                              center={[a.centerLat, a.centerLng]}
                              radius={radius}
                              pathOptions={{
                                color: isSelected ? theme.colors.primary : heatColor,
                                fillColor: heatColor,
                                fillOpacity: isSelected ? 0.8 : opacity,
                                weight: isSelected ? 3 : 1,
                              }}
                              eventHandlers={{
                                click: () => setSelectedAreaId(a.areaId)
                              }}
                            >
                              <Popup>
                                <div style={{ fontWeight: 700, marginBottom: "4px" }}>Area {a.areaId.slice(0, 8)}...</div>
                                <div style={{ fontSize: "12px" }}>VPI Score: <strong>{Math.round(a.vpi * 10) / 10}</strong></div>
                                <div style={{ fontSize: "12px" }}>Signals: {a.count}</div>
                              </Popup>
                            </CircleMarker>
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

                    {/* Floating Legend */}
                    <div style={{
                      position: "absolute",
                      bottom: "1rem",
                      left: "1rem",
                      backgroundColor: "rgba(255,255,255,0.95)",
                      backdropFilter: "blur(8px)",
                      padding: "1rem",
                      borderRadius: theme.rounded.lg,
                      boxShadow: theme.shadows.lg,
                      zIndex: 1000,
                      minWidth: "180px",
                    }}>
                      <div style={{ fontWeight: 700, fontSize: theme.typography.sizes.sm, marginBottom: "0.75rem" }}>
                        🌡️ Heat Legend
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#ef4444", opacity: 0.7 }} />
                          <span style={{ fontSize: theme.typography.sizes.xs }}>High Priority (VPI 20+)</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#f59e0b", opacity: 0.6 }} />
                          <span style={{ fontSize: theme.typography.sizes.xs }}>Medium Priority (VPI 10-20)</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#3b82f6", opacity: 0.4 }} />
                          <span style={{ fontSize: theme.typography.sizes.xs }}>Low Priority (VPI 0-10)</span>
                        </div>
                        <div style={{ height: "1px", backgroundColor: theme.colors.border, margin: "0.25rem 0" }} />
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: theme.colors.primary }} />
                          <span style={{ fontSize: theme.typography.sizes.xs }}>Individual Signal</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: theme.colors.status.success }} />
                          <span style={{ fontSize: theme.typography.sizes.xs }}>Help Request</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Insight Card */}
                {selectedAreaId ? (
                  <AIInsightPanel areaId={selectedAreaId} />
                ) : (
                  <div style={{ ...theme.card, padding: "2rem", textAlign: "center", color: theme.colors.text.secondary }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🤖</div>
                    Select an area from the list to generate AI insights and recommendations.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
