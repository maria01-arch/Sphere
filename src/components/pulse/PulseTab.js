'use client'
import { useEffect, useState } from 'react'
import { X, Zap } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { ReelsView } from '@/components/reels/ReelsView'
import { StoreSection } from '@/components/store/StoreSection'
import { timeAgo } from '@/lib/timeAgo'

export function PulseTab({ currentUser, supabase, onUserClick, pendingReelId, onReelsOpened, reelsRef, onMessageUser }) {
  const [pulses, setPulses] = useState([])
  const [myPulse, setMyPulse] = useState([])
  const [viewingPulse, setViewingPulse] = useState(null)
  const [showCreatePulse, setShowCreatePulse] = useState(false)
  const [showReels, setShowReels] = useState(false)
  const [pulseText, setPulseText] = useState('')
  const [pulseBg, setPulseBg] = useState('#5B9CF6')
  const [saving, setSaving] = useState(false)
  const COLORS = ['#5B9CF6','#845EF7','#FF6B35','#00C9A7','#FF4757','#F7B731','#FD79A8','#A29BFE']

  useEffect(()=>{ loadAll() },[])
  const [openedReelId, setOpenedReelId] = useState(null)
  useEffect(()=>{
    if(pendingReelId){
      // Capture the value into local state first — telling the parent to
      // clear pendingReelId (via onReelsOpened) can land in the same React
      // batch as showReels becoming true, meaning ReelsView could end up
      // reading pendingReelId after it's already been reset to null. Local
      // state driven only by this effect can't be raced like that.
      setOpenedReelId(pendingReelId)
      setShowReels(true)
      onReelsOpened&&onReelsOpened()
    }
  },[pendingReelId])

  const loadAll = async () => {
    const [{data:p},{data:mp}] = await Promise.all([
      supabase.from('pulses').select('*,author:profiles!user_id(id,display_name,username,avatar_url,avatar_color)').order('created_at',{ascending:false}),
      supabase.from('pulses').select('*,author:profiles!user_id(id,display_name,username,avatar_url,avatar_color)').eq('user_id',currentUser.id).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}),
    ])
    setPulses((p||[]).filter(x=>x.user_id!==currentUser.id))
    setMyPulse(mp||[])
  }

  const createPulse = async () => {
    if(!pulseText.trim()) return
    setSaving(true)
    const {data} = await supabase.from('pulses').insert({user_id:currentUser.id,content:pulseText.trim(),bg_color:pulseBg}).select('*,author:profiles!user_id(id,display_name,username,avatar_url,avatar_color)').single()
    if(data) { setMyPulse(prev=>[data,...(Array.isArray(prev)?prev:[])].filter(Boolean)); setPulseText(''); setShowCreatePulse(false) }
    setSaving(false)
  }

  if(showReels){
    if(reelsRef) reelsRef.current = {closeReels:()=>{setShowReels(false)}}
    return <ReelsView currentUser={currentUser} supabase={supabase} onUserClick={onUserClick} initialReelId={openedReelId} onClose={()=>{setShowReels(false);if(reelsRef)reelsRef.current=null}}/>
  }
  if(reelsRef) reelsRef.current = null

  if(viewingPulse) {
    const allPulses=[...(Array.isArray(myPulse)?myPulse:[]),...pulses]
    const currentIdx=allPulses.findIndex(p=>p.id===viewingPulse.id)
    const goNext=()=>{ if(currentIdx<allPulses.length-1)setViewingPulse(allPulses[currentIdx+1]); else{setViewingPulse(null)} }
    const goPrev=()=>{ if(currentIdx>0)setViewingPulse(allPulses[currentIdx-1]) }
  return (
    <div className="dk-page" style={{position:'fixed',inset:0,zIndex:300,background:viewingPulse.bg_color||'var(--bg-app)',display:'flex',flexDirection:'column'}}>
    <style>{'@keyframes shrink{from{width:100%}to{width:0%}}'}</style>
      <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',gap:2,padding:'4px 8px',zIndex:10}}>
        {allPulses.map((p,i)=>(
          <div key={p.id} style={{flex:1,height:3,borderRadius:2,background:'rgba(255,255,255,0.2)',overflow:'hidden'}}>
            <div style={{height:'100%',background:'#fff',borderRadius:2,animation:i===currentIdx?'shrink 5s linear forwards':'none',width:i<currentIdx?'100%':'0%'}} onAnimationEnd={goNext}/>
          </div>
        ))}
      </div>
      <style>{'@keyframes progress{from{width:0}to{width:100%}}'}</style>
      <div style={{padding:'20px 16px 8px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>{setViewingPulse(null)}} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',display:'flex'}}><X size={24}/></button>
        <Avatar url={viewingPulse.author?.avatar_url} name={viewingPulse.author?.display_name} color={viewingPulse.author?.avatar_color||'#5B9CF6'} size={38}/>
        <div>
          <div style={{color:'var(--text-primary)',fontWeight:700,fontSize:15}}>{viewingPulse.author?.display_name}</div>
          <div style={{color:'rgba(255,255,255,0.6)',fontSize:12}}>{timeAgo(viewingPulse.created_at)}</div>
        </div>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
        <p style={{color:'var(--text-primary)',fontSize:24,fontWeight:700,textAlign:'center',lineHeight:1.5}}>{viewingPulse.content}</p>
      </div>
      <div style={{position:'absolute',top:60,left:0,bottom:80,width:'40%'}} onClick={goPrev}/>
      <div style={{position:'absolute',top:60,right:0,bottom:80,width:'40%'}} onClick={goNext}/>
      <div style={{padding:'0 16px 40px',display:'flex',gap:10}}>
        <button onClick={()=>onUserClick(viewingPulse.author)} style={{flex:1,background:'var(--bg-card-8)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:24,padding:'12px',color:'var(--text-primary)',fontWeight:700,cursor:'pointer'}}>View Profile</button>
      </div>
    </div>
  )}

  if(showCreatePulse) return (
    <div className="screen-in" style={{minHeight:'100dvh',background:pulseBg,color:'var(--text-primary)',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setShowCreatePulse(false)} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',display:'flex'}}><X size={24}/></button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>New Pulse</span>
        <button onClick={createPulse} disabled={saving||!pulseText.trim()} style={{background:'rgba(255,255,255,0.2)',border:'1px solid rgba(255,255,255,0.4)',borderRadius:20,padding:'8px 20px',color:'var(--text-primary)',fontWeight:700,cursor:'pointer'}}>{saving?'Posting...':'Share'}</button>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
        <textarea value={pulseText} onChange={e=>setPulseText(e.target.value)} placeholder="What's your pulse?" autoFocus style={{background:'transparent',border:'none',color:'var(--text-primary)',fontSize:24,fontWeight:700,textAlign:'center',outline:'none',resize:'none',width:'100%',lineHeight:1.5,fontFamily:'sans-serif'}} rows={4}/>
      </div>
      <div style={{padding:'16px',display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
        {COLORS.map(c=><div key={c} onClick={()=>setPulseBg(c)} style={{width:32,height:32,borderRadius:'50%',background:c,border:pulseBg===c?'3px solid #fff':'3px solid transparent',cursor:'pointer'}}/>)}
      </div>
    </div>
  )

  return (
    <div style={{paddingBottom:20}}>
      <p style={{padding:'12px 16px 8px',color:'var(--text-secondary)',fontSize:13,fontWeight:600}}>PULSES</p>
      <div style={{display:'flex',gap:12,padding:'0 16px 20px',overflowX:'auto',scrollbarWidth:'none'}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flexShrink:0}}>
          <div onClick={()=>setShowCreatePulse(true)} style={{width:64,height:64,borderRadius:'50%',background:'var(--bg-card)',border:'2px dashed var(--primary)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,color:'var(--primary)',cursor:'pointer'}}>＋</div>
          <span style={{color:'var(--text-subtle)',fontSize:11}}>Add Pulse</span>
        </div>
        {(Array.isArray(myPulse)?myPulse:[]).map(mp=>(
          <div key={mp.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flexShrink:0,position:'relative'}}>
            <div onClick={()=>setViewingPulse({...mp,author:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}})} style={{width:64,height:64,borderRadius:'50%',background:mp.bg_color||'#5B9CF6',border:'3px solid var(--repost)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-primary)',cursor:'pointer'}}><Zap size={22}/></div>
            <button onClick={async(e)=>{e.stopPropagation();await supabase.from('pulses').delete().eq('id',mp.id);setMyPulse(prev=>prev.filter(p=>p.id!==mp.id))}} style={{position:'absolute',top:-4,right:-4,width:20,height:20,borderRadius:'50%',background:'var(--danger)',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={12}/></button>
            <span style={{color:'var(--text-subtle)',fontSize:11}}>My Pulse</span>
          </div>
        ))}
        {pulses.map(p=>(
          <div key={p.id} onClick={()=>setViewingPulse(p)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,cursor:'pointer',flexShrink:0}}>
            <div style={{width:64,height:64,borderRadius:'50%',background:p.bg_color||'#5B9CF6',border:'3px solid #845EF7',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
              <Avatar url={p.author?.avatar_url} name={p.author?.display_name} color={p.author?.avatar_color} size={58}/>
            </div>
            <span style={{color:'var(--text-subtle)',fontSize:11,maxWidth:64,textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.author?.display_name}</span>
          </div>
        ))}
        {pulses.length===0&&<p style={{color:'var(--text-quaternary)',fontSize:14,padding:'20px 0'}}>No pulses yet</p>}
      </div>

      <StoreSection currentUser={currentUser} supabase={supabase} onUserClick={onUserClick} onMessageUser={onMessageUser}/>
    </div>
  )
}
