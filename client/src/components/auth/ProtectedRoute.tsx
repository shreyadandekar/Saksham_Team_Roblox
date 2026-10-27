/**
 * src/components/auth/ProtectedRoute.tsx
 * Guards private routes, redirecting unauthenticated users to /login.
 * Optionally restricts access by role.
 */

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { Role } from "../../types/auth";
import { Loader2 } from "lucide-react";

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1.5 mb-1">
          <img
            src="/assets/saksham-logo.png"
            alt="Saksham"
            className="w-full h-full object-contain animate-pulse"
          />
        </div>
        <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">
          Verifying security credentials…
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 text-center p-6">
        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1.5 mb-1">
          <img
            src="/assets/saksham-logo.png"
            alt="Saksham"
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-xl font-bold text-red-600">Access Restricted</h1>
        <p className="text-xs text-slate-600 max-w-md">
          Your role ({user.role}) is not authorized to access this section of Saksham.
        </p>
        <Navigate to="/dashboard" replace />
      </div>
    );
  }

  return <>{children}</>;
}
