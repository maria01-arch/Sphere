import { createAdminClient } from '@/lib/supabase/admin'
import { getRequestUser, unauthorized, rateLimited, tooManyRequests } from '@/lib/apiAuth'
import { refreshRows, syncUserBadge } from '@/lib/billing'

export const runtime = 'nodejs'

// Called by the app when it opens: re-checks THIS person's subscriptions with
// Google so a renewal keeps the badge and an ended subscription removes it.
export async function POST(req) {
  const user = await getRequestUser(req)
  if (!user) return unauthorized()
  if (rateLimited('billing-refresh:' + user.id, 10, 60_000)) return tooManyRequests()
  if (!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) return Response.json({ error: 'Billing is not configured' }, { status: 503 })
  const admin = createAdminClient()
  try {
    const { data: rows } = await admin.from('subscriptions').select('purchase_token,user_id').eq('user_id', user.id)
    if (rows?.length) await refreshRows(admin, rows)
    else await syncUserBadge(admin, user.id)
    const { data: profile } = await admin.from('profiles').select('verified_plan,verified_until,is_authentic').eq('id', user.id).maybeSingle()
    return Response.json({ ok: true, plan: profile?.verified_plan || null, until: profile?.verified_until || null })
  } catch (err) {
    console.error('Billing refresh failed:', err)
    return Response.json({ error: 'Refresh failed' }, { status: 500 })
  }
}
