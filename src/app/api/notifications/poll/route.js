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

    const typeText = {
      like: 'liked your post',
      comment: 'commented on your post',
      follow: 'started following you',
      repost: 'reposted your flit',
      follow_request: 'sent you a follow request',
      follow_accepted: 'accepted your follow request',
      mention: 'tagged you in a post',
    }

    // 1. Likes/comments/follows/etc — the notifications table.
    const { data: notifs } = await supabase
      .from('notifications')
      .select('id,type,post_id,created_at,actor:profiles!actor_id(display_name)')
      .eq('user_id', user.id)
      .eq('delivered_via_poll', false)
      .order('created_at', { ascending: true })
      .limit(5)

    const notifItems = (notifs || []).map(n => ({
      source: 'notifications', id: n.id, created_at: n.created_at,
      title: 'Flitters',
      body: n.type === 'welcome' ? 'Welcome to Flitters!' : `${n.actor?.display_name || 'Someone'} ${typeText[n.type] || 'sent you a notification'}`,
      url: n.post_id ? `https://xchord.space/p/${n.post_id}` : 'https://xchord.space/',
    }))

    // 2. Direct messages — these never touch the notifications table at
    //    all, they go straight through the real-time push path, so they
    //    have to be polled for separately here.
    const { data: myConvos } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', user.id)
    const convoIds = (myConvos || []).map(c => c.conversation_id)
    let dmItems = []
    if (convoIds.length) {
      const { data: dms } = await supabase
        .from('messages')
        .select('id,content,is_sticker,created_at,sender:profiles!sender_id(display_name)')
        .in('conversation_id', convoIds)
        .neq('sender_id', user.id)
        .eq('delivered_via_poll', false)
        .order('created_at', { ascending: true })
        .limit(5)
      dmItems = (dms || []).map(m => ({
        source: 'messages', id: m.id, created_at: m.created_at,
        title: 'Flitters',
        body: `${m.sender?.display_name || 'Someone'} sent you ${m.is_sticker ? 'a sticker' : ('a message: ' + (m.content || '').slice(0, 80))}`,
        url: 'https://xchord.space/',
      }))
    }

    // 3. Group messages — same gap as DMs.
    const { data: myGroups } = await supabase.from('group_members').select('group_id').eq('user_id', user.id)
    const groupIds = (myGroups || []).map(g => g.group_id)
    let groupItems = []
    if (groupIds.length) {
      const { data: gms } = await supabase
        .from('group_messages')
        .select('id,content,is_sticker,created_at,sender:profiles!sender_id(display_name)')
        .in('group_id', groupIds)
        .neq('sender_id', user.id)
        .eq('delivered_via_poll', false)
        .order('created_at', { ascending: true })
        .limit(5)
      groupItems = (gms || []).map(m => ({
        source: 'group_messages', id: m.id, created_at: m.created_at,
        title: 'Flitters',
        body: `${m.sender?.display_name || 'Someone'} sent ${m.is_sticker ? 'a sticker' : ('a group message: ' + (m.content || '').slice(0, 80))}`,
        url: 'https://xchord.space/',
      }))
    }

    const all = [...notifItems, ...dmItems, ...groupItems]
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(0, 5)

    if (!all.length) return Response.json([])

    // Mark whichever ones we're actually returning as delivered, per source
    // table, so the next poll (5+ minutes later) doesn't resend them.
    const idsBySource = { notifications: [], messages: [], group_messages: [] }
    for (const item of all) idsBySource[item.source].push(item.id)
    await Promise.all([
      idsBySource.notifications.length ? supabase.from('notifications').update({ delivered_via_poll: true }).in('id', idsBySource.notifications) : null,
      idsBySource.messages.length ? supabase.from('messages').update({ delivered_via_poll: true }).in('id', idsBySource.messages) : null,
      idsBySource.group_messages.length ? supabase.from('group_messages').update({ delivered_via_poll: true }).in('id', idsBySource.group_messages) : null,
    ].filter(Boolean))

    return Response.json(all.map(({ title, body, url }) => ({ title, body, url })))
  } catch (e) {
    console.error('poll error:', e.message)
    return Response.json([])
  }
}
