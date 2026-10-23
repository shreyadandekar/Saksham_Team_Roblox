/**
 * src/components/auth/ProtectedRoute.tsx
 * Guards private routes, redirecting unauthenticated users to /login.
 * Optionally restricts access by role.
 */

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { Role } from "../../types/auth";
import { Loader2, ShieldAlert } from "lucide-react";
import { ROLE_LABELS } from "../../lib/roles";
import { ButtonLink } from "../ui/Button";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Role[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center bg-canvas gap-3"
        role="status"
      >
        <Loader2 className="h-7 w-7 text-navy-800 animate-spin" aria-hidden="true" />
        <p className="text-sm text-ink-muted font-medium">Verifying your session…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-canvas gap-4 text-center p-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="text-xl font-semibold text-navy-900">Access restricted</h1>
        <p className="text-sm text-ink-muted max-w-md">
          Your role ({ROLE_LABELS[user.role]}) is not authorised to access this section of FDR
          Sentinel.
        </p>
        <ButtonLink to="/dashboard" replace>
          Return to dashboard
        </ButtonLink>
      </div>
    );
  }

  return <>{children}</>;
}
