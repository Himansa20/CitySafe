import { signOut } from "firebase/auth";
import { Link, useLocation } from "react-router-dom";
import { auth } from "../services/firebase";
import { useAuth } from "../services/useAuth";
import { useEffect, useState } from "react";
import { getUserRole } from "../services/users";
import type { UserRole } from "../types/admin";
import { theme } from "../theme";

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
    transition: "color 0.2s",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0.75rem 1.5rem",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(8px)",
        borderBottom: `1px solid ${theme.colors.border}`,
        position: "sticky",
        top: 0,
        zIndex: 1000,
        boxShadow: theme.shadows.sm,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "2rem", flex: 1 }}>
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
          <span style={{ fontSize: "1.5rem" }}>🏙️</span> CitySignal
        </Link>

        <div style={{ display: "flex", gap: "1.5rem" }}>
          <Link to="/help" style={navLinkStyle("/help")}>Help Requests</Link>
          <Link to="/night-safety" style={navLinkStyle("/night-safety")}>Night Safety</Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        {!loading && user ? (
          <>
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              lineHeight: 1.2
            }}>
              <span style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary }}>
                {user.email}
              </span>
              <span style={{
                fontSize: "0.65rem",
                textTransform: "uppercase",
                fontWeight: 700,
                color: theme.colors.primary,
                backgroundColor: "#e0e7ff",
                padding: "2px 6px",
                borderRadius: "4px",
                marginTop: "2px"
              }}>
                {role}
              </span>
            </div>

            <Link
              to="/new"
              style={{
                ...theme.button.base,
                ...theme.button.primary,
                padding: "0.4rem 0.8rem",
                fontSize: theme.typography.sizes.sm,
                textDecoration: "none"
              }}
            >
              + New Signal
            </Link>

            {(role === "ngo" || role === "admin") && (
              <Link
                to="/admin"
                style={{
                  ...theme.button.base,
                  ...theme.button.secondary,
                  padding: "0.4rem 0.8rem",
                  fontSize: theme.typography.sizes.sm,
                  textDecoration: "none"
                }}
              >
                Dashboard
              </Link>
            )}

            <button
              onClick={() => signOut(auth)}
              style={{
                ...theme.button.base,
                ...theme.button.ghost,
                padding: "0.4rem",
                fontSize: theme.typography.sizes.sm,
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          <Link
            to="/login"
            style={{
              ...theme.button.base,
              ...theme.button.primary,
              textDecoration: "none"
            }}
          >
            Login
          </Link>
        )}
      </div>
    </div>
  );
}
