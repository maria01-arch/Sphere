import { addPeriod, priceNGN } from '@/lib/pricing'
import { syncUserBadge } from '@/lib/billing'

// Server-side Paystack helpers (needs PAYSTACK_SECRET_KEY in the Vercel settings).
const API = 'https://api.paystack.co'
const auth = () => ({ Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY, 'Content-Type': 'application/json' })

export async function paystackInitialize({ email, plan, billing, userId, callbackUrl }) {
  const amountKobo = priceNGN(plan, billing) * 100
  const reference = 'fl_' + userId.replace(/-/g, '').slice(0, 10) + '_' + Date.now().toString(36)
  const res = await fetch(API + '/transaction/initialize', {
    method: 'POST', headers: auth(),
    body: JSON.stringify({
      email, amount: amountKobo, currency: 'NGN', reference, callback_url: callbackUrl,
      metadata: { user_id: userId, plan, billing, custom_fields: [{ display_name: 'Plan', variable_name: 'plan', value: plan + ' (' + billing + ')' }] },
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json?.status) throw new Error(json?.message || 'Paystack could not start the payment')
  return { url: json.data.authorization_url, reference }
}

export async function paystackVerify(reference) {
  const res = await fetch(API + '/transaction/verify/' + encodeURIComponent(reference), { headers: auth() })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json?.status) return null
  return json.data
}

// Turns a PAID Paystack transaction into a badge. Safe to call more than once for the same
// payment (the webhook and the return page both call it): the reference is stored once.
// Returns { ok, already?, reason? }.
export async function activateFromTransaction(admin, tx) {
  if (!tx || tx.status !== 'success') return { ok: false, reason: 'not paid' }
  const md = tx.metadata || {}
  const plan = md.plan, billing = md.billing, userId = md.user_id
  if (!['basic', 'premium'].includes(plan) || !['monthly', 'annual'].includes(billing) || !userId) return { ok: false, reason: 'missing details' }
  // The amount must be exactly what the plan costs, so nobody can pay less and get the badge.
  if (tx.currency !== 'NGN' || Number(tx.amount) !== priceNGN(plan, billing) * 100) return { ok: false, reason: 'amount mismatch' }

  const { data: existing } = await admin.from('web_subscriptions').select('reference').eq('reference', tx.reference).maybeSingle()
  if (existing) { await syncUserBadge(admin, userId); return { ok: true, already: true } }

  // Paying early extends from the current end date instead of wasting the days left.
  const { data: live } = await admin.from('web_subscriptions').select('expires_at').eq('user_id', userId).eq('plan', plan).gt('expires_at', new Date().toISOString()).order('expires_at', { ascending: false }).limit(1)
  const start = live?.length ? new Date(live[0].expires_at) : new Date()
  const row = {
    reference: tx.reference, user_id: userId, provider: 'paystack', plan, billing,
    amount_kobo: Number(tx.amount), currency: 'NGN', starts_at: start.toISOString(), expires_at: addPeriod(start, billing).toISOString(),
  }
  const { error } = await admin.from('web_subscriptions').insert(row)
  if (error && error.code !== '23505') { console.error('web_subscriptions insert failed:', error); return { ok: false, reason: 'could not save' } }
  await syncUserBadge(admin, userId)
  return { ok: true, already: error?.code === '23505' }
}
