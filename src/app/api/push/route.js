import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:samzybankz@omnispherelabs.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export const runtime = 'nodejs'

export async function POST(request) {
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
