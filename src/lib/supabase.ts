import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton — null wenn Env-Variablen fehlen (lokale Entwicklung ohne Supabase)
let _client: SupabaseClient | null = null;
let _initialised = false;

export function getSupabaseClient(): SupabaseClient | null {
  if (_initialised) return _client;
  _initialised = true;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    _client = createClient(url, key, { auth: { persistSession: false } });
  }

  return _client;
}

/** true wenn Supabase konfiguriert ist */
export const useSupabase = (): boolean => !!process.env.SUPABASE_URL;
