import webpush from 'web-push'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
let vapidConfigured = false
let vapidError = null
try {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    vapidError = 'VAPID keys are not set (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY missing from environment)'
  } else {
    webpush.setVapidDetails('mailto:samzybankz@omnispherelabs.com', VAPID_PUBLIC, VAPID_PRIVATE)
    vapidConfigured = true
  }
} catch (e) {
  vapidError = 'Invalid VAPID keys: ' + e.message
}

export const runtime = 'nodejs'

export async function POST(request) {
  if (!vapidConfigured) {
    console.error('Push not configured:', vapidError)
    return Response.json({ error: vapidError }, { status: 500 })
  }
  try {
    const { subscription, title, body, url } = await request.json()
    if(!subscription) return Response.json({ error: 'No subscription' }, { status: 400 })

    await webpush.sendNotification(
      subscription, 
      JSON.stringify({ title, body, url: url||'/' })
    )
    return Response.json({ success: true })
  } catch(e) {
    console.error('Push error:', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
