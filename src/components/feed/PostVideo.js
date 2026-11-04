'use client'
import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import HlsVideo from '@/components/HlsVideo'

// Video inside a post. Plays quietly by itself while it is mostly on screen,
// pauses when you scroll away, and has the normal play / seek controls.
export function PostVideo({ src, poster, onFirstPlay }) {
  const ref = useRef(null)
  const wrapRef = useRef(null)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => {
      const v = ref.current
      if (!v) return
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) { v.play?.().catch(() => {}) }
      else v.pause?.()
    }, { threshold: [0, 0.6, 1] })
    io.observe(el)
    return () => io.disconnect()
  }, [src])

  return (
    <div ref={wrapRef} style={{position:'relative',marginBottom:12,borderRadius:12,overflow:'hidden',background:'#000'}} onClick={e=>e.stopPropagation()}>
      <HlsVideo videoRef={ref} src={src} poster={poster||undefined} muted={muted} loop playsInline controls preload="metadata"
        style={{width:'100%',maxHeight:'70vh',display:'block',background:'#000'}} />
      <button onClick={(e)=>{e.stopPropagation(); const next=!muted; setMuted(next); if(ref.current) ref.current.muted=next}}
        aria-label={muted?'Unmute':'Mute'}
        style={{position:'absolute',top:8,right:8,width:32,height:32,borderRadius:'50%',border:'none',background:'rgba(0,0,0,0.6)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
        {muted?<VolumeX size={16}/>:<Volume2 size={16}/>}
      </button>
    </div>
  )
}
