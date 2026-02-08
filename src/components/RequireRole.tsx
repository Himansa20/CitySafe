import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../services/useAuth";
import { getUserRole } from "../services/users";
import type { UserRole } from "../types/admin";

export default function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user) {
        setRole(null);
        setBusy(false);
        return;
      }
      setBusy(true);
      const r = await getUserRole(user.uid);
      if (!cancelled) {
        setRole(r);
        setBusy(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || busy) return <div style={{ padding: 16 }}>Checking role...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!role || !roles.includes(role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
