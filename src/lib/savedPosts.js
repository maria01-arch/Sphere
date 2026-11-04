// Saved posts live on this device only (same as the native app: it keeps them
// in AsyncStorage under the same key name). Nothing is sent to the server.
const MAX_SAVED = 100
const key = (uid) => 'saved_posts_v1:' + (uid || 'anon')
const listeners = new Set()

function read(uid) {
  try {
    const raw = localStorage.getItem(key(uid))
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}
function write(uid, list) {
  try { localStorage.setItem(key(uid), JSON.stringify(list.slice(0, MAX_SAVED))) } catch {}
  listeners.forEach(fn => { try { fn() } catch {} })
}

export function getSaved(uid) { return read(uid) }
export function isSaved(uid, postId) { return read(uid).some(p => p.id === postId) }

// Keeps only what is needed to draw the post again later.
function snapshot(post) {
  const a = post.author || {}
  return {
    id: post.id, user_id: post.user_id, content: post.content, image_url: post.image_url,
    video_url: post.video_url, created_at: post.created_at, link_preview: post.link_preview,
    likes_count: post.likes_count || 0, reposts_count: post.reposts_count || 0, comments_count: post.comments_count || 0,
    author: { id: a.id, username: a.username, display_name: a.display_name, avatar_url: a.avatar_url,
      avatar_color: a.avatar_color, verified: a.verified, is_authentic: a.is_authentic, verified_plan: a.verified_plan },
    savedAt: Date.now(),
  }
}

// Returns true when the post is saved after the call, false when it was removed.
export function toggleSaved(uid, post) {
  const list = read(uid)
  if (list.some(p => p.id === post.id)) { write(uid, list.filter(p => p.id !== post.id)); return false }
  write(uid, [snapshot(post), ...list])
  return true
}
export function removeSaved(uid, postId) { write(uid, read(uid).filter(p => p.id !== postId)) }

export function subscribeSaved(fn) { listeners.add(fn); return () => listeners.delete(fn) }
