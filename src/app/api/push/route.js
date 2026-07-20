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
    const statusCode = e.statusCode
    const pushBody = e.body
    console.error('Push error:', statusCode, pushBody || e.message)
    let hint = ''
    if (statusCode === 401 || statusCode === 403) hint = 'The push service rejected the VAPID key — NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY likely don\'t match each other, or don\'t match the key the browser subscribed with.'
    else if (statusCode === 404 || statusCode === 410) hint = 'This subscription is no longer valid (expired or the app was reinstalled) — reopening the app should create a fresh one.'
    else if (statusCode === 413) hint = 'Notification payload too large.'
    else if (statusCode === 429) hint = 'Rate limited by the push service — try again shortly.'
    return Response.json({ error: (statusCode?('HTTP '+statusCode+': '):'')+(pushBody||e.message)+(hint?' — '+hint:''), statusCode }, { status: 500 })
  }
}
