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
  // Throwing (instead of returning a 429 reply) makes supabase-js treat this as a temporary
  // network problem: it KEEPS the saved login and tries again later. A real 429 reply would
  // make it delete the saved login, which signs you out.
  if (Date.now() < refreshBlockedUntil) throw new TypeError('Login refresh paused for a minute (too many requests)')
  const res = await fetch(input, init)
  if (res.status === 429) {
    refreshBlockedUntil = Date.now() + 60000
    diag('login session', { message: 'Your login could not refresh because Supabase is limiting requests from this network. Wait a minute, close other Flitters tabs, then reload.' })
    throw new TypeError('Login refresh rate limited (429)')
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
