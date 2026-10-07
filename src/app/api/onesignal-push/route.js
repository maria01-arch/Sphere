// Sends a push notification via OneSignal, targeting a specific Flitters user
// by external_id (set client-side via OneSignal.login(userId) on sign-in).
import { getRequestUser, unauthorized, rateLimited, tooManyRequests } from '@/lib/apiAuth'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const caller = await getRequestUser(request)
    if (!caller) return unauthorized()
    if (rateLimited('onesignal:' + caller.id, 60, 60_000)) return tooManyRequests()
    const { userId, title: rawTitle, body: rawBody, url } = await request.json()
    const title = typeof rawTitle === 'string' ? rawTitle.slice(0, 100) : rawTitle
    const body = typeof rawBody === 'string' ? rawBody.slice(0, 300) : rawBody
    if (!userId || !title) return Response.json({ error: 'Missing userId or title' }, { status: 400 })

    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${process.env.ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        target_channel: 'push',
        include_aliases: { external_id: [userId] },
        headings: { en: title },
        contents: { en: body || '' },
        url: url || 'https://flitters.app'
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('OneSignal send failed:', res.status, errText)
      return Response.json({ error: `OneSignal error ${res.status}: ${errText.slice(0,200)}` }, { status: 502 })
    }

    const data = await res.json()
    return Response.json({ success: true, id: data.id })
  } catch (e) {
    console.error('OneSignal push route error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
