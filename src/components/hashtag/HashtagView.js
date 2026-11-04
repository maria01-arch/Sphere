'use client'
import { useEffect, useState } from 'react'
import { ChevronLeft, Hash } from 'lucide-react'
import { PostCard } from '@/components/feed/PostCard'
import { RowSkeletonList } from '@/components/common/Skeletons'

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Newest posts that contain #tag (same query the native app uses).
export function HashtagView({ tag, currentUser, supabase, onBack, onUserClick, onOpenPost, sendPush }) {
  const [posts, setPosts] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let dead = false
    setPosts(null); setError('')
    ;(async () => {
      const { data, error: err } = await supabase.from('posts')
        .select('*,author:profiles!user_id(*),likes(user_id),reposts(user_id),comments(id)')
        .ilike('content', '%#' + tag + '%')
        .or('thread_order.is.null,thread_order.eq.0')
        .order('created_at', { ascending: false }).limit(40)
      if (dead) return
      if (err) { setError('Could not load this hashtag. Check your connection and try again.'); setPosts([]); return }
      // ilike also matches #tagging for #tag, so keep only exact matches.
      const re = new RegExp('(^|[^\\p{L}\\p{N}_])#' + esc(tag) + '(?![\\p{L}\\p{N}_])', 'iu')
      const rows = (data || []).filter(p => re.test(p.content || '')).map(p => ({
        ...p,
        user_liked: p.likes?.some(l => l.user_id === currentUser.id),
        user_reposted: p.reposts?.some(r => r.user_id === currentUser.id),
        likes_count: p.likes?.length || 0, reposts_count: p.reposts?.length || 0, comments_count: p.comments?.length || 0,
      }))
      setPosts(rows)
    })()
    return () => { dead = true }
  }, [tag, supabase, currentUser.id])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-header)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border-color)', padding: 'calc(12px + env(safe-area-inset-top)) 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} aria-label="Back" style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex' }}><ChevronLeft size={26} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 18, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>#{tag}</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{posts ? (posts.length === 0 ? 'No posts' : posts.length + (posts.length === 1 ? ' post' : ' posts')) : 'Loading…'}</div>
        </div>
      </div>
      {posts === null && <RowSkeletonList />}
      {posts && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 32px', color: 'var(--text-tertiary)' }}>
          <Hash size={44} style={{ opacity: 0.5, marginBottom: 12 }} />
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 6 }}>{error ? 'Something went wrong' : 'No posts with #' + tag + ' yet'}</div>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>{error || 'Be the first to post with this hashtag.'}</div>
        </div>
      )}
      {posts && posts.map(p => (
        <PostCard key={p.id} post={p} currentUser={currentUser} supabase={supabase} onUserClick={onUserClick} onDelete={null} onOpenPost={onOpenPost} sendPush={sendPush} />
      ))}
    </div>
  )
}
