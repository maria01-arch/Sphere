import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// This keeps the Supabase auth session cookie fresh on every request. Without
// it, the browser stays logged in (its own session lives in memory/localStorage
// too), but any server-side code that reads the session from cookies — API
// routes, server components — can end up seeing a stale or missing session and
// incorrectly report "not signed in" even though the person is clearly logged
// in on screen. This was previously a no-op (matcher: []), which is what was
// causing the upload API route to reject signed-in users.
export async function middleware(request) {
  // Page loads only. Prefetches and non-GET requests don't need to refresh the login, and
  // every extra refresh is another call to Supabase's rate-limited auth server.
  const h = request.headers
  if (request.method !== 'GET' || h.get('next-router-prefetch') || h.get('purpose') === 'prefetch') return NextResponse.next()
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getSession() only talks to Supabase when the saved login has expired (then it
  // refreshes it and sets the new cookies). getUser() called Supabase on EVERY request.
  await supabase.auth.getSession()

  return supabaseResponse
}

export const config = {
  matcher: [
    // Pages only. API routes read the Bearer token the app sends (see authJsonHeaders in
    // lib/api.js), so they don't need the cookie refresh.
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|json|txt|ico|mp4)$).*)',
  ],
}
