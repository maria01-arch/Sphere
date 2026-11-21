import { createAdminClient } from '@/lib/supabase/admin'
import { getRequestUser, unauthorized, rateLimited, tooManyRequests } from '@/lib/apiAuth'
import { activateFromTransaction, paystackVerify } from '@/lib/paystack'

export const runtime = 'nodejs'

// Called by the page Paystack sends people back to, so the badge appears right away
// without waiting for the webhook.
export async function POST(req) {
  const user = await getRequestUser(req)
  if (!user) return unauthorized()
  if (rateLimited('paystack-verify:' + user.id, 15, 60_000)) return tooManyRequests()
  if (!process.env.PAYSTACK_SECRET_KEY) return Response.json({ error: 'Card payments are not switched on yet' }, { status: 503 })
  let body = {}
  try { body = await req.json() } catch {}
  const reference = String(body.reference || '')
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(reference)) return Response.json({ error: 'Bad reference' }, { status: 400 })
  const tx = await paystackVerify(reference)
  if (!tx) return Response.json({ ok: false, status: 'unknown' })
  if (tx.metadata?.user_id !== user.id) return Response.json({ error: 'This payment belongs to another account' }, { status: 403 })
  if (tx.status !== 'success') return Response.json({ ok: false, status: tx.status })
  const result = await activateFromTransaction(createAdminClient(), tx)
  return Response.json({ ok: result.ok, status: 'success', plan: tx.metadata?.plan, reason: result.reason })
}
