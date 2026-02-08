import { signOut } from "firebase/auth";
import { Link, useLocation } from "react-router-dom";
import { auth } from "../services/firebase";
import { useAuth } from "../services/useAuth";
import { useEffect, useState } from "react";
import { getUserRole } from "../services/users";
import type { UserRole } from "../types/admin";
import { theme } from "../theme";
import NotificationBell from "./NotificationBell";
import NavDropdown from "./NavDropdown";
import SOSButton from "./SOSButton";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '../icons';

export default function TopBar() {
  const { user, loading } = useAuth();
  const [role, setRole] = useState<UserRole>("citizen");
  const loc = useLocation();

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user) return;
      const r = await getUserRole(user.uid);
      if (!cancelled) setRole(r);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const navLinkStyle = (path: string) => ({
    textDecoration: "none",
    color: loc.pathname === path ? theme.colors.primary : theme.colors.text.secondary,
    fontWeight: loc.pathname === path ? 600 : 500,
    fontSize: theme.typography.sizes.sm,
    padding: "0.5rem",
    borderRadius: theme.rounded.md,
    transition: "all 0.2s",
  });

  const isAdmin = role === "ngo" || role === "admin";

  // Services dropdown items
  const servicesItems = [
    { label: "Waste Collection", path: "/waste", icon: Icons.waste, description: "View collection schedules" },
    { label: "Night Safety", path: "/night-safety", icon: Icons.moon, description: "Safe walking routes" },
    { label: "Help Requests", path: "/help", icon: Icons.handshake, description: "Community assistance" },
  ];

  // Admin dropdown items
  const adminItems = [
    { label: "Dashboard", path: "/dashboard", icon: Icons.chart, description: "Priority queue & actions" },
    { label: "Waste Zones", path: "/waste-admin", icon: Icons.waste, description: "Zones & schedules" },
    { label: "Night Safety Routes", path: "/night-safety-admin", icon: Icons.shieldHalved, description: "Safe & unsafe corridors" },
    { label: "Safe Places", path: "/safe-places-admin", icon: Icons.hospital, description: "Police, hospitals, shelters" },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0.75rem 1.5rem",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(8px)",
        borderBottom: `1px solid ${theme.colors.border}`,
        position: "sticky",
        top: 0,
        zIndex: 1000,
        boxShadow: theme.shadows.sm,
      }}
    >
      {/* Left: Logo + Navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flex: 1 }}>
        <Link
          to="/"
          style={{
            textDecoration: "none",
            fontWeight: 800,
            fontSize: theme.typography.sizes.xl,
            color: theme.colors.primary,
            letterSpacing: "-0.5px",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "1.5rem", display: "flex", alignItems: "center" }}><FontAwesomeIcon icon={Icons.city} /></span> CitySignal
        </Link>

        {/* Primary Navigation */}
        <nav style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Link to="/" style={navLinkStyle("/")}>
            Signals
          </Link>

          <NavDropdown label="Services" items={servicesItems} icon={Icons.wrench} />

          {user && (
            <Link to="/my-area" style={navLinkStyle("/my-area")}>
              <FontAwesomeIcon icon={Icons.mapPin} style={{ marginRight: '0.25rem' }} /> My Area
            </Link>
          )}
        </nav>
      </div>

      {/* Right: Actions */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        {/* SOS Button - Always visible for logged in users */}
        {!loading && user && <SOSButton />}

        {!loading && user && <NotificationBell />}

        {!loading && user ? (
          <>
            {/* User Info */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                lineHeight: 1.2,
              }}
            >
              <span
                style={{
                  fontSize: theme.typography.sizes.xs,
                  color: theme.colors.text.secondary,
                  maxWidth: "120px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.email}
              </span>
              <span
                style={{
                  fontSize: "0.65rem",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: isAdmin ? theme.colors.status.info : theme.colors.primary,
                  backgroundColor: isAdmin ? "#e0f2fe" : "#e0e7ff",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  marginTop: "2px",
                }}
              >
                {role}
              </span>
            </div>

            {/* New Signal Button */}
            <Link
              to="/new"
              style={{
                ...theme.button.base,
                ...theme.button.primary,
                padding: "0.5rem 1rem",
                fontSize: theme.typography.sizes.sm,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <span><FontAwesomeIcon icon={Icons.plus} /></span> Report Issue
            </Link>

            {/* Admin Console */}
            {isAdmin && (
              <NavDropdown label="Admin" items={adminItems} icon={Icons.gear} />
            )}

            {/* Sign Out */}
            <button
              onClick={() => signOut(auth)}
              style={{
                ...theme.button.base,
                ...theme.button.ghost,
                padding: "0.4rem 0.6rem",
                fontSize: theme.typography.sizes.sm,
              }}
              title="Sign out"
            >
              <FontAwesomeIcon icon={Icons.doorOpen} />
            </button>
          </>
        ) : (
          <Link
            to="/login"
            style={{
              ...theme.button.base,
              ...theme.button.primary,
              textDecoration: "none",
            }}
          >
            Login
          </Link>
        )}
      </div>
    </div>
  );
}
