import { createAdminClient } from '@/lib/supabase/admin'
import { getRequestUser, unauthorized, rateLimited, tooManyRequests } from '@/lib/apiAuth'

export const runtime = 'nodejs'

// Same admin account the webapp's Admin button uses.
const ADMIN_ID = 'b29fa752-34f5-4a3e-a3e7-8178c2b176ae'

// Moderation actions that ordinary users must never be able to perform:
// deleting someone else's post and banning an account. Everything runs here
// on the server with the service-role key, after checking that the caller
// really is the admin — the browser only asks.
//
// Bans use Supabase Auth's own ban: a banned account can't sign in or
// refresh its session until the ban ends, enforced by the auth server (not
// just hidden in the app). Someone already signed in keeps working until
// their current access token expires, normally within the hour.
export async function POST(req) {
  const caller = await getRequestUser(req)
  if (!caller) return unauthorized()
  if (caller.id !== ADMIN_ID) return Response.json({ error: 'Admins only' }, { status: 403 })
  if (rateLimited('admin-moderate:' + caller.id, 60, 60_000)) return tooManyRequests()

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Bad request' }, { status: 400 }) }
  const admin = createAdminClient()
  const now = new Date().toISOString()

  try {
    if (body.action === 'delete_post') {
      const postId = String(body.postId || '')
      if (!postId) return Response.json({ error: 'Missing postId' }, { status: 400 })
      const { data: post } = await admin.from('posts').select('id,user_id,thread_id,video_url').eq('id', postId).maybeSingle()
      if (!post) return Response.json({ error: 'Post no longer exists' }, { status: 404 })
      const { error } = await admin.from('posts').delete().eq('id', postId)
      if (error) return Response.json({ error: error.message }, { status: 500 })
      // Things created alongside the post: the rest of its thread, and the
      // Reels copy of a video post.
      if (post.thread_id) await admin.from('posts').delete().eq('thread_id', post.thread_id).eq('user_id', post.user_id)
      if (post.video_url) await admin.from('reels').delete().eq('user_id', post.user_id).eq('video_url', post.video_url)
      await admin.from('reports').update({ status: 'actioned', reviewed_at: now }).eq('reported_post_id', postId)
      return Response.json({ ok: true, userId: post.user_id })
    }

    if (body.action === 'ban_user') {
      const userId = String(body.userId || '')
      if (!userId) return Response.json({ error: 'Missing userId' }, { status: 400 })
      if (userId === ADMIN_ID) return Response.json({ error: "You can't ban the admin account" }, { status: 400 })
      const hours = body.hours == null ? null : Number(body.hours)
      if (hours !== null && (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 365 * 10)) {
        return Response.json({ error: 'Invalid duration' }, { status: 400 })
      }
      // null = permanent (100 years, which is how Supabase expresses it)
      const { data, error } = await admin.auth.admin.updateUserById(userId, { ban_duration: hours === null ? '876000h' : `${Math.round(hours)}h` })
      if (error) return Response.json({ error: error.message }, { status: 500 })
      return Response.json({ ok: true, bannedUntil: data?.user?.banned_until || null })
    }

    if (body.action === 'unban_user') {
      const userId = String(body.userId || '')
      if (!userId) return Response.json({ error: 'Missing userId' }, { status: 400 })
      const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
      if (error) return Response.json({ error: error.message }, { status: 500 })
      return Response.json({ ok: true })
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('Admin moderate failed:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
