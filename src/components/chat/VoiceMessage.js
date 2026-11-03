'use client'
import { useRef, useState } from 'react'
import { Pause, Play, Send, Trash2 } from 'lucide-react'
import { formatVoiceDuration } from '@/lib/format'

// Recording-in-progress UI: replaces the whole composer row while active so
// there's no ambiguity about what tapping will do.
export function VoiceRecordingBar({ seconds, onCancel, onSend }) {
  return (
    <div style={{padding:'10px 14px',display:'flex',gap:12,alignItems:'center'}}>
      <style>{'@keyframes voiceRecPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:0.6}}'}</style>
      <button onClick={onCancel} style={{width:40,height:40,borderRadius:'50%',background:'var(--bg-card)',border:'none',cursor:'pointer',color:'var(--danger)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={18}/></button>
      <div style={{flex:1,display:'flex',alignItems:'center',gap:8,color:'var(--text-primary)',fontSize:14}}>
        <span style={{width:9,height:9,borderRadius:'50%',background:'var(--danger)',flexShrink:0,animation:'voiceRecPulse 1.2s ease-in-out infinite'}}/>
        <span>Recording... {formatVoiceDuration(seconds)}</span>
      </div>
      <button onClick={onSend} style={{width:46,height:46,borderRadius:'50%',background:'var(--primary)',border:'none',cursor:'pointer',color:'#fff',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><Send size={19}/></button>
    </div>
  )
}

// Playback bubble for a sent voice note — plain <audio> element driven by a
// custom play/pause button + scrubber so it matches the rest of the chat's
// styling instead of the browser's native (and inconsistent across
// browsers/WebViews) <audio controls> widget.
export function VoiceMessagePlayer({ url, duration, own }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0-1
  const [dur, setDur] = useState(duration||0)

  const toggle = () => {
    const a = audioRef.current
    if(!a) return
    if(playing) a.pause()
    else a.play().catch(err=>console.error('Voice note playback failed:', err))
  }

  return (
    <div style={{display:'flex',alignItems:'center',gap:10,minWidth:180}}>
      <audio ref={audioRef} src={url} preload="metadata"
        onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}
        onEnded={()=>{setPlaying(false);setProgress(0)}}
        onLoadedMetadata={e=>{ if(isFinite(e.target.duration)) setDur(e.target.duration) }}
        onTimeUpdate={e=>{ const d=e.target.duration; if(d) setProgress(e.target.currentTime/d) }}
        style={{display:'none'}}/>
      <button onClick={toggle} style={{width:34,height:34,borderRadius:'50%',border:'none',background:own?'rgba(255,255,255,0.25)':'var(--bg-card-2)',color:own?'#fff':'var(--text-primary)',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {playing?<Pause size={15}/>:<Play size={15} style={{marginLeft:2}}/>}
      </button>
      <div style={{flex:1,height:3,borderRadius:2,background:own?'rgba(255,255,255,0.3)':'var(--bg-card-3)',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',left:0,top:0,bottom:0,width:(progress*100)+'%',background:own?'#fff':'var(--primary)',borderRadius:2}}/>
      </div>
      <span style={{fontSize:11,color:own?'rgba(255,255,255,0.85)':'var(--text-quaternary)',flexShrink:0,minWidth:30,textAlign:'right'}}>{formatVoiceDuration(dur)}</span>
    </div>
  )
}
