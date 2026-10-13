import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRequestUser, unauthorized, rateLimited, tooManyRequests } from '@/lib/apiAuth'

export const runtime = 'nodejs'

// Google Play purchases for Flitters Basic / Premium. The app sends the
// purchase token; THIS route asks Google whether it is real and active, and
// only then turns on the badge. Nothing the phone says is trusted by itself.
//
// Needs one environment variable: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON — the full
// contents of the Google service account key file (see the setup steps).
const PACKAGE = 'com.xchordlabs.flitters'
const PLANS = { flitters_basic: 'basic', flitters_premium: 'premium' }

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')

async function googleAccessToken() {
  const sa = JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)
  const now = Math.floor(Date.now() / 1000)
  const header = b64({ alg: 'RS256', typ: 'JWT' })
  const claim = b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })
  const signature = crypto.createSign('RSA-SHA256').update(`${header}.${claim}`).sign(sa.private_key, 'base64url')
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claim}.${signature}` }),
  })
  const json = await res.json()
  if (!json.access_token) throw new Error('Could not get a Google access token')
  return json.access_token
}

export async function POST(req) {
  const user = await getRequestUser(req)
  if (!user) return unauthorized()
  if (rateLimited('billing:' + user.id, 20, 60_000)) return tooManyRequests()

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Bad request' }, { status: 400 }) }
  const productId = String(body?.productId || '')
  const purchaseToken = String(body?.purchaseToken || '')
  const plan = PLANS[productId]
  if (!plan || purchaseToken.length < 20) return Response.json({ error: 'Unknown product' }, { status: 400 })
  if (!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) return Response.json({ error: 'Billing is not configured on the server' }, { status: 503 })

  const admin = createAdminClient()

  // One purchase can only ever belong to one account.
  const { data: existing } = await admin.from('subscriptions').select('user_id').eq('purchase_token', purchaseToken).maybeSingle()
  if (existing && existing.user_id !== user.id) return Response.json({ error: 'This purchase belongs to another account' }, { status: 409 })

  try {
    const token = await googleAccessToken()
    const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}`
    const res = await fetch(`${base}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      console.error('Google rejected the purchase lookup:', res.status, await res.text())
      return Response.json({ error: 'Google could not confirm this purchase' }, { status: 400 })
    }
    const sub = await res.json()
    const item = (sub.lineItems || []).find((l) => l.productId === productId)
    if (!item) return Response.json({ error: 'Purchase does not match the plan' }, { status: 400 })

    const expiry = new Date(item.expiryTime)
    const state = sub.subscriptionState || ''
    // Paid up, in a payment grace period, or cancelled but still running until the end of the period.
    const entitled =
      state === 'SUBSCRIPTION_STATE_ACTIVE' ||
      state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD' ||
      (state === 'SUBSCRIPTION_STATE_CANCELED' && expiry.getTime() > Date.now())

    // Google refunds a purchase that is not acknowledged within 3 days.
    if (sub.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING' && entitled) {
      await fetch(`${base}/purchases/subscriptions/${productId}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: '{}',
      })
    }

    await admin.from('subscriptions').upsert({
      purchase_token: purchaseToken,
      user_id: user.id,
      product_id: productId,
      plan,
      state,
      expires_at: expiry.toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (!entitled) return Response.json({ error: 'This subscription is not active', state }, { status: 402 })

    // Blue badge = is_authentic. Premium turns it gold in the apps (verified_plan).
    // A 2-day cushion after the expiry date covers renewals that haven't been re-checked yet.
    const until = new Date(expiry.getTime() + 2 * 86400000).toISOString()
    const { error } = await admin.from('profiles').update({ is_authentic: true, verified_plan: plan, verified_until: until }).eq('id', user.id)
    if (error) return Response.json({ error: 'Could not update your profile' }, { status: 500 })
    return Response.json({ ok: true, plan, expiresAt: expiry.toISOString() })
  } catch (err) {
    console.error('Billing verify failed:', err)
    return Response.json({ error: 'Verification failed' }, { status: 500 })
  }
}
