/**
 * src/lib/supabase.ts
 * Singleton Supabase admin client used for server-side Storage operations.
 * Uses the service-role key — never exposed to the browser.
 *
 * Call `getSupabaseAdmin()` inside route handlers.  If the required env vars
 * are absent the function throws a clear error, which bubbles to the global
 * error handler without crashing the process at import time.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";

let _client: SupabaseClient | null = null;

/**
 * Returns a lazily-initialised Supabase admin client.
 * Throws if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are not configured.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase Storage is not configured. " +
        "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env. " +
        "See server/.env.example for instructions."
    );
  }

  _client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      // Disable automatic session handling — this is a server-side admin client
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _client;
}

/** Exposed so tests can reset the singleton between test runs. */
export function _resetSupabaseClient(): void {
  _client = null;
}
