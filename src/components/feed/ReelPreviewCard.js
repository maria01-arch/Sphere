'use client'
import { useEffect, useRef, useState } from 'react'
import { Clapperboard } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import HlsVideo from '@/components/HlsVideo'

// ── POST CARD ──────────────────────────────────────────────────────────────
export function ReelPreviewCard({ supabase, onOpen }) {
  const [reel, setReel] = useState(null)
  const videoRef = useRef(null)
  const wrapRef = useRef(null)
  useEffect(()=>{
    let cancelled = false
    supabase.from('reels').select('id,video_url,caption,author:profiles!user_id(display_name,username,avatar_url,avatar_color)').order('created_at',{ascending:false}).limit(20).then(({data})=>{
      if(cancelled||!data?.length) return
      setReel(data[Math.floor(Math.random()*data.length)])
    })
    return ()=>{cancelled=true}
  },[])
  // Autoplay (always muted here — this is just a feed teaser, not the real
  // Reels experience) once the card is mostly on screen, pause once it
  // scrolls away, same as Instagram/TikTok feed previews.
  useEffect(()=>{
    const el = wrapRef.current
    if(!el) return
    const obs = new IntersectionObserver(([entry])=>{
      const video = videoRef.current
      if(!video) return
      if(entry.isIntersecting) video.play?.().catch(()=>{}) // autoplay can reject if the browser hasn't decided this counts as a user-initiated context yet — harmless, the poster frame just stays put
      else video.pause?.()
    }, { threshold: 0.6 })
    obs.observe(el)
    return ()=>obs.disconnect()
  },[reel])
  if(!reel) return null
  return (
    <div ref={wrapRef} onClick={()=>onOpen(reel.id)} style={{margin:'10px 16px',borderRadius:18,overflow:'hidden',position:'relative',cursor:'pointer',height:200,background:'#000'}}>
      <HlsVideo videoRef={videoRef} src={reel.video_url} muted loop playsInline preload="metadata" style={{width:'100%',height:'100%',objectFit:'cover',opacity:0.85}}/>
      <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 50%)'}}/>
      <div style={{position:'absolute',top:12,left:12,display:'flex',alignItems:'center',gap:6,background:'rgba(0,0,0,0.5)',borderRadius:14,padding:'4px 10px'}}>
        <Clapperboard size={13}/>
        <span style={{color:'var(--text-primary)',fontSize:12,fontWeight:700}}>Reels</span>
      </div>
      <div style={{position:'absolute',bottom:10,left:12,right:12,display:'flex',alignItems:'center',gap:8}}>
        <Avatar url={reel.author?.avatar_url} name={reel.author?.display_name} color={reel.author?.avatar_color||'#5B9CF6'} size={26}/>
        <span style={{color:'var(--text-primary)',fontSize:13,fontWeight:600,textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>{reel.author?.display_name}</span>
      </div>
    </div>
  )
}
