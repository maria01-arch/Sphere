import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return Response.json({ error: 'Not signed in' }, { status: 401 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Server is not configured for account deletion (missing SUPABASE_SERVICE_ROLE_KEY)' }, { status: 500 })
  }

  const admin = createAdminClient()
  const uid = user.id

  // Best-effort cleanup across every table that references this user. The
  // admin client bypasses RLS, so these run regardless of policy setup.
  // Each is isolated in its own try/catch so one failing table (e.g. one
  // that doesn't exist yet in a given deployment) can't block the rest —
  // deleting the auth user itself is the step that actually matters most.
  const cleanupSteps = [
    () => admin.from('posts').delete().eq('user_id', uid),
    () => admin.from('comments').delete().eq('user_id', uid),
    () => admin.from('likes').delete().eq('user_id', uid),
    () => admin.from('reposts').delete().eq('user_id', uid),
    () => admin.from('reel_likes').delete().eq('user_id', uid),
    () => admin.from('reels').delete().eq('user_id', uid),
    () => admin.from('pulses').delete().eq('user_id', uid),
    () => admin.from('follows').delete().eq('follower_id', uid),
    () => admin.from('follows').delete().eq('following_id', uid),
    () => admin.from('blocks').delete().eq('blocker_id', uid),
    () => admin.from('blocks').delete().eq('blocked_id', uid),
    () => admin.from('message_reactions').delete().eq('user_id', uid),
    () => admin.from('group_message_reactions').delete().eq('user_id', uid),
    () => admin.from('messages').delete().eq('sender_id', uid),
    () => admin.from('group_messages').delete().eq('sender_id', uid),
    () => admin.from('conversation_participants').delete().eq('user_id', uid),
    () => admin.from('group_members').delete().eq('user_id', uid),
    () => admin.from('group_join_requests').delete().eq('user_id', uid),
    () => admin.from('notifications').delete().eq('user_id', uid),
    () => admin.from('notifications').delete().eq('actor_id', uid),
    () => admin.from('push_subscriptions').delete().eq('user_id', uid),
    () => admin.from('verification_applications').delete().eq('user_id', uid),
    async () => {
      const { data: packs } = await admin.from('sticker_packs').select('id').eq('owner_id', uid)
      const packIds = (packs || []).map(p => p.id)
      if (packIds.length) await admin.from('stickers').delete().in('pack_id', packIds)
    },
    () => admin.from('sticker_packs').delete().eq('owner_id', uid),
    () => admin.from('groups').update({ creator_id: null }).eq('creator_id', uid),
  ]

  for (const step of cleanupSteps) {
    try { await step() } catch (e) { console.error('delete-account cleanup step failed:', e.message) }
  }

  // Finally, remove the profile row and the auth user itself.
  try { await admin.from('profiles').delete().eq('id', uid) } catch (e) { console.error('profile delete failed:', e.message) }

  const { error: deleteErr } = await admin.auth.admin.deleteUser(uid)
  if (deleteErr) {
    return Response.json({ error: deleteErr.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
