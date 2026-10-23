import { useCallback, useEffect, useState } from "react";
import { fetchInstruments } from "../api/auth";
import type { InstrumentSummary } from "../types/auth";
import { useAuth } from "../context/AuthContext";
import { getPreviewInstruments, isPreviewUser } from "../lib/preview";

interface CacheEntry {
  userId: string;
  data: InstrumentSummary[];
}

// Shared across pages so moving between registry, details and maturities does not refetch.
let cache: CacheEntry | null = null;

export function useInstruments() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  if (user && isPreviewUser(user) && (!cache || cache.userId !== userId)) {
    cache = { userId, data: getPreviewInstruments(user) };
  }
  const cached = cache && cache.userId === userId ? cache.data : null;

  const [instruments, setInstruments] = useState<InstrumentSummary[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    const hasCache = cache && cache.userId === userId && version === 0;
    if (hasCache) return;

    setLoading(true);
    setError(null);
    fetchInstruments()
      .then((data) => {
        cache = { userId, data };
        if (isMounted) setInstruments(data);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load instruments");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId, version]);

  const reload = useCallback(() => {
    cache = null;
    setVersion((v) => v + 1);
  }, []);

  return { instruments, loading, error, reload };
}
