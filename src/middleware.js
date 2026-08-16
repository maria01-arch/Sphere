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

  // Touching getUser() here is what actually triggers the refresh — don't
  // remove this even though the result isn't used directly below.
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on everything except static assets/images — this includes API
    // routes on purpose, since those are exactly what need fresh cookies.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
