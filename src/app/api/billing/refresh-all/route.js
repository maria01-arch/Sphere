import { createAdminClient } from '@/lib/supabase/admin'
import { refreshRows, googleAccessToken, listVoided, applyVoided } from '@/lib/billing'

export const runtime = 'nodejs'
export const maxDuration = 60

// Run on a schedule by the database (every 15 minutes): re-checks every recent
// subscription with Google, so renewals keep their badge and cancelled, refunded or
// expired ones lose it without anyone having to open the app. Protected by CRON_SECRET.
export async function POST(req) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return Response.json({ error: 'Not allowed' }, { status: 401 })
  if (!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) return Response.json({ error: 'Billing is not configured' }, { status: 503 })
  const admin = createAdminClient()
  try {
    // Only subscriptions that are DUE: expiring within the next 2 hours (a renewal
    // is about to happen) or ended in the last 7 days (so ended ones get revoked
    // and late renewals get picked up). A subscription in the middle of a paid
    // month needs no check, which keeps this cheap however many subscribers there are.
    const since = new Date(Date.now() - 7 * 86400000).toISOString()
    const soon = new Date(Date.now() + 2 * 3600000).toISOString()
    const { data: rows } = await admin.from('subscriptions').select('purchase_token,user_id').gte('expires_at', since).lte('expires_at', soon).limit(300)
    const users = rows?.length ? await refreshRows(admin, rows) : 0
    // Refunds and charge-backs, wherever the subscription is in its paid period.
    const voided = await listVoided(await googleAccessToken())
    const revoked = await applyVoided(admin, voided.map((v) => v.purchaseToken).filter(Boolean))
    return Response.json({ ok: true, checked: rows?.length || 0, users, voided: voided.length, revoked })
  } catch (err) {
    console.error('Billing refresh-all failed:', err)
    return Response.json({ error: 'Refresh failed' }, { status: 500 })
  }
}
