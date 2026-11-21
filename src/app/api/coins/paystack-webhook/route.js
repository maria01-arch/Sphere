import { validSignature, settleOrder } from '@/lib/coinPay'

export const runtime = 'nodejs'

// Paystack calls this when a payment succeeds. Set it in Paystack > Settings > API Keys & Webhooks:
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
  return new Response('ok')
}
