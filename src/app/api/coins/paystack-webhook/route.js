import { validSignature, settleOrder } from '@/lib/coinPay'
import { createAdminClient } from '@/lib/supabase/admin'
import { activateFromTransaction, paystackVerify } from '@/lib/paystack'

export const runtime = 'nodejs'

// Paystack calls this when a payment succeeds. It handles coin orders (fc_...) and Get Verified badge payments (fl_...). Set it in Paystack > Settings > API Keys & Webhooks:
//   https://xchord.space/api/coins/paystack-webhook
export async function POST(req) {
  const raw = await req.text()
  if (!validSignature(raw, req.headers.get('x-paystack-signature'))) return new Response('bad signature', { status: 401 })
  let evt
  try { evt = JSON.parse(raw) } catch { return new Response('ok') }
  const ref = evt?.data?.reference
  if (evt?.event === 'charge.success' && typeof ref === 'string' && ref.startsWith('fc_')) {
    try { await settleOrder(ref) } catch (e) { console.error('webhook settle failed', e); return new Response('retry', { status: 500 }) }
  }
  // Badge payments (Get Verified) use references that start with fl_
  if (evt?.event === 'charge.success' && typeof ref === 'string' && ref.startsWith('fl_')) {
    try {
      const tx = await paystackVerify(ref)
      if (tx) await activateFromTransaction(createAdminClient(), tx)
    } catch (e) { console.error('badge webhook failed', e); return new Response('retry', { status: 500 }) }
  }
  return new Response('ok')
}
