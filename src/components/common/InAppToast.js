'use client'
import { useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'

// Brief popup for new activity that arrives while you're looking at
// something else — tap to jump straight there, or it clears itself after a
// few seconds. Deliberately one at a time rather than a queue/stack: a
// burst of activity (e.g. several messages in a row) just keeps replacing
// this with the latest, which is what most chat apps do too.
export function InAppToast({ toast, onClose, onClick }) {
  useEffect(()=>{
    if(!toast) return
    const t = setTimeout(onClose, 4500)
    return ()=>clearTimeout(t)
  },[toast])
  if(!toast) return null
  return (
    <div className="dk-toast" onClick={onClick} style={{position:'fixed',top:'calc(12px + env(safe-area-inset-top))',left:12,right:12,zIndex:600,background:'var(--bg-card-8)',backdropFilter:'blur(10px)',border:'1px solid var(--border-color-2)',borderRadius:16,padding:'12px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',boxShadow:'0 8px 24px rgba(0,0,0,0.4)',maxWidth:500,margin:'0 auto'}}>
      {toast.avatarUrl?<Avatar url={toast.avatarUrl} name={toast.title} size={36}/>:<div style={{width:36,height:36,borderRadius:'50%',background:'var(--bg-card-3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'var(--text-secondary)'}}><Bell size={16}/></div>}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:700,fontSize:13,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{toast.title}</div>
        <div style={{fontSize:12,color:'var(--text-secondary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{toast.body}</div>
      </div>
    </div>
  )
}
