import { createAdminClient } from '@/lib/supabase/admin'
import { getRequestUser, unauthorized, rateLimited, tooManyRequests } from '@/lib/apiAuth'
import { paystackInitialize } from '@/lib/paystack'

export const runtime = 'nodejs'

// Starts a Paystack payment for a badge plan and returns the page to send the person to.
export async function POST(req) {
  const user = await getRequestUser(req)
  if (!user) return unauthorized()
  if (rateLimited('paystack-init:' + user.id, 8, 60_000)) return tooManyRequests()
  if (!process.env.PAYSTACK_SECRET_KEY) return Response.json({ error: 'Card payments are not switched on yet' }, { status: 503 })
  let body = {}
  try { body = await req.json() } catch {}
  const { plan, billing } = body
  if (!['basic', 'premium'].includes(plan) || !['monthly', 'annual'].includes(billing)) return Response.json({ error: 'Pick a plan' }, { status: 400 })
  if (!user.email) return Response.json({ error: 'Your account has no email address' }, { status: 400 })
  const admin = createAdminClient()
  const { data: prof } = await admin.from('profiles').select('billing_blocked').eq('id', user.id).maybeSingle()
  if (prof?.billing_blocked) return Response.json({ error: 'Payments are not available for this account' }, { status: 403 })
  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
    const out = await paystackInitialize({ email: user.email, plan, billing, userId: user.id, callbackUrl: origin + '/paystack/return' })
    return Response.json(out)
  } catch (err) {
    console.error('Paystack initialize failed:', err)
    return Response.json({ error: 'Could not start the payment. Try again.' }, { status: 502 })
  }
}
