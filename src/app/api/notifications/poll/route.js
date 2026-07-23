import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Contract (per the app-builder's polling notification spec):
//   - GET request, must respond 2xx with JSON — a single object or an array
//   - up to 5 items are shown per poll
//   - each item: { title?, body (required), url? }
//   - an empty array/object/null/string means "nothing to show"
//
// Auth: relies on the WebView sending the same session cookie it browses
// the site with (this endpoint lives on the same origin). If there's no
// valid session, we return [] rather than an error — an empty response is
// explicitly meant to mean "nothing to show" per the contract, which is the
// right behavior for a logged-out device too.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json([])

    const { data: notifs, error } = await supabase
      .from('notifications')
      .select('id,type,post_id,actor:profiles!actor_id(display_name)')
      .eq('user_id', user.id)
      .eq('delivered_via_poll', false)
      .order('created_at', { ascending: true })
      .limit(5)

    if (error) { console.error('poll query error:', error.message); return Response.json([]) }
    if (!notifs?.length) return Response.json([])

    const typeText = {
      like: 'liked your post',
      comment: 'commented on your post',
      follow: 'started following you',
      repost: 'reposted your flit',
      follow_request: 'sent you a follow request',
      follow_accepted: 'accepted your follow request',
      mention: 'tagged you in a post',
      welcome: null, // handled specially below
    }

    const items = notifs.map(n => {
      const name = n.actor?.display_name || 'Someone'
      const body = n.type === 'welcome' ? 'Welcome to Flitters!' : `${name} ${typeText[n.type] || 'sent you a notification'}`
      const url = n.post_id ? `https://xchord.space/p/${n.post_id}` : 'https://xchord.space/'
      return { title: 'Flitters', body, url }
    })

    // Mark delivered so the next poll (5+ minutes later) doesn't resend
    // the same items — the builder's spec has no "seen" concept on their
    // end, so this side has to track it.
    await supabase.from('notifications').update({ delivered_via_poll: true }).in('id', notifs.map(n => n.id))

    return Response.json(items)
  } catch (e) {
    console.error('poll error:', e.message)
    return Response.json([])
  }
}
