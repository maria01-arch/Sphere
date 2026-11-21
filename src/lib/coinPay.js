import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// Paystack helpers for buying Flit coins on the website.
//
// Environment variables (Vercel > Settings > Environment Variables):
//   PAYSTACK_SECRET_KEY   your Paystack secret key (sk_live_... or sk_test_...)
//   PAYSTACK_CURRENCY     NGN (default) or USD, but USD only works if Paystack has enabled USD on your account
//   NEXT_PUBLIC_SITE_URL  optional, defaults to https://xchord.space
//   COIN_FX_MARGIN_PCT    optional, extra % added when converting dollars to Naira (default 2) to cover rate swings
export const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://xchord.space'
export const CURRENCY = (process.env.PAYSTACK_CURRENCY || 'NGN').toUpperCase()

export async function paystack(path, init = {}) {
  const res = await fetch('https://api.paystack.co' + path, {
    ...init,
    headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok && json.status !== false, json }
}

let fxCache = { at: 0, rates: null }
export async function usdRate(code) {
  if (code === 'USD') return 1
  if (!fxCache.rates || Date.now() - fxCache.at > 30 * 60 * 1000) {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    const j = await res.json()
    if (!j?.rates) throw new Error('No exchange rate available')
    fxCache = { at: Date.now(), rates: j.rates }
  }
  const r = fxCache.rates[code]
  if (!r) throw new Error('No exchange rate for ' + code)
  return r
}

// What to charge for a pack priced in US cents, in the smallest unit of the charge currency (kobo for NGN).
export async function chargeFor(usdCents) {
  if (CURRENCY === 'USD') return { amount: usdCents, currency: 'USD' }
  const margin = 1 + (Number(process.env.COIN_FX_MARGIN_PCT ?? 2) / 100)
  const rate = await usdRate(CURRENCY)
  const whole = Math.ceil((usdCents / 100) * rate * margin)       // whole naira, rounded up
  return { amount: whole * 100, currency: CURRENCY }
}

// Asks Paystack whether this order was really paid, and only then adds the coins (once).
export async function settleOrder(reference) {
  const admin = createAdminClient()
  const { data: order } = await admin.from('coin_orders').select('*').eq('reference', reference).maybeSingle()
  if (!order) return { status: 'unknown' }
  if (order.status === 'paid') return { status: 'paid', coins: order.coins }
  const v = await paystack('/transaction/verify/' + encodeURIComponent(reference))
  const d = v.json?.data
  if (!v.ok || !d) return { status: 'pending' }
  if (d.status !== 'success') return { status: d.status === 'failed' || d.status === 'abandoned' ? d.status : 'pending' }
  // The amount and currency Paystack collected must match what we asked for.
  if (Number(d.amount) !== Number(order.charge_amount) || String(d.currency).toUpperCase() !== order.charge_currency) {
    console.error('Paystack amount mismatch', reference, d.amount, d.currency, order.charge_amount, order.charge_currency)
    return { status: 'mismatch' }
  }
  const { data, error } = await admin.rpc('credit_coin_order', { p_reference: reference })
  if (error) { console.error('credit_coin_order failed', error.message); return { status: 'error' } }
  return { status: 'paid', coins: data?.coins, balance: data?.balance }
}

export function validSignature(raw, header) {
  if (!header || !process.env.PAYSTACK_SECRET_KEY) return false
  const mine = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(raw).digest('hex')
  const a = Buffer.from(mine), b = Buffer.from(String(header))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
