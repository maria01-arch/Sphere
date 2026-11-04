'use client'
import { useEffect, useState } from 'react'
import { Bookmark, ChevronLeft, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { VerifiedBadge } from '@/components/common/VerifiedBadge'
import { getSaved, removeSaved, subscribeSaved } from '@/lib/savedPosts'

function ago(iso) {
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 3600) return Math.floor(s / 60) + 'm'
  if (s < 86400) return Math.floor(s / 3600) + 'h'
  return Math.floor(s / 86400) + 'd'
}

export function SavedPostsView({ currentUser, onBack, onOpenPost }) {
  const [list, setList] = useState([])
  useEffect(() => {
    const load = () => setList(getSaved(currentUser.id))
    load()
    return subscribeSaved(load)
  }, [currentUser.id])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-header)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border-color)', padding: 'calc(12px + env(safe-area-inset-top)) 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} aria-label="Back" style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex' }}><ChevronLeft size={26} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Saved</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{list.length} of 100 · kept on this device</div>
        </div>
      </div>
      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 32px', color: 'var(--text-tertiary)' }}>
          <Bookmark size={44} style={{ opacity: 0.5, marginBottom: 12 }} />
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 6 }}>Nothing saved yet</div>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>Tap the bookmark under any post to keep it here.</div>
        </div>
      ) : list.map(p => {
        const a = p.author || {}
        return (
          <div key={p.id} onClick={() => onOpenPost(p.id)} style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
            <Avatar url={a.avatar_url} name={a.display_name || a.username} color={a.avatar_color} size={42} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.display_name || a.username || 'Someone'}</span>
                <VerifiedBadge verified={a.verified} isAuthentic={a.is_authentic} plan={a.verified_plan} size={16} />
                <span style={{ color: 'var(--text-tertiary)' }}>{p.created_at ? '· ' + ago(p.created_at) : ''}</span>
              </div>
              {p.content && <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 3, color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{p.content}</div>}
              {p.image_url && <img src={p.image_url} alt="" loading="lazy" style={{ marginTop: 8, width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12 }} />}
              {!p.image_url && p.video_url && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>▶ Video post</div>}
            </div>
            <button onClick={e => { e.stopPropagation(); removeSaved(currentUser.id, p.id) }} aria-label="Remove from saved" style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', alignSelf: 'flex-start', padding: 6 }}><Trash2 size={17} /></button>
          </div>
        )
      })}
    </div>
  )
}
