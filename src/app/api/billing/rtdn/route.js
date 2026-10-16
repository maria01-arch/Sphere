import { createAdminClient } from '@/lib/supabase/admin'
import { PACKAGE, refreshRows, applyVoided } from '@/lib/billing'

export const runtime = 'nodejs'
export const maxDuration = 30

// OPTIONAL instant alerts from Google ("Real-time developer notifications").
// Google tells us the moment a subscription is refunded, revoked, expired or
// renewed, through a Pub/Sub push to this address. The scheduled check still
// runs as a safety net, so this only makes it faster.
// Address to give Google:  https://xchord.space/api/billing/rtdn?token=<RTDN_SECRET>
export async function POST(req) {
  const secret = process.env.RTDN_SECRET
  if (!secret || new URL(req.url).searchParams.get('token') !== secret) return Response.json({ error: 'Not allowed' }, { status: 401 })
  try {
    const body = await req.json()
    const raw = body?.message?.data
    if (!raw) return Response.json({ ok: true })
    const data = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
    if (data.packageName && data.packageName !== PACKAGE) return Response.json({ ok: true })
    const admin = createAdminClient()

    if (data.voidedPurchaseNotification?.purchaseToken) {
      await applyVoided(admin, [data.voidedPurchaseNotification.purchaseToken])
    } else if (data.subscriptionNotification?.purchaseToken) {
      const { data: row } = await admin.from('subscriptions').select('purchase_token,user_id').eq('purchase_token', data.subscriptionNotification.purchaseToken).maybeSingle()
      if (row) await refreshRows(admin, [row])
    }
    return Response.json({ ok: true })
  } catch (err) {
    console.error('RTDN failed:', err)
    // A real error: let Google retry.
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
