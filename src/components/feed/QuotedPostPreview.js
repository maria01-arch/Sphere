'use client'
import { Avatar } from '@/components/common/Avatar'
import { getColor } from '@/lib/colors'
import { timeAgo } from '@/lib/timeAgo'
import { VerifiedBadge } from '@/components/common/VerifiedBadge'

// Compact, non-interactive preview of a reshared post — used only inside a
// quote-repost (a repost with the reposter's own caption added). Deliberately
// plain-text (no clickable mentions/links inside it): the whole card is one
// tap target that opens the original post, matching how Twitter/Bluesky
// quote-cards behave rather than nesting a second set of interactive
// elements inside an already-interactive feed entry.
export function QuotedPostPreview({ post, onOpen, onUserClick }) {
  const a = post.author || {}
  const color = a.avatar_color || getColor(a.id)
  return (
    <div onClick={()=>onOpen&&onOpen(post.id)} style={{border:'1px solid var(--border-color-2)',borderRadius:14,padding:12,cursor:onOpen?'pointer':'default',marginBottom:12,overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}>
        <Avatar url={a.avatar_url} name={a.display_name} color={color} size={22}/>
        <button onClick={e=>{e.stopPropagation();onUserClick&&onUserClick(a)}} style={{background:'none',border:'none',padding:0,cursor:'pointer',color:'var(--text-primary)',fontWeight:700,fontSize:13}}>{a.display_name}</button>
        <VerifiedBadge verified={a.verified} isAuthentic={a.is_authentic} plan={a.verified_plan} size={14}/>
        <span style={{color:'var(--text-faint)'}}>·</span>
        <span style={{color:'var(--text-quaternary)',fontSize:12}}>{timeAgo(post.created_at)}</span>
      </div>
      {post.content&&<p style={{color:'var(--text-secondary)',fontSize:13.5,lineHeight:1.45,margin:'0 0 8px',wordBreak:'break-word',display:'-webkit-box',WebkitLineClamp:4,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{post.content}</p>}
      {post.image_url&&<img src={post.image_url} alt="" loading="lazy" style={{width:'100%',maxHeight:220,objectFit:'cover',borderRadius:10,display:'block'}}/>}
    </div>
  )
}
