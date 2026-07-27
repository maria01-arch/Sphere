import { getAdminMessaging } from '@/lib/firebase/admin'

export const runtime = 'nodejs'

export async function POST(request) {
  const messaging = getAdminMessaging()
  if (!messaging) {
    return Response.json({ error: 'Firebase Admin is not configured (missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY)' }, { status: 500 })
  }
  try {
    // `subscription` here is the FCM registration token saved by the
    // client's getToken() call — kept as the same field name as before to
    // avoid touching every call site, even though it's no longer a
    // PushSubscription object.
    const { subscription: token, title, body, url } = await request.json()
    if (!token) return Response.json({ error: 'No token' }, { status: 400 })

    await messaging.send({
      token,
      notification: { title: title || 'Flitters', body: body || 'You have a new notification' },
      data: { url: url || '/' },
      webpush: { fcmOptions: { link: url || '/' } },
    })
    return Response.json({ success: true })
  } catch (e) {
    const code = e.code || ''
    console.error('Push error:', code, e.message)
    let hint = ''
    let statusCode = null
    if (code === 'messaging/registration-token-not-registered') { hint = 'This token is no longer valid (expired or the app was reinstalled) — reopening the app should create a fresh one.'; statusCode = 410 }
    else if (code === 'messaging/invalid-argument' || code === 'messaging/invalid-registration-token') { hint = 'The saved token is malformed.'; statusCode = 400 }
    else if (code === 'messaging/authentication-error' || code === 'messaging/third-party-auth-error') { hint = 'Firebase Admin credentials look wrong — double check FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.'; statusCode = 401 }
    return Response.json({ error: (code ? code + ': ' : '') + e.message + (hint ? ' — ' + hint : ''), statusCode }, { status: 500 })
  }
}
