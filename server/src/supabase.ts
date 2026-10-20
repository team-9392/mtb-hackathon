import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Env } from "./env.js";

/**
 * Клиент с service_role: единственный доступ к базе. RLS включён и политик нет,
 * поэтому ни anon, ни authenticated ключом из мобильного приложения базу не прочитают.
 */
export function createDb(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "moby-family-api" } },
  });
}
