import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRequestUser, unauthorized, rateLimited, tooManyRequests } from '@/lib/apiAuth'
import { paystack, chargeFor, SITE } from '@/lib/coinPay'

export const runtime = 'nodejs'

// Starts a Paystack payment for a coin pack. The price comes from the database, never from the browser.
export async function POST(req) {
  const user = await getRequestUser(req)
  if (!user) return unauthorized()
  if (rateLimited('coin-checkout:' + user.id, 10, 60_000)) return tooManyRequests()
  if (!process.env.PAYSTACK_SECRET_KEY) return Response.json({ error: 'Payments are not set up yet' }, { status: 503 })

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Bad request' }, { status: 400 }) }
  const sku = String(body?.sku || '')

  const admin = createAdminClient()
  const { data: pack } = await admin.from('coin_packs').select('sku,coins,price_usd_cents,active').eq('sku', sku).maybeSingle()
  if (!pack || !pack.active || !pack.price_usd_cents) return Response.json({ error: 'That pack is not available' }, { status: 400 })
  if (!user.email) return Response.json({ error: 'Your account needs an email address to pay' }, { status: 400 })

  try {
    const charge = await chargeFor(pack.price_usd_cents)
    const reference = 'fc_' + crypto.randomUUID().replace(/-/g, '')
    const { error: insErr } = await admin.from('coin_orders').insert({
      reference, user_id: user.id, sku: pack.sku, coins: pack.coins, usd_cents: pack.price_usd_cents,
      charge_amount: charge.amount, charge_currency: charge.currency,
    })
    if (insErr) { console.error(insErr); return Response.json({ error: 'Could not start the payment' }, { status: 500 }) }

    const init = await paystack('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: user.email, amount: charge.amount, currency: charge.currency, reference,
        callback_url: SITE + '/coins?ref=' + reference,
        metadata: { user_id: user.id, sku: pack.sku, coins: pack.coins },
      }),
    })
    if (!init.ok || !init.json?.data?.authorization_url) {
      console.error('Paystack initialize failed', init.json)
      return Response.json({ error: 'Paystack could not start the payment' }, { status: 502 })
    }
    return Response.json({ url: init.json.data.authorization_url, reference, amount: charge.amount, currency: charge.currency })
  } catch (e) {
    console.error(e)
    return Response.json({ error: 'Could not start the payment' }, { status: 500 })
  }
}
