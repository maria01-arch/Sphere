import { createAdminClient } from '@/lib/supabase/admin'
import { getRequestUser, unauthorized, rateLimited, tooManyRequests } from '@/lib/apiAuth'
import { settleOrder } from '@/lib/coinPay'

export const runtime = 'nodejs'

// The page calls this when the person comes back from Paystack, so coins show up straight away
// (the webhook does the same job in the background, and either one can win: coins are added once).
export async function GET(req) {
  const user = await getRequestUser(req)
  if (!user) return unauthorized()
  if (rateLimited('coin-verify:' + user.id, 30, 60_000)) return tooManyRequests()
  const reference = new URL(req.url).searchParams.get('reference') || ''
  if (!/^fc_[a-f0-9]{32}$/.test(reference)) return Response.json({ error: 'Bad reference' }, { status: 400 })
  const admin = createAdminClient()
  const { data: order } = await admin.from('coin_orders').select('user_id').eq('reference', reference).maybeSingle()
  if (!order || order.user_id !== user.id) return Response.json({ error: 'Order not found' }, { status: 404 })
  return Response.json(await settleOrder(reference))
}
