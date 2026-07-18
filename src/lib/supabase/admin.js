import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Admin-privileged client for server-only operations (e.g. deleting an auth
// user, which the regular anon/user client can never do). SUPABASE_SERVICE_ROLE_KEY
// must NOT have the NEXT_PUBLIC_ prefix — it should only ever be read on the server.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
