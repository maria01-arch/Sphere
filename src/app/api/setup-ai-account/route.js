// One-time setup route: creates a real auth user + profile for Flitters AI.
// profiles.id turns out to have a foreign key into auth.users (confirmed by
// an actual failed insert, not just information_schema — that view
// under-reports cross-schema FKs depending on query permissions), so a
// free-standing profile row was never going to work. This creates the real
// backing account the mention-reply feature needs.
//
// Gated to the admin account only. Visit this URL once while signed in as
// admin, confirm it returns the new profile, then this route can be deleted
// — it doesn't need to exist permanently.
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
const ADMIN_ID = 'b29fa752-34f5-4a3e-a3e7-8178c2b176ae'

export async function GET(req) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== ADMIN_ID) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    const admin = createAdminClient()

    // Skip creating a duplicate if this has already been run once
    const { data: existing } = await admin.from('profiles').select('id,username,display_name').eq('username', 'flittersai').maybeSingle()
    if (existing) {
      return Response.json({ alreadyExists: true, profile: existing })
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: `flittersai-bot-${Date.now()}@internal.flitters.app`,
      password: crypto.randomUUID() + crypto.randomUUID(),
      email_confirm: true,
    })
    if (createErr) return Response.json({ error: 'auth.admin.createUser failed: ' + createErr.message }, { status: 500 })

    const newId = created.user.id

    // Upsert rather than insert — if a signup trigger already created a
    // barebones profiles row for this new auth user, this fills it in
    // instead of colliding with it.
    const { data: profile, error: profileErr } = await admin.from('profiles').upsert({
      id: newId,
      username: 'flittersai',
      display_name: 'Flitters AI',
      bio: "Tag me in a post or comment and I'll reply — ask me to summarize, answer questions, or suggest something.",
    }).select('id,username,display_name').single()
    if (profileErr) return Response.json({ error: 'profiles upsert failed: ' + profileErr.message, authUserId: newId }, { status: 500 })

    return Response.json({ created: true, profile })
  } catch (err) {
    return Response.json({ error: 'Unhandled: ' + (err?.message || String(err)) }, { status: 500 })
  }
}
