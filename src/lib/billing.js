import crypto from 'crypto'

// Shared Google Play helpers used by the purchase check and the refresh jobs.
export const PACKAGE = 'com.xchordlabs.flitters'
export const PLANS = { flitters_basic: 'basic', flitters_premium: 'premium' }
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')

export async function googleAccessToken() {
  const sa = JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)
  const now = Math.floor(Date.now() / 1000)
  const header = b64({ alg: 'RS256', typ: 'JWT' })
  const claim = b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })
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

// Paid up, in a payment grace period, or cancelled but still running to the end of the period.
export function isEntitled(state, expiry) {
  const t = new Date(expiry).getTime()
  return state === 'SUBSCRIPTION_STATE_ACTIVE' || state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD' || (state === 'SUBSCRIPTION_STATE_CANCELED' && t > Date.now())
}

// Asks Google what a purchase token's subscription looks like RIGHT NOW.
export async function lookupSubscription(accessToken, purchaseToken) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) return { ok: false, status: res.status }
  const sub = await res.json()
  const item = (sub.lineItems || [])[0]
  if (!item) return { ok: false, status: 0 }
  return { ok: true, productId: item.productId, state: sub.subscriptionState || '', expiry: new Date(item.expiryTime) }
}

// Recomputes ONE person's badge from their stored subscriptions: gives the best
// live plan, or takes the paid badge away when none is live. Badges given by hand
// (no verified_plan) are never touched.
export async function syncUserBadge(admin, userId) {
  const { data: rows } = await admin.from('subscriptions').select('plan,state,expires_at').eq('user_id', userId)
  const live = (rows || []).filter((r) => r.expires_at && isEntitled(r.state, r.expires_at))
  if (live.length) {
    const plan = live.some((r) => r.plan === 'premium') ? 'premium' : 'basic'
    const latest = Math.max(...live.map((r) => new Date(r.expires_at).getTime()))
    // 6 hours of slack in case a refresh run is late; the hourly database job is the backstop.
    const until = new Date(latest + 6 * 3600000).toISOString()
    await admin.from('profiles').update({ is_authentic: true, verified_plan: plan, verified_until: until }).eq('id', userId)
    return plan
  }
  await admin.from('profiles').update({ is_authentic: false, verified_plan: null, verified_until: null }).eq('id', userId).not('verified_plan', 'is', null)
  return null
}

// Re-reads Google's current state for these stored rows and saves it.
export async function refreshRows(admin, rows) {
  const token = await googleAccessToken()
  const users = new Set()
  for (const row of rows) {
    const r = await lookupSubscription(token, row.purchase_token)
    if (r.ok) {
      await admin.from('subscriptions').update({ state: r.state, expires_at: r.expiry.toISOString(), updated_at: new Date().toISOString() }).eq('purchase_token', row.purchase_token)
    } else if (r.status === 404 || r.status === 410) {
      // Google no longer knows this purchase (refunded or too old): treat it as ended.
      await admin.from('subscriptions').update({ state: 'SUBSCRIPTION_STATE_EXPIRED', expires_at: new Date(0).toISOString(), updated_at: new Date().toISOString() }).eq('purchase_token', row.purchase_token)
    }
    users.add(row.user_id)
  }
  for (const id of users) await syncUserBadge(admin, id)
  return users.size
}

// ---- Refunds -------------------------------------------------------------
// Google keeps a list of purchases that were voided (refunded, charged back or
// revoked). It is one cheap request however many subscribers there are, so it
// is checked on every scheduled run — this is what stops "subscribe, refund,
// keep the badge".
export async function listVoided(accessToken) {
  const start = Date.now() - 7 * 86400000
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/purchases/voidedpurchases?startTime=${start}&type=1&maxResults=1000`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) {
    console.error('Voided purchases lookup failed:', res.status, await res.text())
    return []
  }
  const json = await res.json()
  return json.voidedPurchases || []
}

// Marks these purchases as voided, takes the badge away at once, and blocks an
// account that keeps doing it: two voided subscriptions and it can no longer buy.
export async function applyVoided(admin, purchaseTokens) {
  if (!purchaseTokens.length) return 0
  const { data: rows } = await admin.from('subscriptions').select('purchase_token,user_id,state').in('purchase_token', purchaseTokens)
  const fresh = (rows || []).filter((r) => r.state !== 'VOIDED')
  const users = new Set()
  for (const r of fresh) {
    await admin.from('subscriptions').update({ state: 'VOIDED', expires_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('purchase_token', r.purchase_token)
    users.add(r.user_id)
  }
  for (const id of users) {
    await syncUserBadge(admin, id)
    const { count } = await admin.from('subscriptions').select('purchase_token', { count: 'exact', head: true }).eq('user_id', id).eq('state', 'VOIDED')
    if ((count || 0) >= 2) await admin.from('profiles').update({ billing_blocked: true }).eq('id', id)
  }
  return users.size
}
