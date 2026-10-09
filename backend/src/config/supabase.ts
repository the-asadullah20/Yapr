import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

let isSupabaseConfigured = false;

if (env.SUPABASE_URL && !env.SUPABASE_URL.includes('mock-') && env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_SERVICE_ROLE_KEY.includes('mock-')) {
  isSupabaseConfigured = true;
}

// Service role client: has full access to tables, used by workers and backend admin endpoints
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Public anon client: used for public read-only requests or auth triggers
export const supabaseAnon: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY
);

// Create an authenticated client scoped to the caller's JWT (so RLS policies apply strictly)
export function createScopedClient(jwtToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    },
  });
}

export { isSupabaseConfigured };
