import { createBrowserClient } from '@supabase/ssr'
import { diag } from '@/lib/diag'

// When Supabase answers "429 too many requests" to a login-token refresh, supabase-js
// would try again for every single query the page makes (each one needs a fresh token
// first), which keeps the limit tripped forever. So after a 429 we stop sending
// refresh requests for a minute and answer them locally, then try again.
let refreshBlockedUntil = 0
const isRefresh = (u) => u.includes('/auth/v1/token') && u.includes('grant_type=refresh_token')

async function guardedFetch(input, init) {
  const url = typeof input === 'string' ? input : (input && input.url) || String(input)
  if (!isRefresh(url)) return fetch(input, init)
  if (Date.now() < refreshBlockedUntil) {
    return new Response(JSON.stringify({ code: 429, error_code: 'over_request_rate_limit', msg: 'Too many requests' }), { status: 429, headers: { 'Content-Type': 'application/json' } })
  }
  const res = await fetch(input, init)
  if (res.status === 429) {
    refreshBlockedUntil = Date.now() + 60000
    diag('login session', { message: 'Your login could not refresh because Supabase is limiting requests from this network. Wait a minute, close other Flitters tabs, then reload.' })
  }
  return res
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { fetch: guardedFetch } }
  )
}
