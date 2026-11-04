'use client'
import { useRef } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import HlsVideo from '@/components/HlsVideo'
import { setVideoMuted, useExclusiveVideo } from '@/lib/videoPrefs'

// Video inside a post. Only one feed video plays at a time, the mute button is shared by
// all of them, and Settings > Autoplay videos can switch scroll-autoplay off.
export function PostVideo({ src, poster }) {
  const ref = useRef(null)
  const wrapRef = useRef(null)
  const { muted } = useExclusiveVideo(ref, wrapRef, src)

  return (
    <div ref={wrapRef} style={{position:'relative',marginBottom:12,borderRadius:12,overflow:'hidden',background:'#000'}} onClick={e=>e.stopPropagation()}>
      <HlsVideo videoRef={ref} src={src} poster={poster||undefined} muted={muted} loop playsInline controls preload="metadata"
        style={{width:'100%',maxHeight:'70vh',display:'block',background:'#000'}} />
      <button onClick={(e)=>{e.stopPropagation(); setVideoMuted(!muted)}}
        aria-label={muted?'Unmute':'Mute'}
        style={{position:'absolute',top:8,right:8,width:32,height:32,borderRadius:'50%',border:'none',background:'rgba(0,0,0,0.6)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
        {muted?<VolumeX size={16}/>:<Volume2 size={16}/>}
      </button>
    </div>
  )
}
