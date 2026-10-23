/**
 * src/pages/DashboardPage.tsx
 * Placeholder landing page – will show FDR summary metrics later.
 */
import { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import AppShell from "../components/layout/AppShell";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <Activity className="h-12 w-12 text-blue-600" aria-hidden="true" />
        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 max-w-md">
          FDR Sentinel is running. Business features and data will appear here
          in the next development iteration.
        </p>
        <HealthBadge />
      </div>
    </AppShell>
  );
}

/**
 * Calls GET /api/health to verify the frontend→backend proxy is working.
 */
function HealthBadge() {
  const [status, setStatus] = useState<"checking" | "ok" | "error">(
    "checking"
  );

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? setStatus("ok") : setStatus("error")))
      .catch(() => setStatus("error"));
  }, []);

  const colours: Record<typeof status, string> = {
    checking: "bg-yellow-100 text-yellow-800 border-yellow-300",
    ok: "bg-green-100 text-green-800 border-green-300",
    error: "bg-red-100 text-red-800 border-red-300",
  };

  const labels: Record<typeof status, string> = {
    checking: "Checking API…",
    ok: "API ✓ Connected",
    error: "API ✗ Unreachable",
  };

  return (
    <span
      className={`mt-2 inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium ${colours[status]}`}
    >
      {labels[status]}
    </span>
  );
}
