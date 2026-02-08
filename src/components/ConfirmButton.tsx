import { useEffect, useState } from "react";
import { confirmSignal, hasConfirmed } from "../services/confirmations";
import { useAuth } from "../services/useAuth";
import { useGeolocation } from "../services/useGeolocation";
import { theme } from "../theme";
import { Icon, Icons } from "../icons";
import {
  haversineDistance,
  formatDistance,
  CONFIRMATION_RADIUS_METERS,
} from "../utils/geo";

type ProximityStatus = "checking" | "within_range" | "too_far" | "no_location";

export default function ConfirmButton({
  signalId,
  signalLat,
  signalLng,
  compact = false,
}: {
  signalId: string;
  signalLat: number;
  signalLng: number;
  compact?: boolean;
}) {
  const { user, loading } = useAuth();
  const geo = useGeolocation(true);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Calculate proximity
  const [proximityStatus, setProximityStatus] = useState<ProximityStatus>("checking");
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    if (geo.lat === null || geo.lng === null) {
      if (geo.error) {
        setProximityStatus("no_location");
      } else {
        setProximityStatus("checking");
      }
      setDistance(null);
      return;
    }

    const dist = haversineDistance(geo.lat, geo.lng, signalLat, signalLng);
    setDistance(dist);

    if (dist <= CONFIRMATION_RADIUS_METERS) {
      setProximityStatus("within_range");
    } else {
      setProximityStatus("too_far");
    }
  }, [geo.lat, geo.lng, geo.error, signalLat, signalLng]);

  // Check if already confirmed
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setErr(null);
      if (!user) {
        setConfirmed(false);
        return;
      }
      const v = await hasConfirmed(signalId, user.uid);
      if (!cancelled) setConfirmed(v);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [signalId, user]);

  async function onConfirm() {
    if (!user) {
      setErr("Sign in needed");
      return;
    }

    if (proximityStatus === "too_far") {
      setErr(`Must be within ${formatDistance(CONFIRMATION_RADIUS_METERS)} to confirm`);
      return;
    }

    if (proximityStatus === "no_location") {
      setErr("Location access required");
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      const res = await confirmSignal(signalId, user.uid);
      setConfirmed(true);
      if (res.alreadyConfirmed) {
        // no-op
      }
    } catch (e) {
      setErr((e as Error)?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  const canConfirm = proximityStatus === "within_range" && !confirmed;
  const disabled = loading || busy || confirmed || !canConfirm;

  // Determine button appearance
  let buttonStyle = { ...theme.button.base, ...theme.button.primary };
  let buttonText: React.ReactNode = <><Icon icon={Icons.thumbsUp} size="0.875rem" /> Confirm</>;

  if (confirmed) {
    buttonStyle = {
      ...theme.button.base,
      ...theme.button.secondary,
      backgroundColor: theme.colors.status.success,
      color: "#fff",
      border: "none",
    };
    buttonText = <><Icon icon={Icons.check} size="0.875rem" /> Confirmed</>;
  } else if (proximityStatus === "too_far") {
    buttonStyle = {
      ...theme.button.base,
      ...theme.button.ghost,
      backgroundColor: "#f0f0f0",
      cursor: "not-allowed",
    };
    buttonText = <><Icon icon={Icons.location} size="0.875rem" /> Too far to confirm</>;
  } else if (proximityStatus === "checking") {
    buttonText = <><Icon icon={Icons.location} size="0.875rem" /> Getting location...</>;
  } else if (proximityStatus === "no_location") {
    buttonStyle = {
      ...theme.button.base,
      ...theme.button.ghost,
      backgroundColor: "#fff3cd",
      cursor: "not-allowed",
    };
    buttonText = <><Icon icon={Icons.location} size="0.875rem" /> Location required</>;
  } else if (busy) {
    buttonText = "...";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        style={{
          ...buttonStyle,
          padding: compact ? "0.4rem 0.8rem" : "0.6rem 1rem",
          opacity: disabled && !confirmed ? 0.7 : 1,
          width: "100%",
          fontSize: compact ? theme.typography.sizes.xs : theme.typography.sizes.sm,
        }}
      >
        {buttonText}
      </button>

      {/* Distance indicator */}
      {distance !== null && !confirmed && (
        <div
          style={{
            fontSize: theme.typography.sizes.xs,
            color: proximityStatus === "within_range"
              ? theme.colors.status.success
              : theme.colors.text.secondary,
            textAlign: "center",
          }}
        >
          {proximityStatus === "within_range"
            ? <><Icon icon={Icons.check} size="0.75rem" /> {formatDistance(distance)} away - close enough</>
            : `${formatDistance(distance)} away (max ${formatDistance(CONFIRMATION_RADIUS_METERS)})`}
        </div>
      )}

      {err && (
        <div style={{ color: theme.colors.status.danger, fontSize: theme.typography.sizes.xs }}>
          {err}
        </div>
      )}
    </div>
  );
}
