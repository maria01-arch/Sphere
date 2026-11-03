'use client'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

// Card-style announcement, matching the X/Twitter promo-card look — bold
// headline, a lighter description line, and an optional pill button that
// links wherever the admin points it. Dismissing it is remembered in
// localStorage keyed by the announcement's own id, so a new announcement
// will show again even if the person dismissed a previous one, but the same
// one never reappears once closed.
export function AnnouncementBanner({ supabase }) {
  const [ann, setAnn] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  useEffect(()=>{
    let cancelled = false
    supabase.from('announcements').select('*').gt('expires_at', new Date().toISOString()).order('created_at',{ascending:false}).limit(1).maybeSingle().then(({data})=>{
      if(cancelled || !data) return
      try { if(localStorage.getItem('dismissed_announcement_'+data.id)) return } catch(e){}
      setAnn(data)
    })
    return ()=>{cancelled=true}
  },[])
  if(!ann || dismissed) return null
  const close = () => {
    try { localStorage.setItem('dismissed_announcement_'+ann.id, '1') } catch(e){}
    setDismissed(true)
  }
  return (
    <div style={{background:'var(--primary)',padding:'18px 44px 18px 18px',position:'relative'}}>
      <button onClick={close} style={{position:'absolute',top:14,right:14,background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'50%',width:24,height:24,cursor:'pointer',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}><X size={14}/></button>
      <h3 style={{color:'#fff',fontSize:18,fontWeight:800,margin:'0 0 4px',lineHeight:1.25,wordBreak:'break-word'}}>{ann.message}</h3>
      {ann.description&&<p style={{color:'rgba(255,255,255,0.85)',fontSize:13.5,lineHeight:1.45,margin:'0 0 14px',wordBreak:'break-word'}}>{ann.description}</p>}
      {ann.button_text&&ann.button_url&&<a href={ann.button_url} target="_blank" rel="noopener noreferrer" style={{display:'inline-block',background:'#fff',color:'#111',fontWeight:700,fontSize:13.5,padding:'9px 20px',borderRadius:24,textDecoration:'none',marginTop:ann.description?0:2}}>{ann.button_text}</a>}
    </div>
  )
}
