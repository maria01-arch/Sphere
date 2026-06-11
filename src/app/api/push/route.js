import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:samzybankz@omnispherelabs.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export async function POST(request) {
  try {
    const { subscription, title, body, url } = await request.json()
    await webpush.sendNotification(subscription, JSON.stringify({ title, body, url: url||'/' }))
    return Response.json({ success: true })
  } catch(e) {
    console.error('Push error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
