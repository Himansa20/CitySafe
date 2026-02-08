import { useEffect, useMemo, useState } from "react";
import SignalList from "../components/SignalList";
import SignalMap from "../components/SignalMap";
import type { Signal } from "../types/signal";
import { AFFECTED_GROUPS, CATEGORIES, type AffectedGroup, type Category } from "../types/signal";
import { applyFilters, type SignalFiltersV2, type TimeWindow } from "../utils/filters";
import { subscribeSignalsV2 } from "../services/signals";
import { useGeolocation } from "../services/useGeolocation";
import { theme } from "../theme";
import { Icon, Icons, getCategoryIcon } from "../icons";
import SOSAlertsPanel from "../components/SOSAlertsPanel";

const DEFAULT_CENTER: [number, number] = [6.9271, 79.8612];

export default function HomePage() {
  const [rawSignals, setRawSignals] = useState<Signal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const geo = useGeolocation(true);

  // Filters
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<AffectedGroup[]>([]);
  const [status, setStatus] = useState<"new" | "all">("new");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("7d");
  const [nightOnly, setNightOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filters: SignalFiltersV2 = useMemo(
    () => ({
      categories,
      affectedGroups: groups,
      status,
      timeWindow,
      nightOnly,
    }),
    [categories, groups, status, timeWindow, nightOnly]
  );

  useEffect(() => {
    setError(null);

    const unsub = subscribeSignalsV2(
      {
        timeWindow,
        categories: categories.length <= 10 ? categories : categories.slice(0, 10),
        status,
      },
      setRawSignals,
      (err) => setError((err as Error)?.message ?? "Failed to load signals")
    );

    return () => unsub();
  }, [timeWindow, categories, status]);

  const signals = useMemo(() => applyFilters(rawSignals, filters), [rawSignals, filters]);

  // Center on user location if available, otherwise use signals or default
  const center: [number, number] = useMemo(() => {
    if (geo.lat !== null && geo.lng !== null) {
      return [geo.lat, geo.lng];
    }
    if (signals.length) {
      return [signals[0].lat, signals[0].lng];
    }
    return DEFAULT_CENTER;
  }, [geo.lat, geo.lng, signals]);

  const userLocation = geo.lat !== null && geo.lng !== null
    ? { lat: geo.lat, lng: geo.lng }
    : null;

  function toggleCategory(c: Category) {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function toggleGroup(g: AffectedGroup) {
    setGroups((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  const activeFilterCount = categories.length + groups.length + (nightOnly ? 1 : 0);

  return (
    <div style={theme.layout.pageContainer}>
      {/* SOS Alerts - Shown prominently at top if any active */}
      <SOSAlertsPanel />

      {/* Header Section */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "0.5rem"
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: theme.typography.sizes["3xl"],
            fontWeight: 800,
            color: theme.colors.text.primary,
            letterSpacing: "-0.025em"
          }}>
            Explore Issues
          </h1>
          <p style={{
            margin: "0.25rem 0 0",
            color: theme.colors.text.secondary,
            fontSize: theme.typography.sizes.sm
          }}>
            {geo.lat !== null ? <><Icon icon={Icons.location} size="0.875rem" /> Showing issues near you</> : "Discover and report civic issues in your area"}
          </p>
        </div>
      </div>

      {/* Quick Filters Bar */}
      <div style={{
        ...theme.card,
        padding: "1rem 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        flexWrap: "wrap"
      }}>
        {/* Status Toggle */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {(["new", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              style={{
                ...theme.chip.base,
                ...(status === s ? theme.chip.active : theme.chip.inactive),
              }}
            >
              {s === "new" ? <><Icon icon={Icons.statusNew} size="0.625rem" color="#ef4444" /> Open</> : <><Icon icon={Icons.list} size="0.75rem" /> All</>}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: "1px", height: "24px", backgroundColor: theme.colors.border }} />

        {/* Time Window */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {(["24h", "7d", "30d"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeWindow(t)}
              style={{
                ...theme.chip.base,
                ...(timeWindow === t ? theme.chip.active : theme.chip.inactive),
              }}
            >
              {t === "24h" ? "24h" : t === "7d" ? "7 days" : "30 days"}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: "1px", height: "24px", backgroundColor: theme.colors.border }} />

        {/* More Filters Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            ...theme.chip.base,
            ...(showFilters || activeFilterCount > 0 ? theme.chip.active : theme.chip.inactive),
            gap: "0.5rem"
          }}
        >
          <span><Icon icon={Icons.filters} size="0.875rem" /> Filters</span>
          {activeFilterCount > 0 && (
            <span style={{
              backgroundColor: theme.colors.primary,
              color: "white",
              padding: "0 6px",
              borderRadius: "999px",
              fontSize: "0.65rem",
              fontWeight: 700
            }}>
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Night Only Toggle */}
        <button
          onClick={() => setNightOnly(!nightOnly)}
          style={{
            ...theme.chip.base,
            ...(nightOnly ? theme.chip.active : theme.chip.inactive),
          }}
        >
          <Icon icon={Icons.moon} size="0.875rem" /> Night only
        </button>

        {/* Clear All */}
        {activeFilterCount > 0 && (
          <button
            onClick={() => {
              setCategories([]);
              setGroups([]);
              setNightOnly(false);
            }}
            style={{
              ...theme.button.base,
              ...theme.button.ghost,
              padding: "0.375rem 0.75rem",
              fontSize: theme.typography.sizes.xs,
              color: theme.colors.status.danger
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Expanded Filters Panel */}
      {showFilters && (
        <div style={{
          ...theme.card,
          padding: "1.25rem",
          animation: "slideDown 0.2s ease-out"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Categories */}
            <div>
              <div style={{
                fontSize: theme.typography.sizes.xs,
                fontWeight: 700,
                color: theme.colors.text.muted,
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}>
                Categories
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategory(c)}
                    style={{
                      ...theme.chip.base,
                      ...(categories.includes(c) ? theme.chip.active : theme.chip.inactive),
                    }}
                  >
                    {getCategoryIcon(c, "0.875rem")}
                    <span style={{ textTransform: "capitalize" }}>{c.replace("_", " ")}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Affected Groups */}
            <div>
              <div style={{
                fontSize: theme.typography.sizes.xs,
                fontWeight: 700,
                color: theme.colors.text.muted,
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}>
                Affected Groups
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {AFFECTED_GROUPS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGroup(g)}
                    style={{
                      ...theme.chip.base,
                      ...(groups.includes(g) ? {
                        backgroundColor: theme.colors.status.successLight,
                        color: "#166534",
                        borderColor: theme.colors.status.success,
                      } : theme.chip.inactive),
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 400px",
        gap: "1.5rem",
        flex: 1,
        minHeight: 0
      }}>
        {/* Map Section */}
        <div style={{
          ...theme.card,
          padding: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{
            padding: "0.875rem 1rem",
            borderBottom: `1px solid ${theme.colors.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: theme.colors.bg
          }}>
            <div style={{
              fontWeight: 600,
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.primary,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              <Icon icon={Icons.map} size="0.875rem" /> Map View
            </div>
            {geo.lat !== null && (
              <span style={{
                fontSize: theme.typography.sizes.xs,
                color: theme.colors.status.success,
                display: "flex",
                alignItems: "center",
                gap: "0.25rem"
              }}>
                <span style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: theme.colors.status.success,
                  animation: "pulse 2s infinite"
                }} />
                Live location
              </span>
            )}
          </div>
          <div style={{ flex: 1, minHeight: "400px" }}>
            <SignalMap
              signals={signals}
              center={center}
              height="100%"
              userLocation={userLocation}
            />
          </div>
        </div>

        {/* Signal List Section */}
        <div style={{
          ...theme.card,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 280px)",
          minHeight: "400px"
        }}>
          <div style={{
            padding: "0.875rem 1rem",
            borderBottom: `1px solid ${theme.colors.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: theme.colors.bg
          }}>
            <div style={{
              fontWeight: 600,
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.primary
            }}>
              <Icon icon={Icons.list} size="0.875rem" /> Recent Signals
            </div>
            <span style={{
              ...theme.badge.base,
              background: theme.colors.gradients.primary,
              color: "white",
            }}>
              {signals.length}
            </span>
          </div>
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.75rem",
            backgroundColor: theme.colors.bg
          }}>
            {error ? (
              <div style={{
                padding: "2rem",
                textAlign: "center",
                color: theme.colors.status.danger
              }}>
                {error}
              </div>
            ) : signals.length === 0 ? (
              <div style={{
                padding: "2rem",
                textAlign: "center",
                color: theme.colors.text.secondary
              }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}><Icon icon={Icons.inbox} size="2rem" color={theme.colors.text.muted} /></div>
                <div>No signals found matching your filters</div>
              </div>
            ) : (
              <SignalList signals={signals} />
            )}
          </div>
        </div>
      </div>

      {/* Add keyframe styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
