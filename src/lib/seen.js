import { supabase } from '@/lib/supabase/instance'

// Remembers which posts were actually on screen and tells the server in small
// batches (table post_views), so the ranked For You feed can push posts you
// already saw further down. If the table does not exist yet, it quietly stops.
let queue = new Set()
let off = false
let timer = null
let userId = null

async function flush() {
  timer = null
  if (off || queue.size === 0 || !userId) return
  const ids = Array.from(queue).slice(0, 100)
  ids.forEach(i => queue.delete(i))
  const now = new Date().toISOString()
  const { error } = await supabase.from('post_views').upsert(ids.map(post_id => ({ user_id: userId, post_id, seen_at: now })), { onConflict: 'user_id,post_id' })
  if (error) off = true
}

export function markSeen(uid, postId) {
  if (off || !uid || !postId) return
  userId = uid
  queue.add(String(postId))
  if (queue.size >= 15) flush()
  else if (!timer) timer = setTimeout(flush, 6000)
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush() })
}

// Call from a post's element: marks it seen once ~60% visible for a moment.
export function observeSeen(el, uid, postId) {
  if (!el || typeof IntersectionObserver === 'undefined') return () => {}
  let t = null
  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { if (!t) t = setTimeout(() => { markSeen(uid, postId); io.disconnect() }, 800) }
    else if (t) { clearTimeout(t); t = null }
  }, { threshold: 0.6 })
  io.observe(el)
  return () => { if (t) clearTimeout(t); io.disconnect() }
}
