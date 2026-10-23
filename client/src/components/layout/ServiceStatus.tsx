import { useEffect, useState } from "react";

type Status = "checking" | "ok" | "error";

const LABELS: Record<Status, string> = {
  checking: "Checking service",
  ok: "Service available",
  error: "Service unreachable",
};

const DOT: Record<Status, string> = {
  checking: "bg-white/50",
  ok: "bg-[#5fd39a]",
  error: "bg-[#ff8a80]",
};

/** One-time check against GET /api/health; shows the result, not a live feed. */
export function ServiceStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let isMounted = true;
    fetch("/api/health")
      .then((r) => isMounted && setStatus(r.ok ? "ok" : "error"))
      .catch(() => isMounted && setStatus("error"));
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5" role="status">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
