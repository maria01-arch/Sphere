import { diag } from '@/lib/diag'

// Loads the messages of a DM or a group chat. If the full query (with the sender profile and
// reactions joined in) fails, for example because a table or column changed in the database,
// it retries with less and fills the rest in separately, so the chat still shows its
// messages. The first failure is reported through diag() so it is visible.
const KINDS = {
  dm: { table: 'messages', key: 'conversation_id', react: 'message_reactions', rfk: 'message_id' },
  group: { table: 'group_messages', key: 'group_id', react: 'group_message_reactions', rfk: 'group_message_id' },
}
const SENDER = 'sender:profiles!sender_id(id,display_name,avatar_color,avatar_url)'

export async function fetchChat(supabase, kind, id, { limit } = {}) {
  const c = KINDS[kind]
  const run = (sel) => {
    let q = supabase.from(c.table).select(sel).eq(c.key, id).order('created_at', { ascending: true })
    if (limit) q = q.limit(limit)
    return q
  }
  let r = await run('*,' + SENDER + ',' + c.react + '(user_id,emoji)')
  if (!r.error) return { data: r.data, error: null }
  diag(kind + ' messages (full query)', r.error)

  r = await run('*,' + SENDER)
  let rows = r.data
  if (r.error) {
    diag(kind + ' messages (no reactions)', r.error)
    r = await run('*')
    if (r.error) { diag(kind + ' messages (plain)', r.error); return { data: null, error: r.error } }
    rows = r.data || []
    const ids = [...new Set(rows.map(m => m.sender_id).filter(Boolean))]
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id,display_name,avatar_color,avatar_url').in('id', ids)
      const byId = Object.fromEntries((profs || []).map(p => [p.id, p]))
      rows = rows.map(m => ({ ...m, sender: byId[m.sender_id] || null }))
    }
  }
  let reactions = []
  try {
    const mids = (rows || []).map(m => m.id)
    if (mids.length) {
      const { data } = await supabase.from(c.react).select(c.rfk + ',user_id,emoji').in(c.rfk, mids)
      reactions = data || []
    }
  } catch {}
  return { data: (rows || []).map(m => ({ ...m, [c.react]: reactions.filter(x => x[c.rfk] === m.id).map(x => ({ user_id: x.user_id, emoji: x.emoji })) })), error: null }
}

// One message by id (used when a realtime insert arrives), with the same fallbacks.
export async function fetchChatMessage(supabase, kind, id) {
  const c = KINDS[kind]
  let r = await supabase.from(c.table).select('*,' + SENDER + ',' + c.react + '(user_id,emoji)').eq('id', id).single()
  if (!r.error) return r.data
  diag(kind + ' new message', r.error)
  r = await supabase.from(c.table).select('*').eq('id', id).single()
  if (r.error || !r.data) return null
  const { data: prof } = await supabase.from('profiles').select('id,display_name,avatar_color,avatar_url').eq('id', r.data.sender_id).maybeSingle()
  return { ...r.data, sender: prof || null, [c.react]: [] }
}
