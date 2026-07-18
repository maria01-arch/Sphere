'use client'
import { useEffect, useState, useRef, useCallback, memo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme'
import {
  X, Check, CheckCheck, MessageCircle, MessageSquare, MapPin, Award, Settings,
  Image as ImageIcon, User, Lock, Globe, Bell, LogOut, XCircle, CheckCircle2,
  Camera, Send, Heart, Repeat2, Share, Trash2, CornerUpLeft, Zap, Copy, Pencil,
  Video, Search, Palette, Megaphone, Users, Link2, Inbox, Save, Brain,
  Loader2, Home, Clapperboard, ArrowRight, FileText, MoreHorizontal, AlertTriangle, Upload, Share2
} from 'lucide-react'
const supabase = createClient()

class ErrorBoundary extends (require('react').Component) {
  constructor(props) { super(props); this.state = {error:null} }
  static getDerivedStateFromError(e) { return {error:e} }
  render() {
    if(this.state.error) return (
      <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)',padding:20,fontFamily:'sans-serif'}}>
        <h2 style={{color:'#FF4757'}}>App Error</h2>
        <p style={{color:'var(--text-subtle)',fontSize:14,wordBreak:'break-word'}}>{this.state.error?.message}</p>
        <pre style={{color:'var(--text-muted)',fontSize:11,overflow:'auto'}}>{this.state.error?.stack?.slice(0,500)}</pre>
        <button onClick={()=>window.location.reload()} style={{marginTop:16,background:'#5B9CF6',border:'none',borderRadius:12,padding:'12px 24px',color:'var(--text-primary)',cursor:'pointer'}}>Reload</button>
      </div>
    )
    return this.props.children
  }
}

const COLORS = ['#FF6B35','#00C9A7','#845EF7','#F7B731','#FF4757','#5B9CF6','#A29BFE','#FD79A8']
const getColor = (id) => COLORS[(id?.charCodeAt(0)||0) % COLORS.length]

function timeAgo(ts) {
  if (!ts) return ''
  const d = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (d < 60) return 'now'
  if (d < 3600) return `${Math.floor(d/60)}m`
  if (d < 86400) return `${Math.floor(d/3600)}h`
  return `${Math.floor(d/86400)}d`
}

// True when a Supabase/Postgrest error means a column or table referenced in
// the query doesn't exist yet — i.e. supabase_migration_reply_and_stickers.sql
// hasn't been run on this project. Used to fall back gracefully instead of
// failing sends silently.
function isMissingColumnError(error) {
  if(!error) return false
  const code = error.code||''
  const msg = (error.message||'').toLowerCase()
  return code==='42703' || code==='PGRST204' || code==='42P01' ||
    (msg.includes('column') && msg.includes('does not exist')) ||
    (msg.includes('could not find') && msg.includes('column')) ||
    msg.includes('relation') && msg.includes('does not exist')
}

// Reaction picker emoji set — shown as a scrollable grid in the message
// action sheet (both DM and group chat).
const QUICK_REACTIONS = [
  '👍','❤️','😂','😮','😢','🔥','👏','💯','🙏','😍',
  '😊','😁','😅','🤣','🥹','😉','😘','😎','🤩','🥳',
  '😇','🙃','😴','😭','😡','🤬','🤯','🥵','🥶','😱',
  '🤔','🤨','😐','🙄','😬','🤫','🤗','🤝','👌','✌️',
  '🤞','👀','💪','🫶','💔','⭐','✨','🎉','🎊',
  '🥰','😆','🤤','😷','🤢','🤮','👋','🖤','💙','💚'
]

function TextWithMentions({ text, supabase, onUserClick }) {
  if(!text) return null
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g)
  return <>{parts.map((part,i)=>{
    if(part.startsWith('@')&&part.length>1){
      const handle = part.slice(1)
      return <span key={i} onClick={async(e)=>{
        e.stopPropagation()
        const {data} = await supabase.from('profiles').select('*').eq('username',handle.toLowerCase()).maybeSingle()
        if(data) onUserClick(data)
      }} style={{color:'#5B9CF6',fontWeight:600,cursor:'pointer'}}>{part}</span>
    }
    return <span key={i}>{part}</span>
  })}</>
}

function Avatar({ url, name='', color='#5B9CF6', size=42, online=false }) {
  const i = (name||'?').trim().split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'??'
  return (
    <div style={{position:'relative',flexShrink:0,display:'inline-block'}}>
      {url
        ? <img src={url} alt={name} style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',boxShadow:`0 0 0 2px #090B10`}} loading="lazy"/>
        : <div style={{width:size,height:size,borderRadius:'50%',background:`linear-gradient(135deg,${color}88,${color})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.36,fontWeight:800,color:'var(--text-primary)',boxShadow:`0 0 0 2px #090B10`}}>{i}</div>
      }
      {online&&<div style={{position:'absolute',bottom:1,right:1,width:size*0.27,height:size*0.27,borderRadius:'50%',background:'#00C9A7',border:'2px solid #090B10'}}/>}
    </div>
  )
}

// ── CHAT BUBBLE (shared by DM + GroupChat) ──────────────────────────────────
// Reply text is stored as a flattened "Sender Name: quoted text" string today.
// We split on the first ": " to render it WhatsApp-style (bold name + dimmed
// quote) without needing a schema migration. Older messages with no ": " just
// render as a plain quoted line. If replyToId is present (new messages only —
// requires the reply_to_id column) the quote becomes tappable and jumps to
// the original message.
function ReplyQuoteInline({ text, own, onJump }) {
  if(!text) return null
  const idx = text.indexOf(': ')
  const name = idx>-1 ? text.slice(0,idx) : null
  const quoted = idx>-1 ? text.slice(idx+2) : text
  return (
    <div onClick={onJump?(e)=>{e.stopPropagation();onJump()}:undefined} style={{borderLeft:'3px solid '+(own?'rgba(255,255,255,0.6)':'#5B9CF6'),background:own?'rgba(0,0,0,0.16)':'rgba(91,156,246,0.08)',borderRadius:8,padding:'5px 10px',marginBottom:6,cursor:onJump?'pointer':'default'}}>
      {name&&<div style={{fontWeight:700,fontSize:12,color:own?'rgba(255,255,255,0.95)':'#5B9CF6',marginBottom:1}}>{name}</div>}
      <div style={{fontSize:12.5,color:own?'rgba(255,255,255,0.7)':'var(--text-tertiary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{quoted}</div>
    </div>
  )
}

// The quote-reply preview shown above the composer while replying.
function ReplyComposerBar({ text, onCancel }) {
  if(!text) return null
  const idx = text.indexOf(': ')
  const name = idx>-1 ? text.slice(0,idx) : null
  const quoted = idx>-1 ? text.slice(idx+2) : text
  return (
    <div style={{padding:'8px 14px',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid var(--border-color)'}}>
      <div style={{width:3,alignSelf:'stretch',background:'#5B9CF6',borderRadius:2,minHeight:28}}/>
      <div style={{flex:1,minWidth:0}}>
        {name&&<div style={{color:'#5B9CF6',fontSize:12,fontWeight:700}}>{name}</div>}
        <div style={{color:'var(--text-tertiary)',fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{quoted}</div>
      </div>
      <button onClick={onCancel} style={{background:'none',border:'none',color:'var(--text-secondary)',cursor:'pointer',flexShrink:0,display:'flex'}}><X size={18}/></button>
    </div>
  )
}

// A sticker renders as bare media (no bubble chrome), WhatsApp/Telegram-style.
// sticker_url ending in a video extension plays as a silent looping clip.
const VIDEO_EXT = /\.(mp4|webm|mov)$/i
// preventDefault on contextmenu + the touch-callout/drag/select CSS below
// stop the browser's native "save/share image" popup from firing on a long
// press. Without this, that native popup and the app's own long-press timer
// (which opens the reaction sheet) fight over the same gesture and the page
// stops responding until the user dismisses the native menu — which reads
// as the whole app freezing.
const NO_CALLOUT_STYLE = {
  WebkitTouchCallout:'none', WebkitUserSelect:'none', userSelect:'none',
  WebkitUserDrag:'none', KhtmlUserSelect:'none', MozUserSelect:'none', msUserSelect:'none'
}
function StickerMedia({ url, size=132 }) {
  const blockContextMenu = (e)=>e.preventDefault()
  if(VIDEO_EXT.test(url)) {
    return <video src={url} autoPlay loop muted playsInline disablePictureInPicture controlsList="nodownload noplaybackrate"
      onContextMenu={blockContextMenu} draggable={false}
      style={{width:size,height:size,objectFit:'contain',display:'block',...NO_CALLOUT_STYLE}}/>
  }
  return <img src={url} alt="sticker" loading="lazy" draggable={false} onContextMenu={blockContextMenu}
    style={{width:size,height:size,objectFit:'contain',display:'block',...NO_CALLOUT_STYLE,pointerEvents:'auto'}}/>
}

// Single message row: avatar (for others) + bubble + reactions.
// Bubble corners are uniform/rounded (no tail) — pill-style like Beeper.
// Reply quotes render *inside* the bubble — WhatsApp-style — via ReplyQuoteInline.
// Custom comparator: the call sites pass onClick/onLongPress/etc as fresh
// inline arrow functions on every parent render (they close over `msg`,
// which is itself a stable reference from the `messages` array state), so a
// plain shallow-compare memo would never skip a re-render — every keystroke
// in the composer would re-render the entire message list. Comparing only
// the props that actually affect what's rendered lets memo do its job.
function messageBubblePropsEqual(prev, next) {
  return prev.msg === next.msg &&
    prev.own === next.own &&
    prev.reactions === next.reactions &&
    prev.isEditing === next.isEditing &&
    prev.editValue === next.editValue &&
    prev.highlighted === next.highlighted &&
    prev.showSenderInfo === next.showSenderInfo &&
    prev.showReadTicks === next.showReadTicks &&
    prev.currentUserId === next.currentUserId &&
    prev.rowId === next.rowId
}
const MessageBubble = memo(function MessageBubble({
  msg, own, showSenderInfo=false,
  onAvatarClick, onImageClick,
  onLongPress, onPressEnd,
  reactions, onToggleReaction, currentUserId,
  isEditing, editValue, onEditChange, onSaveEdit, onCancelEdit,
  showReadTicks=false,
  onJumpToReply, highlighted=false, rowId
}) {
  const isSticker = msg.is_sticker && msg.sticker_url
  // Long-press handlers live on the bubble/sticker element itself, not the
  // full-width row — otherwise tapping empty space next to a bubble (the
  // rest of the flex row) would also trigger the action sheet.
  const pressHandlers = isEditing ? {} : {
    onTouchStart:onLongPress, onTouchEnd:onPressEnd, onTouchMove:onPressEnd,
    onMouseDown:onLongPress, onMouseUp:onPressEnd
  }
  return (
    <div id={rowId}
      style={{display:'flex',justifyContent:own?'flex-end':'flex-start',gap:8,alignItems:'flex-end',userSelect:'none',WebkitUserSelect:'none',transition:'background-color 0.3s ease',backgroundColor:highlighted?'rgba(91,156,246,0.14)':'transparent',borderRadius:14}}>
      {!own&&showSenderInfo&&<div onClick={onAvatarClick} style={{cursor:'pointer',flexShrink:0}}><Avatar url={msg.sender?.avatar_url} name={msg.sender?.display_name} color={msg.sender?.avatar_color||'#5B9CF6'} size={28}/></div>}
      <div style={{maxWidth:'75%'}}>
        {!own&&showSenderInfo&&<div style={{color:'#5B9CF6',fontSize:11,fontWeight:700,marginBottom:3,paddingLeft:4}}>{msg.sender?.display_name}</div>}
        {isEditing?(
          <div style={{display:'flex',gap:6}}>
            <input value={editValue} onChange={onEditChange} onKeyDown={e=>e.key==='Enter'&&onSaveEdit()} style={{flex:1,background:'var(--bg-card-2)',border:'1px solid #5B9CF6',borderRadius:16,padding:'8px 12px',color:'var(--text-primary)',fontSize:14,outline:'none'}}/>
            <button onClick={onSaveEdit} style={{background:'#5B9CF6',border:'none',borderRadius:16,padding:'8px 12px',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center'}}><Check size={16}/></button>
            <button onClick={onCancelEdit} style={{background:'var(--bg-card-2)',border:'none',borderRadius:16,padding:'8px 12px',color:'var(--text-primary)',cursor:'pointer',display:'flex',alignItems:'center'}}><X size={16}/></button>
          </div>
        ):isSticker?(
          <div {...pressHandlers} onContextMenu={e=>e.preventDefault()} style={{WebkitTouchCallout:'none'}}>
            {msg.reply_to&&<ReplyQuoteInline text={msg.reply_to} own={own} onJump={msg.reply_to_id?()=>onJumpToReply?.(msg.reply_to_id):undefined}/>}
            <StickerMedia url={msg.sticker_url}/>
            <div style={{fontSize:10,color:msg._failed?'#F87171':'var(--text-quaternary)',marginTop:2,textAlign:own?'right':'left',display:'flex',gap:4,justifyContent:own?'flex-end':'flex-start',alignItems:'center'}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}>{msg._failed?<><AlertTriangle size={12}/> Failed to send</>:timeAgo(msg.created_at)}</span>
              {showReadTicks&&own&&!msg._failed&&<span style={{color:msg.read_at?'#5EE6C4':'var(--text-quaternary)',display:'inline-flex'}}>{msg.read_at?<CheckCheck size={14}/>:<Check size={14}/>}</span>}
            </div>
          </div>
        ):(
          <div {...pressHandlers} style={{padding:msg.image_url?'6px':'11px 15px',borderRadius:20,background:own?'linear-gradient(135deg,#5B9CF6,#845EF7)':'var(--bg-card-7)',color:own?'#fff':'var(--text-primary)',fontSize:15,lineHeight:1.5,wordBreak:'break-word',overflow:'hidden',opacity:msg._failed?0.7:1,outline:msg._failed?'1px solid #F87171':'none'}}>
            {msg.reply_to&&<ReplyQuoteInline text={msg.reply_to} own={own} onJump={msg.reply_to_id?()=>onJumpToReply?.(msg.reply_to_id):undefined}/>}
            {msg.image_url?<img src={msg.image_url} style={{maxWidth:220,maxHeight:220,borderRadius:14,display:'block',cursor:'pointer'}} alt="img" loading="lazy" onClick={()=>onImageClick(msg.image_url)}/>:msg.content}
            <div style={{fontSize:10,color:msg._failed?'#F87171':(own?'rgba(255,255,255,0.75)':'var(--text-quaternary)'),marginTop:4,textAlign:'right',padding:msg.image_url?'0 8px 6px':'0',display:'flex',gap:4,justifyContent:'flex-end',alignItems:'center'}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}>{msg._failed?<><AlertTriangle size={12}/> Failed to send</>:timeAgo(msg.created_at)}</span>
              {showReadTicks&&own&&!msg._failed&&<span style={{color:msg.read_at?'#5EE6C4':'rgba(255,255,255,0.5)',display:'inline-flex'}}>{msg.read_at?<CheckCheck size={14}/>:<Check size={14}/>}</span>}
            </div>
          </div>
        )}
        {reactions?.length>0&&<div style={{display:'flex',gap:4,marginTop:2,flexWrap:'wrap',justifyContent:own?'flex-end':'flex-start'}}>
          {Object.entries(reactions.reduce((acc,r)=>{acc[r.emoji]=(acc[r.emoji]||0)+1;return acc},{})).map(([emoji,count])=>{
            const mine = reactions.some(r=>r.emoji===emoji&&r.user_id===currentUserId)
            return <span key={emoji} onClick={()=>onToggleReaction(emoji)} style={{background:mine?'rgba(91,156,246,0.25)':'var(--bg-card-2)',border:mine?'1px solid #5B9CF6':'none',borderRadius:10,padding:'2px 7px',fontSize:12,cursor:'pointer'}}>{emoji}{count>1?' '+count:''}</span>
          })}
        </div>}
      </div>
    </div>
  )
}, messageBubblePropsEqual)

// ── STICKER TRAY (shared by DM + GroupChat) ─────────────────────────────────
// Sticker packs are shared/public (anyone can browse & send from any pack,
// like Telegram) but a user can only add stickers to their own pack (created
// automatically on first open). Media is uploaded to the existing 'avatars'
// storage bucket under a stickers/ prefix — no new bucket needed.
// Lets the user pick a start point and a clip length (max 10s) out of a
// longer video before it becomes a sticker, previewing the loop live, then
// re-encodes just that window to webm via canvas + MediaRecorder (silent —
// stickers autoplay muted anyway, so no audio track is captured).
const STICKER_MAX_SECONDS = 10
function VideoTrimModal({ file, onCancel, onConfirm }) {
  const videoRef = useRef(null)
  const [url] = useState(()=>URL.createObjectURL(file))
  const [duration, setDuration] = useState(0)
  const [start, setStart] = useState(0)
  const [length, setLength] = useState(STICKER_MAX_SECONDS)
  const [ready, setReady] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(()=>()=>URL.revokeObjectURL(url),[url])

  const onLoadedMeta = () => {
    const d = videoRef.current.duration || 0
    setDuration(d)
    setLength(Math.min(STICKER_MAX_SECONDS, d))
    setReady(true)
  }

  // keep the preview looping over just [start, start+length]
  useEffect(()=>{
    const v = videoRef.current
    if(!v || !ready) return
    v.currentTime = start
    v.play().catch(()=>{})
    const onTime = () => { if(v.currentTime >= start+length) v.currentTime = start }
    v.addEventListener('timeupdate', onTime)
    return ()=>v.removeEventListener('timeupdate', onTime)
  },[start,length,ready])

  const changeStart = (v) => {
    const s = Math.max(0, Math.min(v, duration-0.2))
    const maxLen = Math.min(STICKER_MAX_SECONDS, duration-s)
    setStart(s)
    setLength(prev=>Math.min(prev, maxLen))
  }
  const changeLength = (v) => {
    const maxLen = Math.min(STICKER_MAX_SECONDS, duration-start)
    setLength(Math.max(0.5, Math.min(v, maxLen)))
  }

  const confirm = async () => {
    setProcessing(true)
    setError(null)
    try {
      const blob = await trimVideoToBlob(videoRef.current, start, start+length)
      onConfirm(blob)
    } catch(e) {
      console.error('Video trim failed:', e)
      setError("Couldn't process that clip — try a shorter or smaller video.")
      setProcessing(false)
    }
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:700,background:'rgba(0,0,0,0.92)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20,gap:16}}>
      <video ref={videoRef} src={url} muted playsInline onLoadedMetadata={onLoadedMeta} style={{maxWidth:'100%',maxHeight:'55vh',borderRadius:16,background:'#000'}}/>
      {ready?(
        <div style={{width:'100%',maxWidth:420,display:'flex',flexDirection:'column',gap:14}}>
          <div>
            <div style={{color:'var(--text-secondary,#aaa)',fontSize:12,marginBottom:4,display:'flex',justifyContent:'space-between'}}>
              <span>Start</span><span>{start.toFixed(1)}s</span>
            </div>
            <input type="range" min={0} max={Math.max(0,duration-0.5)} step={0.1} value={start} onChange={e=>changeStart(parseFloat(e.target.value))} style={{width:'100%'}}/>
          </div>
          <div>
            <div style={{color:'var(--text-secondary,#aaa)',fontSize:12,marginBottom:4,display:'flex',justifyContent:'space-between'}}>
              <span>Length (max {STICKER_MAX_SECONDS}s)</span><span>{length.toFixed(1)}s</span>
            </div>
            <input type="range" min={0.5} max={Math.min(STICKER_MAX_SECONDS,duration)} step={0.1} value={length} onChange={e=>changeLength(parseFloat(e.target.value))} style={{width:'100%'}}/>
          </div>
          {error&&<p style={{color:'#F87171',fontSize:13}}>{error}</p>}
          <div style={{display:'flex',gap:10}}>
            <button onClick={onCancel} disabled={processing} style={{flex:1,padding:'12px',borderRadius:14,border:'none',background:'var(--bg-card,#222)',color:'var(--text-primary,#fff)',fontWeight:700,cursor:'pointer'}}>Cancel</button>
            <button onClick={confirm} disabled={processing} style={{flex:1,padding:'12px',borderRadius:14,border:'none',background:'linear-gradient(135deg,#5B9CF6,#845EF7)',color:'#fff',fontWeight:700,cursor:'pointer'}}>{processing?'Processing…':'Use this clip'}</button>
          </div>
        </div>
      ):<p style={{color:'#aaa',fontSize:13}}>Loading video…</p>}
    </div>
  )
}

function trimVideoToBlob(videoEl, start, end) {
  return new Promise((resolve, reject) => {
    const maxDim = 480
    const scale = Math.min(1, maxDim/Math.max(videoEl.videoWidth||maxDim, videoEl.videoHeight||maxDim))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round((videoEl.videoWidth||maxDim)*scale))
    canvas.height = Math.max(1, Math.round((videoEl.videoHeight||maxDim)*scale))
    const ctx = canvas.getContext('2d')
    const stream = canvas.captureStream(30)
    const mimeType = (typeof MediaRecorder!=='undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) ? 'video/webm;codecs=vp9' : 'video/webm'
    let recorder
    try { recorder = new MediaRecorder(stream, {mimeType}) } catch(e) { reject(e); return }
    const chunks = []
    recorder.ondataavailable = e => { if(e.data.size>0) chunks.push(e.data) }
    recorder.onerror = reject
    recorder.onstop = () => resolve(new Blob(chunks,{type:'video/webm'}))

    let rafId
    const stopAll = () => {
      videoEl.pause()
      if(rafId) cancelAnimationFrame(rafId)
      if(recorder.state!=='inactive') recorder.stop()
    }
    const draw = () => {
      if(videoEl.currentTime >= end || videoEl.paused || videoEl.ended) { stopAll(); return }
      ctx.drawImage(videoEl,0,0,canvas.width,canvas.height)
      rafId = requestAnimationFrame(draw)
    }
    videoEl.pause()
    videoEl.currentTime = start
    videoEl.onseeked = () => {
      videoEl.onseeked = null
      recorder.start()
      videoEl.play().then(()=>{ rafId = requestAnimationFrame(draw) }).catch(reject)
    }
    // safety timeout in case seeking/events never fire
    setTimeout(()=>{ if(recorder.state==='inactive'&&chunks.length===0) reject(new Error('Trim timed out')) }, (end-start)*1000 + 5000)
  })
}

// Save-step shown after picking (and, for video, trimming) a sticker: lets
// the user drop it into an existing pack of theirs, or type a custom new
// pack name to create on the spot. Defaults to their first/only pack so the
// common case (one pack) is just tap-to-save.
function StickerSaveModal({ packs, defaultPackId, onCancel, onConfirm, saving }) {
  const [choice, setChoice] = useState(defaultPackId||'__new__')
  const [newName, setNewName] = useState('')
  const confirm = () => {
    if(choice==='__new__'){
      if(!newName.trim()) return
      onConfirm({newPackName:newName.trim()})
    } else {
      onConfirm({packId:choice})
    }
  }
  return (
    <div style={{position:'fixed',inset:0,zIndex:701,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{width:'100%',maxWidth:420,background:'var(--bg-app)',borderRadius:'20px 20px 0 0',padding:'20px 20px calc(20px + env(safe-area-inset-bottom,0px))',display:'flex',flexDirection:'column',gap:12}}>
        <div style={{fontWeight:700,fontSize:15,color:'var(--text-primary)'}}>Save sticker to...</div>
        {packs.map(p=>(
          <label key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:12,background:choice===p.id?'rgba(91,156,246,0.15)':'var(--bg-card)',cursor:'pointer'}}>
            <input type="radio" name="pack" checked={choice===p.id} onChange={()=>setChoice(p.id)}/>
            <span style={{color:'var(--text-primary)',fontSize:14,fontWeight:600}}>{p.name}</span>
          </label>
        ))}
        <label style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:12,background:choice==='__new__'?'rgba(91,156,246,0.15)':'var(--bg-card)',cursor:'pointer'}}>
          <input type="radio" name="pack" checked={choice==='__new__'} onChange={()=>setChoice('__new__')}/>
          <input value={newName} onChange={e=>{setNewName(e.target.value);setChoice('__new__')}} placeholder="Custom pack name..." style={{flex:1,background:'none',border:'none',outline:'none',color:'var(--text-primary)',fontSize:14,fontWeight:600}}/>
        </label>
        <div style={{display:'flex',gap:10,marginTop:6}}>
          <button onClick={onCancel} disabled={saving} style={{flex:1,padding:'12px',borderRadius:14,border:'none',background:'var(--bg-card)',color:'var(--text-primary)',fontWeight:700,cursor:'pointer'}}>Cancel</button>
          <button onClick={confirm} disabled={saving||(choice==='__new__'&&!newName.trim())} style={{flex:1,padding:'12px',borderRadius:14,border:'none',background:'linear-gradient(135deg,#5B9CF6,#845EF7)',color:'#fff',fontWeight:700,cursor:'pointer'}}>{saving?'Saving…':'Save'}</button>
        </div>
      </div>
    </div>
  )
}

function StickerTray({ currentUser, supabase, onSelect, onClose }) {
  const [packs, setPacks] = useState([])
  const [activePack, setActivePack] = useState(null)
  const [stickers, setStickers] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [setupError, setSetupError] = useState(null)
  const [trimFile, setTrimFile] = useState(null)
  const [pendingUpload, setPendingUpload] = useState(null) // File ready to save, once pack is chosen
  const fileRef = useRef(null)

  const pickFile = (file) => {
    if(!file) return
    if(file.type.startsWith('video/')) setTrimFile(file) // adjust start/length first
    else setPendingUpload(file) // images go straight to the pack picker
  }

  useEffect(()=>{ loadPacks() },[])

  // Only the current user's own packs — stickers used to be browsable across
  // every user's packs, which cluttered the tray with one tab per person.
  // Now it's just your own pack(s), defaulting to a single "My Stickers".
  const loadPacks = async () => {
    setLoading(true)
    setSetupError(null)
    let {data:myPacks, error:myPackErr} = await supabase.from('sticker_packs').select('id,name,owner_id').eq('owner_id',currentUser.id).order('created_at',{ascending:true})
    if(myPackErr && isMissingColumnError(myPackErr)) {
      setSetupError("Stickers aren't set up yet — ask your dev to run supabase_migration_reply_and_stickers.sql in Supabase.")
      setLoading(false)
      return
    }
    if(!myPacks?.length){
      const {data:created, error:createErr} = await supabase.from('sticker_packs').insert({owner_id:currentUser.id,name:'My Stickers'}).select('id,name,owner_id').single()
      if(createErr) { console.error('Failed to create sticker pack:', createErr); setSetupError('Could not set up your sticker pack: '+createErr.message); setLoading(false); return }
      myPacks = [created]
    }
    setPacks(myPacks)
    setActivePack(prev=>prev||myPacks[0]?.id||null)
    setLoading(false)
  }

  useEffect(()=>{ if(activePack) loadStickers(activePack) },[activePack])
  const loadStickers = async (packId) => {
    const {data} = await supabase.from('stickers').select('id,media_url').eq('pack_id',packId).order('created_at',{ascending:true})
    setStickers(data||[])
  }

  const handleUpload = async (file, {packId, newPackName}) => {
    if(!file) return
    setUploading(true)
    let targetPack = packs.find(p=>p.id===packId)
    if(newPackName){
      const {data:created, error:createErr} = await supabase.from('sticker_packs').insert({owner_id:currentUser.id,name:newPackName}).select('id,name,owner_id').single()
      if(createErr){ alert('Could not create pack: '+createErr.message); setUploading(false); return }
      targetPack = created
      setPacks(prev=>[...prev,created])
    }
    if(!targetPack) { alert("Couldn't find that sticker pack — try reopening the sticker tray."); setUploading(false); return }
    const ext = file.name.split('.').pop()
    const path = 'stickers/'+currentUser.id+'_'+Date.now()+'.'+ext
    const {error} = await supabase.storage.from('avatars').upload(path,file,{upsert:false})
    if(error){ alert('Sticker upload failed: '+error.message); setUploading(false); return }
    const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
    const {data:inserted, error:insertErr} = await supabase.from('stickers').insert({pack_id:targetPack.id,media_url:urlData.publicUrl}).select('id,media_url').single()
    if(inserted){
      setActivePack(targetPack.id)
      setStickers(prev=>targetPack.id===activePack?[...prev,inserted]:prev)
    } else {
      alert('Could not save sticker: '+(insertErr?.message||'unknown error'))
    }
    setUploading(false)
    setPendingUpload(null)
  }

  return (
    <div style={{position:'fixed',left:0,right:0,bottom:0,maxWidth:600,margin:'0 auto',background:'var(--bg-app)',borderTop:'1px solid var(--border-color)',zIndex:160,height:280,display:'flex',flexDirection:'column',paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',overflowX:'auto',borderBottom:'1px solid var(--border-color)',flexShrink:0}}>
        {packs.length>1&&packs.map(p=>(
          <button key={p.id} onClick={()=>setActivePack(p.id)} style={{flexShrink:0,padding:'6px 12px',borderRadius:14,border:'none',background:activePack===p.id?'rgba(91,156,246,0.2)':'var(--bg-card)',color:activePack===p.id?'#5B9CF6':'var(--text-secondary)',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>{p.name}</button>
        ))}
        {packs.length<=1&&<span style={{color:'var(--text-secondary)',fontSize:13,fontWeight:700}}>{packs[0]?.name||'My Stickers'}</span>}
        <button onClick={onClose} style={{marginLeft:'auto',background:'none',border:'none',color:'var(--text-secondary)',cursor:'pointer',flexShrink:0,display:'flex'}}><X size={18}/></button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:12,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,alignContent:'start'}}>
        {setupError?(
          <p style={{gridColumn:'span 4',color:'#F87171',fontSize:13,lineHeight:1.5}}>{setupError}</p>
        ):(<>
        <input ref={fileRef} type="file" accept="image/*,video/webm,video/mp4,video/quicktime" onChange={e=>{pickFile(e.target.files[0]);e.target.value=''}} style={{display:'none'}}/>
        <button onClick={()=>fileRef.current?.click()} disabled={uploading} style={{aspectRatio:'1',borderRadius:12,border:'2px dashed var(--border-color-2)',background:'none',color:'var(--text-tertiary)',fontSize:26,cursor:'pointer'}}>{uploading?'⏳':'+'}</button>
        {stickers.map(s=>(
          <button key={s.id} onClick={()=>onSelect(s.media_url)} style={{aspectRatio:'1',borderRadius:12,border:'none',background:'var(--bg-card)',padding:4,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
            <StickerMedia url={s.media_url} size={'100%'}/>
          </button>
        ))}
        {!loading&&stickers.length===0&&<p style={{gridColumn:'span 3',color:'var(--text-quaternary)',fontSize:12,alignSelf:'center'}}>No stickers here yet — tap + to add your own image or short video clip.</p>}
        </>)}
      </div>
      {trimFile&&<VideoTrimModal file={trimFile}
        onCancel={()=>setTrimFile(null)}
        onConfirm={(blob)=>{
          setTrimFile(null)
          setPendingUpload(new File([blob],'sticker_'+Date.now()+'.webm',{type:'video/webm'}))
        }}
      />}
      {pendingUpload&&<StickerSaveModal packs={packs} defaultPackId={activePack} saving={uploading}
        onCancel={()=>setPendingUpload(null)}
        onConfirm={(dest)=>handleUpload(pendingUpload,dest)}
      />}
    </div>
  )
}

// ── USER PROFILE ───────────────────────────────────────────────────────────
function UserProfileView({ user, currentUser, supabase, onBack, onMessage, onOpenPost, sendPush }) {
  const [posts, setPosts] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [showBigAvatar, setShowBigAvatar] = useState(false)
  const [followerCount, setFollowerCount] = useState(null)
  const [followingCount, setFollowingCount] = useState(null)
  const [profile, setProfile] = useState(user)
  const [loading, setLoading] = useState(true)
  const color = profile?.avatar_color || getColor(profile?.id)

  useEffect(() => {
    if (!user) return
    // fetch full fresh profile so badges and counts are always accurate
    supabase.from('profiles').select('*').eq('id',user.id).single()
      .then(({data})=>{ if(data){ setProfile(data); setFollowerCount(data.followers_count||0); setFollowingCount(data.following_count||0) } })
    supabase.from('posts').select('*,likes(user_id),reposts(user_id),comments(id)').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50)
      .then(({data}) => { setPosts((data||[]).map(p=>({...p,likes_count:p.likes?.length||0,reposts_count:p.reposts?.length||0,comments_count:p.comments?.length||0,user_liked:p.likes?.some(l=>l.user_id===currentUser.id)}))); setLoading(false) })
    supabase.from('follows').select('id').eq('follower_id',currentUser.id).eq('following_id',user.id).maybeSingle()
      .then(({data}) => setIsFollowing(!!data))
  }, [user])

  const toggleFollow = async () => {
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id',currentUser.id).eq('following_id',user.id)
      setFollowerCount(c=>c-1)
    } else {
      await supabase.from('follows').insert({follower_id:currentUser.id,following_id:user.id})
      setFollowerCount(c=>c+1)
    }
    setIsFollowing(!isFollowing)
  }

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',fontSize:24,padding:0}}>‹</button>
        <span style={{fontWeight:700,fontSize:17}}>{profile?.display_name}</span>
      </div>
      <div style={{height:120,background:`linear-gradient(135deg,${color}44,#845EF733)`}}/>
      {showBigAvatar&&profile?.avatar_url&&<div onClick={()=>setShowBigAvatar(false)} style={{position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,0.9)',display:'flex',alignItems:'center',justifyContent:'center'}}><img src={profile.avatar_url} style={{width:'90vw',height:'90vw',maxWidth:400,maxHeight:400,borderRadius:'50%',objectFit:'cover'}} alt="" loading="lazy"/></div>}
      <div style={{padding:'0 16px',marginTop:-36,marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
        <div onClick={()=>setShowBigAvatar(true)} style={{cursor:'pointer'}}>
          <Avatar url={profile?.avatar_url} name={profile?.display_name} color={color} size={72}/>
        </div>
        <div style={{display:'flex',gap:8}}>
          {profile?.id !== currentUser.id && <>
            <div onClick={()=>onMessage(profile)} style={{background:'var(--bg-card-6)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:20,padding:'8px 16px',color:'var(--text-primary)',cursor:'pointer',fontWeight:600,fontSize:13,WebkitTapHighlightColor:'rgba(255,255,255,0.2)',userSelect:'none',display:'inline-flex',alignItems:'center',gap:6}}><MessageCircle size={15}/> Message</div>
            <button onClick={toggleFollow} style={{background:isFollowing?'var(--bg-card)':'linear-gradient(135deg,#5B9CF6,#845EF7)',border:isFollowing?'1px solid rgba(255,255,255,0.15)':'none',borderRadius:20,padding:'8px 16px',color:'var(--text-primary)',cursor:'pointer',fontWeight:700,fontSize:13}}>
              {isFollowing?'Following':'Follow'}
            </button>
          </>}
        </div>
      </div>
      <div style={{padding:'0 16px 16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><h2 style={{fontWeight:800,fontSize:20,margin:0}}>{profile?.display_name}</h2>{profile?.verified&&<span title='Flitters Verified Member' style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:20,height:20,borderRadius:'50%',background:'linear-gradient(135deg,#1a1a2e,#16213e)',border:'2px solid #C9A84C',boxShadow:'0 0 6px rgba(201,168,76,0.6)',flexShrink:0,cursor:'default'}}><img src="/flitters-logo-white.svg" alt="Verified" width={12} height={12} style={{objectFit:'contain',display:'block'}}/></span>}{profile?.is_authentic&&<span title='Authentic — Real & Verified Person' style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:20,height:20,flexShrink:0,cursor:'default'}}><svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><path d='M12 2L14.4 4.8L18 4L18.8 7.6L22 9.2L20.4 12.6L22 16L18.8 17.6L18 21.2L14.4 20.4L12 23.2L9.6 20.4L6 21.2L5.2 17.6L2 16L3.6 12.6L2 9.2L5.2 7.6L6 4L9.6 4.8Z' fill='#1877F2'/><polyline points='8,12.5 10.5,15 16,9' fill='none' stroke='#fff' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/></svg></span>}</div>
        </div>
        <p style={{color:'var(--text-secondary)',fontSize:14,marginBottom:8}}>@{profile?.username}</p>
        {profile?.bio&&<p style={{color:'var(--text-subtle)',fontSize:14,lineHeight:1.6,marginBottom:10}}>{profile.bio}</p>}
        {profile?.location&&<p style={{color:'var(--text-secondary)',fontSize:13,marginBottom:8,display:'flex',alignItems:'center',gap:4}}><MapPin size={13}/> {profile.location}</p>}
        <div style={{display:'flex',gap:20}}>
          <span style={{fontSize:14}}><strong>{followingCount===null?'–':followingCount}</strong> <span style={{color:'var(--text-secondary)'}}>Following</span></span>
          <span style={{fontSize:14}}><strong>{followerCount===null?'–':followerCount}</strong> <span style={{color:'var(--text-secondary)'}}>Followers</span></span>
        </div>
      </div>
      <div style={{borderTop:'1px solid var(--border-color)'}}>
        <p style={{padding:'14px 16px',fontWeight:700,fontSize:15}}>Posts</p>
        {loading&&<p style={{padding:'20px',textAlign:'center',color:'var(--text-quaternary)'}}>Loading...</p>}
        {!loading&&posts.length===0&&<p style={{padding:'20px',textAlign:'center',color:'var(--text-quaternary)'}}>No posts yet</p>}
        {posts.map(post=>(
          <PostCard key={post.id} post={{...post,author:profile}} currentUser={currentUser} supabase={supabase} onUserClick={()=>{}} onDelete={null} onOpenPost={onOpenPost} sendPush={sendPush}/>
        ))}
      </div>
    </div>
  )
}

// ── SETTINGS ───────────────────────────────────────────────────────────────
function VerifyForm({ currentUser, supabase, showMsg, saving, setSaving, inp }) {
  const [form, setForm] = useState({name:"",reason:"",idtype:"",txhash:"",paymethod:""})
  const [idFile, setIdFile] = useState(null)
  const [idPreview, setIdPreview] = useState('')
  const fileRef = useRef(null)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const pickFile = (file) => {
    if(!file) return
    setIdFile(file)
    setIdPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : '')
  }
  const submit = async() => {
    if(!form.name||!form.reason||!form.idtype||!form.txhash||!form.paymethod){showMsg("Please fill all fields",false);return}
    if(!idFile){showMsg("Please upload a photo of your ID document",false);return}
    setSaving(true)
    let idDocUrl = null
    const ext = idFile.name.split('.').pop()
    const path = 'verification-ids/'+currentUser.id+'_'+Date.now()+'.'+ext
    const {error:uploadErr} = await supabase.storage.from('avatars').upload(path,idFile,{upsert:false})
    if(uploadErr){ showMsg("ID upload failed: "+uploadErr.message,false); setSaving(false); return }
    const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
    idDocUrl = urlData.publicUrl
    const {error} = await supabase.from("verification_applications").insert({user_id:currentUser.id,full_name:form.name,reason:form.reason,id_type:form.idtype,tx_hash:form.txhash,payment_method:form.paymethod,id_document_url:idDocUrl})
    if(error) showMsg(error.message,false)
    else showMsg("Application submitted! We will review within 48 hours.")
    setSaving(false)
  }
  return(<div>
    <label style={{color:"#888",fontSize:13,display:"block",marginBottom:6}}>Full Name</label>
    <input value={form.name} onChange={e=>set("name",e.target.value)} style={{...inp}} placeholder="Your legal name"/>
    <label style={{color:"#888",fontSize:13,display:"block",marginBottom:6}}>ID Type</label>
    <select value={form.idtype} onChange={e=>set("idtype",e.target.value)} style={{...inp,background:"rgba(255,255,255,0.07)"}}>
      <option value="">Select ID type</option>
      <option>National ID</option><option>Passport</option><option>Driver License</option>
    </select>
    <label style={{color:"#888",fontSize:13,display:"block",marginBottom:6}}>ID Document Photo</label>
    <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={e=>pickFile(e.target.files?.[0])}/>
    <div onClick={()=>fileRef.current?.click()} style={{...inp,height:'auto',minHeight:56,display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'10px 14px'}}>
      {idPreview
        ? <img src={idPreview} alt="ID preview" style={{width:44,height:44,objectFit:'cover',borderRadius:8}}/>
        : <Upload size={20} color="#888"/>}
      <span style={{color:idFile?'var(--text-primary)':'#888',fontSize:13}}>{idFile?idFile.name:'Tap to upload a clear photo of your ID'}</span>
    </div>
    <p style={{color:'var(--text-quaternary)',fontSize:11,marginTop:-8,marginBottom:14}}>Used only to confirm your identity for verification. Not shown publicly.</p>
    <label style={{color:"#888",fontSize:13,display:"block",marginBottom:6}}>Why do you want verification?</label>
    <textarea value={form.reason} onChange={e=>set("reason",e.target.value)} rows={3} style={{...inp,resize:"none"}} placeholder="Describe yourself and why you deserve verification"/>
    <label style={{color:"#888",fontSize:13,display:"block",marginBottom:6}}>Transaction Hash (TX ID)</label>
    <input value={form.txhash} onChange={e=>set("txhash",e.target.value)} style={{...inp}} placeholder="Paste your payment transaction hash"/>
    <label style={{color:"#888",fontSize:13,display:"block",marginBottom:6}}>Payment Method Used</label>
    <select value={form.paymethod} onChange={e=>set("paymethod",e.target.value)} style={{...inp,background:"rgba(255,255,255,0.07)"}}>
      <option value="">Select payment method</option>
      <option>USDT TRC-20</option><option>Bitcoin BTC</option>
    </select>
    <button onClick={submit} disabled={saving} style={{width:"100%",background:"linear-gradient(135deg,#FFD700,#FFA500)",border:"none",borderRadius:12,padding:"14px",color:"#000",fontWeight:800,fontSize:15,cursor:"pointer",marginTop:8}}>{saving?"Submitting...":"Submit Application"}</button>
  </div>)
}

function ThemeToggleRow() {
  const { theme, setTheme, isManual, useSystemTheme } = useTheme()
  const opt = (id, icon, label) => {
    const active = id === 'system' ? !isManual : (isManual && theme === id)
    return (
      <button
        onClick={() => id === 'system' ? useSystemTheme() : setTheme(id)}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
          border: active ? '1.5px solid #A855F7' : '1px solid var(--border-color-2)',
          background: active ? 'rgba(168,85,247,0.1)' : 'var(--bg-card)',
          color: active ? '#A855F7' : 'var(--text-tertiary)',
        }}
      >
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
      </button>
    )
  }
  return (
    <div style={{ padding: '4px 20px 18px', borderBottom: '1px solid var(--border-color)', marginBottom: 4 }}>
      <div style={{ color: 'var(--text-tertiary)', fontSize: 13, marginBottom: 10, fontWeight: 600 }}>Appearance</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {opt('light', '☀️', 'Light')}
        {opt('dark', '🌙', 'Dark')}
        {opt('system', <Settings size={18}/>, 'System')}
      </div>
    </div>
  )
}

function SettingsView({ currentUser, supabase, onBack, onSignOut, onAvatarUpdate }) {
  const [section, setSection] = useState('main')
  const [displayName, setDisplayName] = useState(currentUser?.display_name||'')
  const [bio, setBio] = useState(currentUser?.bio||'')
  const [location, setLocation] = useState(currentUser?.location||'')
  const [language, setLanguage] = useState('English')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({text:'',ok:true})
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const [permState, setPermState] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const [testMsg, setTestMsg] = useState('')

  const showMsg = (text, ok=true) => { setMsg({text,ok}); setTimeout(()=>setMsg({text:'',ok:true}),3000) }
  const inp = {width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none',fontFamily:'sans-serif',boxSizing:'border-box',marginBottom:12}
  const LANGUAGES = ['English','French','Spanish','Arabic','Portuguese','Swahili','Hindi','Chinese','German','Japanese','Russian','Italian']

  const uploadAvatar = async (file) => {
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${currentUser.id}.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {upsert:true})
    if (upErr) { showMsg('Upload failed: '+upErr.message, false); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    // Cache-bust: the storage path (and therefore the base public URL) stays
    // identical across re-uploads, so browsers cache the old image against
    // that same URL and never re-fetch the new one. Appending a changing
    // query param forces a fresh fetch every time.
    const url = urlData.publicUrl + '?v=' + Date.now()
    await supabase.from('profiles').update({avatar_url:url}).eq('id',currentUser.id)
    currentUser.avatar_url = url
    onAvatarUpdate(url)
    showMsg('Profile picture updated!')
    setUploading(false)
  }

  const saveProfile = async () => {
    setSaving(true)
    const hasEmoji = /\p{Emoji}/u.test(displayName);if(hasEmoji){showMsg('Emojis are not allowed in display names',false);setSaving(false);return}
    const {error} = await supabase.from('profiles').update({display_name:displayName,bio,location}).eq('id',currentUser.id)
    if (error) showMsg(error.message, false)
    else { currentUser.display_name=displayName; currentUser.bio=bio; currentUser.location=location; showMsg('Profile saved!') }
    setSaving(false)
  }

  const changePassword = async () => {
    if (newPass!==confirmPass) { showMsg('Passwords do not match',false); return }
    if (newPass.length<6) { showMsg('Minimum 6 characters',false); return }
    setSaving(true)
    const {error} = await supabase.auth.updateUser({password:newPass})
    if (error) showMsg(error.message,false)
    else { showMsg('Password changed!'); setNewPass(''); setConfirmPass('') }
    setSaving(false)
  }

  const MsgBox = () => msg.text ? <div style={{padding:'10px 14px',borderRadius:10,background:msg.ok?'rgba(0,201,167,0.1)':'rgba(255,71,87,0.1)',border:`1px solid ${msg.ok?'rgba(0,201,167,0.2)':'rgba(255,71,87,0.2)'}`,color:msg.ok?'#00C9A7':'#FF4757',fontSize:13,marginBottom:16}}>{msg.text}</div> : null

  const Header = ({title}) => (
    <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
      <button onClick={()=>setSection('main')} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',fontSize:24}}>‹</button>
      <span style={{fontWeight:700,fontSize:17}}>{title}</span>
    </div>
  )

  if (section==='avatar') return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <Header title="Profile Picture"/>
      <div style={{padding:'30px 20px',display:'flex',flexDirection:'column',alignItems:'center',gap:20}}>
        <MsgBox/>
        <Avatar url={currentUser?.avatar_url} name={currentUser?.display_name} color={currentUser?.avatar_color||'#5B9CF6'} size={100}/>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>uploadAvatar(e.target.files[0])}/>
        <button onClick={()=>fileRef.current?.click()} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:12,padding:'14px 32px',color:'var(--text-primary)',fontWeight:700,fontSize:15,cursor:'pointer',width:'100%'}}>
          {uploading?'Uploading...':'Choose Photo'}
        </button>
        <p style={{color:'var(--text-secondary)',fontSize:13,textAlign:'center'}}>Tap to select a photo from your device</p>
      </div>
    </div>
  )

  if (section==='profile') return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <Header title="Edit Profile"/>
      <div style={{padding:'20px 16px'}}>
        <MsgBox/>
        <label style={{color:'var(--text-tertiary)',fontSize:13,display:'block',marginBottom:6}}>Display Name</label>
        <input value={displayName} onChange={e=>setDisplayName(e.target.value)} style={{...inp}} placeholder="Your name"/>
        <label style={{color:'var(--text-tertiary)',fontSize:13,display:'block',marginBottom:6}}>Bio</label>
        <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={3} style={{...inp,resize:'none'}} placeholder="Tell the world about yourself"/>
        <button onClick={saveProfile} style={{width:'100%',background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:12,padding:'14px',color:'var(--text-primary)',fontWeight:700,fontSize:15,cursor:'pointer'}}>
          {saving?'Saving...':'Save Changes'}
        </button>
      </div>
    </div>
  )

  if (section==='password') return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <Header title="Change Password"/>
      <div style={{padding:'20px 16px'}}>
        <MsgBox/>
        <label style={{color:'var(--text-tertiary)',fontSize:13,display:'block',marginBottom:6}}>New Password</label>
        <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} style={{...inp}} placeholder="New password"/>
        <label style={{color:'var(--text-tertiary)',fontSize:13,display:'block',marginBottom:6}}>Confirm Password</label>
        <input type="password" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} style={{...inp}} placeholder="Confirm new password"/>
        <button onClick={changePassword} style={{width:'100%',background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:12,padding:'14px',color:'var(--text-primary)',fontWeight:700,fontSize:15,cursor:'pointer'}}>
          {saving?'Saving...':'Update Password'}
        </button>
      </div>
    </div>
  )

  if (section==='location') return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <Header title="Location"/>
      <div style={{padding:'20px 16px'}}>
        <MsgBox/>
        <label style={{color:'var(--text-tertiary)',fontSize:13,display:'block',marginBottom:6}}>Your Country / City</label>
        <input value={location} onChange={e=>setLocation(e.target.value)} style={{...inp}} placeholder="e.g. Lagos, Nigeria"/>
        <button onClick={async()=>{setSaving(true);const {error}=await supabase.from('profiles').update({location}).eq('id',currentUser.id);if(error)showMsg(error.message,false);else{currentUser.location=location;showMsg('Saved!')};setSaving(false)}} style={{width:'100%',background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:12,padding:'14px',color:'var(--text-primary)',fontWeight:700,fontSize:15,cursor:'pointer'}}>
          {saving?'Saving...':'Save Location'}
        </button>
      </div>
    </div>
  )

  if (section==='language') return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <Header title="Language"/>
      <div style={{padding:'8px 0'}}>
        {LANGUAGES.map(lang=>(
          <div key={lang} onClick={()=>setLanguage(lang)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',cursor:'pointer',borderBottom:'1px solid var(--bg-card-4)',background:language===lang?'rgba(91,156,246,0.08)':'transparent'}}>
            <span style={{fontSize:15}}>{lang}</span>
            {language===lang&&<span style={{color:'#5B9CF6',display:'flex'}}><Check size={18}/></span>}
          </div>
        ))}
      </div>
    </div>
  )


  if(section==='verify') return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <Header title="Get Verified"/>
      <div style={{padding:'20px 16px'}}>
        <MsgBox/>
        <div style={{background:'linear-gradient(135deg,rgba(255,215,0,0.08),rgba(255,165,0,0.08))',border:'1px solid rgba(255,215,0,0.25)',borderRadius:16,padding:'20px',marginBottom:24,textAlign:'center'}}>
          <div style={{marginBottom:8,display:'flex',justifyContent:'center',color:'#5B9CF6'}}><Award size={48}/></div>
          <h2 style={{fontWeight:800,fontSize:20,color:'#FFD700',marginBottom:8}}>Flitters Verified Badge</h2>
          <p style={{color:'var(--text-subtle)',fontSize:14,lineHeight:1.6}}>Get a gold badge on your profile and all your posts.</p>
          <p style={{color:'#FFD700',fontWeight:700,fontSize:18,marginTop:12}}>One-time fee: $5 USD</p>
        </div>
        <h3 style={{fontWeight:700,fontSize:15,marginBottom:12}}>Pay to one of these:</h3>
        <div style={{background:'var(--bg-card-4)',borderRadius:12,padding:'14px',marginBottom:10}}>
          <p style={{fontWeight:700,marginBottom:6}}>USDT TRC-20</p>
          <p style={{color:'var(--text-tertiary)',fontSize:11,wordBreak:'break-all',fontFamily:'monospace'}}>TABFK9Z3yC4kKtVzqEwqoyAfwSySkzJcHL</p>
        </div>
        <div style={{background:'var(--bg-card-4)',borderRadius:12,padding:'14px',marginBottom:20}}>
          <p style={{fontWeight:700,marginBottom:6}}>Bitcoin BTC</p>
          <p style={{color:'var(--text-tertiary)',fontSize:11,wordBreak:'break-all',fontFamily:'monospace'}}>bc1ql7qzefrh2czl29krzzsnwkr6dvnp2few2h80s7</p>
        </div>
        <h3 style={{fontWeight:700,fontSize:15,marginBottom:12}}>Application Form</h3>
        <VerifyForm currentUser={currentUser} supabase={supabase} showMsg={showMsg} saving={saving} setSaving={setSaving} inp={inp}/>
      </div>
    </div>
  )
  if(section==='notiftest') {
    const runTest = async () => {
      setTestMsg('')
      if (typeof Notification === 'undefined') { setTestMsg('This browser/app does not support the Notification API at all.'); return }
      let perm = Notification.permission
      if (perm === 'default') { perm = await Notification.requestPermission(); setPermState(perm) }
      if (perm !== 'granted') { setTestMsg('Permission is "'+perm+'" — notifications are blocked. Check app/site notification settings.'); return }
      try {
        if('serviceWorker' in navigator){
          const reg = await navigator.serviceWorker.ready
          await reg.showNotification('Flitters Test', { body: 'If you see this, notifications work in this browser/app!', icon: '/icon-192.png' })
        } else {
          new Notification('Flitters Test', { body: 'If you see this, notifications work in this browser/app!', icon: '/icon-192.png' })
        }
        setTestMsg('Test notification sent — check if it appeared.')
      } catch(e) {
        setTestMsg('showNotification() threw an error: ' + e.message)
      }
    }
    return (
      <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
        <Header title="Notifications"/>
        <div style={{padding:'20px 16px'}}>
          <div style={{background:'var(--bg-card-5)',border:'1px solid var(--bg-card-6)',borderRadius:14,padding:16,marginBottom:16,fontSize:14,color:'var(--text-subtle)'}}>
            <div>Browser permission status: <strong style={{color: permState==='granted'?'#00C9A7':'#FF4757'}}>{permState}</strong></div>
          </div>
          <button onClick={runTest} style={{width:'100%',background:'linear-gradient(135deg,#A855F7,#06B6D4)',border:'none',borderRadius:12,padding:'14px',color:'var(--text-primary)',fontWeight:700,fontSize:15,cursor:'pointer',marginBottom:12}}>
            Send Test Notification
          </button>
          {testMsg && <div style={{padding:'12px 14px',borderRadius:10,background:'var(--bg-card-4)',color:'var(--text-subtle)',fontSize:13,lineHeight:1.5}}>{testMsg}</div>}
          <p style={{color:'var(--text-secondary)',fontSize:12,marginTop:20,lineHeight:1.6}}>This sends a notification directly from this screen, bypassing chat/likes/comments entirely — useful for checking whether notifications work in this browser or app at all.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',fontSize:24}}>‹</button>
        <span style={{fontWeight:700,fontSize:17}}>Settings</span>
      </div>
      <div style={{padding:'12px 0'}}>
        <ThemeToggleRow/>
        {[{icon:<ImageIcon size={18}/>,label:'Profile Picture',id:'avatar'},{icon:<User size={18}/>,label:'Edit Profile',id:'profile'},{icon:<Lock size={18}/>,label:'Change Password',id:'password'},{icon:<MapPin size={18}/>,label:'Location',id:'location'},{icon:<Globe size={18}/>,label:'Language',id:'language'},{icon:<Award size={18}/>,label:'Get Verified Badge',id:'verify'},{icon:<Bell size={18}/>,label:'Notifications',id:'notiftest'}].map(s=>(
          <button key={s.id} onClick={()=>setSection(s.id)} style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',background:'none',border:'none',width:'100%',cursor:'pointer',color:'var(--text-primary)',borderBottom:'1px solid var(--bg-card-4)',textAlign:'left',fontSize:15}}>
            <span style={{fontSize:22}}>{s.icon}</span><span style={{flex:1,fontWeight:500}}>{s.label}</span><span style={{color:'var(--text-quaternary)'}}>›</span>
          </button>
        ))}
        <button onClick={onSignOut} style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',background:'none',border:'none',width:'100%',cursor:'pointer',color:'#FF4757',borderTop:'1px solid var(--border-color)',marginTop:8,fontSize:15}}>
          <LogOut size={20}/><span style={{fontWeight:600}}>Sign Out</span>
        </button>
        <div style={{padding:'16px 20px',borderTop:'1px solid var(--bg-card-5)',textAlign:'center'}}>
          <a href="/privacy" style={{color:'var(--text-faint)',fontSize:12,textDecoration:'none'}}>Privacy Policy</a>
          <span style={{color:'#222',fontSize:12}}> · </span>
          <span style={{color:'#222',fontSize:12}}>© 2025 Flitters · fka Sphere</span>
        </div>
      </div>
    </div>
  )
}

// ── MY PROFILE ─────────────────────────────────────────────────────────────
function MyProfileView({ currentUser, supabase, onSettings, onBack, avatarUrl }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [followerCount, setFollowerCount] = useState(null)
  const [followingCount, setFollowingCount] = useState(null)
  const color = currentUser?.avatar_color||'#5B9CF6'

  useEffect(() => {
    supabase.from('posts').select('*,likes(user_id),reposts(user_id),comments(id)').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(50)
      .then(({data})=>{
        setPosts((data||[]).map(p=>({...p,likes_count:p.likes?.length||0,reposts_count:p.reposts?.length||0,comments_count:p.comments?.length||0})))
        setLoading(false)
      })
    supabase.from('profiles').select('followers_count,following_count').eq('id',currentUser.id).single()
      .then(({data})=>{ if(data){ setFollowerCount(data.followers_count||0); setFollowingCount(data.following_count||0) } })
  },[])

  const deletePost = async (postId) => {
    await supabase.from('posts').delete().eq('id',postId).eq('user_id',currentUser.id)
    setPosts(prev=>prev.filter(p=>p.id!==postId))
  }

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',fontSize:24}}>‹</button>
        <span style={{fontWeight:700,fontSize:17}}>My Profile</span>
        <button onClick={onSettings} style={{background:'none',border:'none',color:'var(--text-subtle)',cursor:'pointer',display:'flex'}}><Settings size={22}/></button>
      </div>
      <div style={{height:110,background:`linear-gradient(135deg,${color}44,#845EF733)`}}/>
      <div style={{padding:'0 16px',marginTop:-36,marginBottom:16}}>
        <Avatar url={avatarUrl||currentUser?.avatar_url} name={currentUser?.display_name} color={color} size={72}/>
      </div>
      <div style={{padding:'0 16px 20px'}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><h2 style={{fontWeight:800,fontSize:22,margin:0}}>{currentUser?.display_name}</h2>{currentUser?.verified&&<span title='Flitters Verified Member' style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:20,height:20,borderRadius:'50%',background:'linear-gradient(135deg,#1a1a2e,#16213e)',border:'2px solid #C9A84C',boxShadow:'0 0 6px rgba(201,168,76,0.6)',flexShrink:0,cursor:'default'}}><img src="/flitters-logo-white.svg" alt="Verified" width={12} height={12} style={{objectFit:'contain',display:'block'}}/></span>}{currentUser?.is_authentic&&<span title='Authentic — Real & Verified Person' style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:20,height:20,flexShrink:0,cursor:'default'}}><svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><path d='M12 2L14.4 4.8L18 4L18.8 7.6L22 9.2L20.4 12.6L22 16L18.8 17.6L18 21.2L14.4 20.4L12 23.2L9.6 20.4L6 21.2L5.2 17.6L2 16L3.6 12.6L2 9.2L5.2 7.6L6 4L9.6 4.8Z' fill='#1877F2'/><polyline points='8,12.5 10.5,15 16,9' fill='none' stroke='#fff' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/></svg></span>}</div>
        <p style={{color:'var(--text-secondary)',fontSize:14,marginBottom:8}}>@{currentUser?.username}</p>
        {currentUser?.bio&&<p style={{color:'var(--text-subtle)',fontSize:14,lineHeight:1.6,marginBottom:10}}>{currentUser.bio}</p>}
        {currentUser?.location&&<p style={{color:'var(--text-secondary)',fontSize:13,marginBottom:10,display:'flex',alignItems:'center',gap:4}}><MapPin size={13}/> {currentUser.location}</p>}
        <div style={{display:'flex',gap:20,marginBottom:16}}>
          <span style={{fontSize:14}}><strong>{followingCount===null?'–':followingCount}</strong> <span style={{color:'var(--text-secondary)'}}>Following</span></span>
          <span style={{fontSize:14}}><strong>{followerCount===null?'–':followerCount}</strong> <span style={{color:'var(--text-secondary)'}}>Followers</span></span>
        </div>
      </div>
      <div style={{borderTop:'1px solid var(--border-color)'}}>
        <p style={{padding:'14px 16px',fontWeight:700,fontSize:15,borderBottom:'1px solid var(--border-color)'}}>My Posts</p>
        {loading&&<p style={{padding:'20px',textAlign:'center',color:'var(--text-quaternary)'}}>Loading...</p>}
        {!loading&&posts.length===0&&<div style={{padding:'40px 20px',textAlign:'center'}}><div style={{display:'flex',justifyContent:'center',color:'var(--text-quaternary)'}}><FileText size={40}/></div><p style={{color:'var(--text-secondary)',marginTop:8}}>No posts yet</p></div>}
        {posts.map(post=>(
          <div key={post.id} style={{padding:'14px 16px',borderBottom:'1px solid var(--border-color)'}}>
            <p style={{color:'var(--text-primary)',fontSize:15,lineHeight:1.6,marginBottom:10}}>{post.content}</p>
            <div style={{display:'flex',gap:16,color:'var(--text-secondary)',fontSize:13,alignItems:'center'}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}><MessageCircle size={14}/> {post.comments_count}</span>
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}><Heart size={14}/> {post.likes_count}</span>
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}><Repeat2 size={14}/> {post.reposts_count}</span>
              <span style={{marginLeft:'auto'}}>{timeAgo(post.created_at)}</span>
              <button onClick={()=>{ if(confirm('Delete this post?')) deletePost(post.id) }} style={{background:'rgba(255,71,87,0.1)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:8,padding:'4px 10px',color:'#FF4757',cursor:'pointer',fontSize:12,fontWeight:600}}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── POST CARD ──────────────────────────────────────────────────────────────
function ReelPreviewCard({ supabase, onOpen }) {
  const [reel, setReel] = useState(null)
  useEffect(()=>{
    let cancelled = false
    supabase.from('reels').select('id,video_url,caption,author:profiles(display_name,username,avatar_url,avatar_color)').order('created_at',{ascending:false}).limit(20).then(({data})=>{
      if(cancelled||!data?.length) return
      setReel(data[Math.floor(Math.random()*data.length)])
    })
    return ()=>{cancelled=true}
  },[])
  if(!reel) return null
  return (
    <div onClick={()=>onOpen(reel.id)} style={{margin:'10px 16px',borderRadius:18,overflow:'hidden',position:'relative',cursor:'pointer',height:200,background:'#000'}}>
      <video src={reel.video_url} muted playsInline preload="metadata" style={{width:'100%',height:'100%',objectFit:'cover',opacity:0.85}}/>
      <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 50%)'}}/>
      <div style={{position:'absolute',top:12,left:12,display:'flex',alignItems:'center',gap:6,background:'rgba(0,0,0,0.5)',borderRadius:14,padding:'4px 10px'}}>
        <Clapperboard size={13}/>
        <span style={{color:'var(--text-primary)',fontSize:12,fontWeight:700}}>Reels</span>
      </div>
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{width:56,height:56,borderRadius:'50%',background:'var(--bg-card-8)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>▶️</div>
      </div>
      <div style={{position:'absolute',bottom:10,left:12,right:12,display:'flex',alignItems:'center',gap:8}}>
        <Avatar url={reel.author?.avatar_url} name={reel.author?.display_name} color={reel.author?.avatar_color||'#5B9CF6'} size={26}/>
        <span style={{color:'var(--text-primary)',fontSize:13,fontWeight:600,textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>{reel.author?.display_name}</span>
      </div>
    </div>
  )
}

function AdCard({ ad }) {
  const openLink = () => {
    if(!ad.link_url) return
    const url = ad.link_url.startsWith('http')?ad.link_url:'https://'+ad.link_url
    window.open(url,'_blank')
  }
  return (
    <div onClick={openLink} style={{padding:'14px 16px',borderBottom:'1px solid var(--border-color)',cursor:ad.link_url?'pointer':'default'}}>
      <div style={{display:'flex',gap:12}}>
        <div style={{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,#F7B731,#FF6B35)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:18,color:'var(--text-primary)',flexShrink:0}}>{ad.advertiser_name?.[0]||'A'}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:2}}>
            <span style={{color:'var(--text-primary)',fontWeight:700,fontSize:15}}>{ad.advertiser_name}</span>
            <span style={{background:'rgba(247,183,49,0.15)',border:'1px solid rgba(247,183,49,0.3)',borderRadius:6,padding:'1px 6px',fontSize:10,color:'#F7B731',fontWeight:700}}>Sponsored</span>
          </div>
          {ad.content&&<p style={{color:'var(--text-primary)',fontSize:15,lineHeight:1.6,marginBottom:10}}>{ad.content}</p>}
          {ad.image_url&&<img src={ad.image_url} style={{width:'100%',borderRadius:12,maxHeight:300,objectFit:'cover'}} alt="ad" loading="lazy"/>}
          {ad.link_url&&<div style={{marginTop:10,background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:10,padding:'8px 14px',display:'inline-flex',alignItems:'center',gap:4,color:'#5B9CF6',fontSize:13,fontWeight:700}}>Learn More <ArrowRight size={14}/></div>}
        </div>
      </div>
    </div>
  )
}


function CommentThread({ comment, depth, onUserClick, onReply }) {
  const hasChildren = comment.children && comment.children.length > 0
  return (
    <div style={{position:'relative',marginLeft:depth>0?18:0}}>
      {depth>0&&<div style={{position:'absolute',left:-14,top:0,bottom:hasChildren?14:20,width:2,background:'var(--border-color-2)'}}/>}
      {depth>0&&<div style={{position:'absolute',left:-14,top:20,width:14,height:2,background:'var(--border-color-2)'}}/>}
      <div style={{display:'flex',gap:10,marginBottom:8,alignItems:'flex-start'}}>
        <Avatar url={comment.author?.avatar_url} name={comment.author?.display_name} color={comment.author?.avatar_color||'#5B9CF6'} size={depth>0?26:32}/>
        <div style={{flex:1,background:'var(--bg-card-4)',borderRadius:12,padding:'8px 12px',minWidth:0}}>
          <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
            <span onClick={()=>onUserClick(comment.author)} style={{fontWeight:700,fontSize:13,color:'var(--text-primary)',cursor:'pointer'}}>{comment.author?.display_name}</span>
            <span style={{color:'var(--text-secondary)',fontSize:11}}>{timeAgo(comment.created_at)}</span>
          </div>
          {comment.content&&<p style={{color:'var(--text-primary)',fontSize:14,lineHeight:1.5,margin:0,wordBreak:'break-word'}}>{comment.content}</p>}
          {comment.image_url&&<img src={comment.image_url} style={{maxWidth:'100%',maxHeight:220,borderRadius:10,marginTop:6,display:'block'}} alt="" loading="lazy"/>}
          <span onClick={()=>onReply(comment)} style={{display:'inline-flex',alignItems:'center',gap:4,marginTop:6,color:'var(--text-tertiary)',fontSize:12,fontWeight:600,cursor:'pointer'}}><CornerUpLeft size={12}/> Reply</span>
        </div>
      </div>
      {hasChildren&&(
        <div>
          {comment.children.map(child=>(
            <CommentThread key={child.id} comment={child} depth={depth+1} onUserClick={onUserClick} onReply={onReply}/>
          ))}
        </div>
      )}
    </div>
  )
}

function postCardPropsEqual(prev, next) {
  return prev.post === next.post &&
    prev.currentUser?.id === next.currentUser?.id &&
    prev.autoExpandComments === next.autoExpandComments
}
const PostCard = memo(function PostCard({ post, currentUser, supabase, onUserClick, onDelete, onOpenPost, autoExpandComments, sendPush }) {
  const [liked, setLiked] = useState(post.user_liked||false)
  const [reposted, setReposted] = useState(post.user_reposted||false)
  const [likes, setLikes] = useState(post.likes_count||0)
  const [reposts, setReposts] = useState(post.reposts_count||0)
  const [comments, setComments] = useState(post.comments_count||0)
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [commentsList, setCommentsList] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null) // comment object being replied to, or null = replying to post
  const [replyImage, setReplyImage] = useState(null)
  const [replyImagePreview, setReplyImagePreview] = useState('')
  const [uploadingReply, setUploadingReply] = useState(false)
  const replyImageRef = useRef(null)
  const [showShareMenu, setShowShareMenu] = useState(false)

  const shareUrl = (typeof window!=='undefined'?window.location.origin:'https://flitters.app')+'/p/'+post.id
  const shareText = (post.content||(post.author?.display_name||'Someone')+' shared a post on Flitters').slice(0,100)
  const handleShare = async () => {
    if(navigator.share){
      try { await navigator.share({title:'Flitters', text:shareText, url:shareUrl}) } catch(e){ /* user cancelled — no-op */ }
    } else {
      setShowShareMenu(true)
    }
  }
  const copyShareLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl) } catch(e){}
    setShowShareMenu(false)
  }

  const loadComments = async(forceOpen) => {
    if(showComments && !forceOpen){setShowComments(false);return}
    setLoadingComments(true)
    const {data} = await supabase.from('comments').select('*,author:profiles(id,display_name,username,avatar_color,avatar_url)').eq('post_id',post.id).order('created_at',{ascending:true})
    setCommentsList(data||[])
    setLoadingComments(false)
    setShowComments(true)
  }

  useEffect(() => {
    if (autoExpandComments) loadComments(true)
  }, [autoExpandComments])

  const a = post.author||{}
  const color = a.avatar_color||getColor(a.id)
  const isOwn = a.id === currentUser.id

  const likeInFlight = useRef(false)
  const repostInFlight = useRef(false)
  const replyInFlight = useRef(false)

  const toggleLike = async () => {
    if (likeInFlight.current) return
    likeInFlight.current = true
    try {
      const next = !liked
      setLiked(next); setLikes(l=>next?l+1:l-1)
      if (next) {
        const {error} = await supabase.from('likes').insert({post_id:post.id,user_id:currentUser.id})
        if (error) { setLiked(!next); setLikes(l=>next?l-1:l+1) }
        else if (post.user_id !== currentUser.id) {
          await supabase.from('notifications').insert({user_id:post.user_id,actor_id:currentUser.id,type:'like',post_id:post.id})
          sendPush&&sendPush(post.user_id, 'New Like', (currentUser.display_name||'Someone')+' liked your post')
        }
      } else {
        await supabase.from('likes').delete().eq('post_id',post.id).eq('user_id',currentUser.id)
      }
    } finally { likeInFlight.current = false }
  }

  const toggleRepost = async () => {
    if (repostInFlight.current) return
    repostInFlight.current = true
    try {
      const next = !reposted
      setReposted(next); setReposts(r=>next?r+1:r-1)
      if (next) {
        const {error} = await supabase.from('reposts').insert({post_id:post.id,user_id:currentUser.id})
        if (error) { setReposted(!next); setReposts(r=>next?r-1:r+1) }
        else if (post.user_id !== currentUser.id) await supabase.from('notifications').insert({user_id:post.user_id,actor_id:currentUser.id,type:'repost',post_id:post.id})
      } else {
        await supabase.from('reposts').delete().eq('post_id',post.id).eq('user_id',currentUser.id)
      }
    } finally { repostInFlight.current = false }
  }

  const submitReply = async () => {
    if (replyInFlight.current) return
    if (!replyText.trim() && !replyImage) return
    replyInFlight.current = true
    setUploadingReply(true)
    try {
      let imageUrl = null
      if (replyImage) {
        const ext = replyImage.name.split('.').pop()
        const path = `comments/${currentUser.id}_${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, replyImage, {upsert:false, contentType: replyImage.type})
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
          imageUrl = urlData.publicUrl
        }
      }
      const { error } = await supabase.from('comments').insert({
        post_id: post.id,
        user_id: currentUser.id,
        content: replyText.trim(),
        reply_to_comment_id: replyingTo?.id || null,
        image_url: imageUrl
      })
      if (!error) {
        setComments(c=>c+1)
        setReplyText('')
        setReplyImage(null)
        setReplyImagePreview('')
        setShowReply(false)
        setReplyingTo(null)
        loadComments(true) // refresh thread so the new reply appears immediately
        if (post.user_id !== currentUser.id) {
          await supabase.from('notifications').insert({user_id:post.user_id,actor_id:currentUser.id,type:'comment',post_id:post.id})
          sendPush&&sendPush(post.user_id, 'New Comment', (currentUser.display_name||'Someone')+' commented on your post')
        }
      }
    } finally {
      setUploadingReply(false)
      replyInFlight.current = false
    }
  }

  const pickReplyImage = (file) => {
    if (!file) return
    setReplyImage(file)
    setReplyImagePreview(URL.createObjectURL(file))
  }

  const startReply = (comment) => {
    setReplyingTo(comment)
    setShowReply(true)
  }

  // Build a nested tree from the flat comments list using reply_to_comment_id
  const buildCommentTree = (list) => {
    const byId = {}
    list.forEach(c => { byId[c.id] = { ...c, children: [] } })
    const roots = []
    list.forEach(c => {
      if (c.reply_to_comment_id && byId[c.reply_to_comment_id]) {
        byId[c.reply_to_comment_id].children.push(byId[c.id])
      } else {
        roots.push(byId[c.id])
      }
    })
    return roots
  }

  return (
    <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border-color)'}}>
      <div style={{display:'flex',gap:12}}>
        <button onClick={()=>onUserClick(a)} style={{background:'none',border:'none',padding:0,cursor:'pointer',flexShrink:0}}>
          <Avatar url={a.avatar_url} name={a.display_name} color={color} size={44}/>
        </button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:6,justifyContent:'space-between'}}>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <button onClick={()=>onUserClick(a)} style={{background:'none',border:'none',padding:0,cursor:'pointer',color:'var(--text-primary)',fontWeight:700,fontSize:15}}>{a.display_name}</button>
              {a.verified&&<span title='Flitters Verified Member' style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:20,height:20,borderRadius:'50%',background:'linear-gradient(135deg,#1a1a2e,#16213e)',border:'2px solid #C9A84C',boxShadow:'0 0 6px rgba(201,168,76,0.6)',flexShrink:0,cursor:'default'}}><img src="/flitters-logo-white.svg" alt="Verified" width={12} height={12} style={{objectFit:'contain',display:'block'}}/></span>}{a.is_authentic&&<span title='Authentic — Real & Verified Person' style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:18,height:18,flexShrink:0,cursor:'default'}}><svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'><path d='M12 2L14.4 4.8L18 4L18.8 7.6L22 9.2L20.4 12.6L22 16L18.8 17.6L18 21.2L14.4 20.4L12 23.2L9.6 20.4L6 21.2L5.2 17.6L2 16L3.6 12.6L2 9.2L5.2 7.6L6 4L9.6 4.8Z' fill='#1877F2'/><polyline points='8,12.5 10.5,15 16,9' fill='none' stroke='#fff' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/></svg></span>}
              <span style={{color:'var(--text-secondary)',fontSize:13}}>@{a.username}</span>
              <span style={{color:'var(--text-faint)'}}>·</span>
              <span style={{color:'var(--text-quaternary)',fontSize:12}}>{timeAgo(post.created_at)}</span>
            </div>
            {isOwn&&<button onClick={()=>{if(window.confirm('Delete this post?'))onDelete(post.id)}} style={{background:'none',border:'none',color:'var(--text-secondary)',cursor:'pointer',padding:'2px 6px',display:'flex'}}><Trash2 size={15}/></button>}
          </div>
          {post.content&&<p onClick={()=>!autoExpandComments && onOpenPost && onOpenPost(post.id)} style={{color:'var(--text-primary)',fontSize:15,lineHeight:1.65,marginBottom:12,wordBreak:'break-word',cursor:(!autoExpandComments&&onOpenPost)?'pointer':'default'}}><TextWithMentions text={post.content} supabase={supabase} onUserClick={onUserClick}/></p>}
          {post.image_url&&<img onClick={()=>!autoExpandComments && onOpenPost && onOpenPost(post.id)} src={post.image_url} style={{width:'100%',borderRadius:12,marginBottom:12,maxHeight:400,objectFit:'cover',cursor:(!autoExpandComments&&onOpenPost)?'pointer':'default'}} alt="post" loading="lazy"/>}
          <div style={{display:'flex'}}>
            <button onClick={loadComments} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,background:'none',border:'none',cursor:'pointer',color:showComments?'#5B9CF6':'#555',fontSize:13,padding:'6px 0'}}>
              <MessageCircle size={16}/><span>{comments}</span>
            </button>
            <button onClick={toggleRepost} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,background:'none',border:'none',cursor:'pointer',color:reposted?'#00C9A7':'#555',fontSize:13,padding:'6px 0'}}>
              <Repeat2 size={16}/><span>{reposts}</span>
            </button>
            <button onClick={toggleLike} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,background:'none',border:'none',cursor:'pointer',color:liked?'#FF4757':'#555',fontSize:13,padding:'6px 0'}}>
              <Heart size={16} fill={liked?'#FF4757':'none'} color={liked?'#FF4757':'currentColor'}/><span>{likes}</span>
            </button>
            <button onClick={handleShare} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,background:'none',border:'none',cursor:'pointer',color:'var(--text-secondary)',fontSize:13,padding:'6px 0'}}>
              <Share size={16}/>
            </button>
          </div>
          {showShareMenu&&(
            <div onClick={()=>setShowShareMenu(false)} style={{position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
              <div onClick={e=>e.stopPropagation()} className="sheet-in" style={{width:'100%',maxWidth:600,background:'var(--bg-app)',borderRadius:'20px 20px 0 0',padding:'20px',display:'flex',flexDirection:'column',gap:6}}>
                <div style={{fontWeight:700,fontSize:15,color:'var(--text-primary)',marginBottom:6}}>Share this post</div>
                <button onClick={copyShareLink} style={{display:'flex',alignItems:'center',gap:12,background:'none',border:'none',padding:'12px 4px',cursor:'pointer',color:'var(--text-primary)',fontSize:15,textAlign:'left'}}><Link2 size={19}/> Copy link</button>
                <a href={`https://wa.me/?text=${encodeURIComponent(shareText+' '+shareUrl)}`} target="_blank" rel="noopener noreferrer" onClick={()=>setShowShareMenu(false)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 4px',cursor:'pointer',color:'#25D366',fontSize:15,textDecoration:'none',fontWeight:600}}><MessageCircle size={19}/> WhatsApp</a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" onClick={()=>setShowShareMenu(false)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 4px',cursor:'pointer',color:'#1877F2',fontSize:15,textDecoration:'none',fontWeight:600}}><Share2 size={19}/> Facebook</a>
                <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" onClick={()=>setShowShareMenu(false)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 4px',cursor:'pointer',color:'var(--text-primary)',fontSize:15,textDecoration:'none',fontWeight:600}}><Share2 size={19}/> X (Twitter)</a>
                <button onClick={()=>setShowShareMenu(false)} style={{marginTop:8,background:'var(--bg-card)',border:'none',borderRadius:14,padding:'12px',color:'var(--text-secondary)',fontWeight:700,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          )}
          {showComments&&(
            <div className="sheet-in" style={{marginTop:12,borderTop:'1px solid var(--border-color)',paddingTop:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <span style={{color:'var(--text-tertiary)',fontSize:13}}>{comments} {comments===1?'comment':'comments'}</span>
                <button onClick={()=>{setReplyingTo(null);setShowReply(!showReply)}} style={{background:'rgba(91,156,246,0.1)',border:'1px solid rgba(91,156,246,0.2)',borderRadius:16,padding:'5px 12px',color:'#5B9CF6',cursor:'pointer',fontSize:13,fontWeight:600}}>+ Reply</button>
              </div>
              {loadingComments&&<p style={{color:'var(--text-quaternary)',fontSize:13,textAlign:'center'}}>Loading...</p>}
              {buildCommentTree(commentsList).map(cm=>(
                <CommentThread key={cm.id} comment={cm} depth={0} onUserClick={onUserClick} onReply={startReply}/>
              ))}
              {!loadingComments&&commentsList.length===0&&<p style={{color:'var(--text-quaternary)',fontSize:13,textAlign:'center'}}>No comments yet</p>}
            </div>
          )}
          {showReply&&(
            <div style={{marginTop:10}}>
              {replyingTo&&(
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--bg-card-4)',borderRadius:10,padding:'6px 10px',marginBottom:8,fontSize:12,color:'var(--text-tertiary)'}}>
                  <span>Replying to <strong style={{color:'var(--text-primary)'}}>{replyingTo.author?.display_name}</strong></span>
                  <span onClick={()=>setReplyingTo(null)} style={{cursor:'pointer',color:'var(--text-secondary)',display:'flex'}}><X size={16}/></span>
                </div>
              )}
              {replyImagePreview&&(
                <div style={{position:'relative',display:'inline-block',marginBottom:8}}>
                  <img src={replyImagePreview} style={{maxHeight:120,borderRadius:10,display:'block'}} alt="" loading="lazy"/>
                  <span onClick={()=>{setReplyImage(null);setReplyImagePreview('')}} style={{position:'absolute',top:-8,right:-8,background:'#FF4757',borderRadius:'50%',width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',cursor:'pointer'}}><X size={13}/></span>
                </div>
              )}
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <Avatar url={currentUser.avatar_url} name={currentUser.display_name} color={currentUser.avatar_color||'#5B9CF6'} size={28}/>
                <input value={replyText} onChange={e=>setReplyText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitReply()} placeholder={replyingTo?'Write a reply...':'Write a comment...'} autoFocus
                  style={{flex:1,background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:20,padding:'8px 14px',color:'var(--text-primary)',fontSize:14,outline:'none'}}/>
                <input ref={replyImageRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>pickReplyImage(e.target.files?.[0])}/>
                <button onClick={()=>replyImageRef.current?.click()} style={{background:'var(--bg-card-2)',border:'none',borderRadius:'50%',width:34,height:34,color:'var(--text-tertiary)',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><Camera size={15}/></button>
                <button onClick={submitReply} disabled={uploadingReply} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:20,padding:'8px 14px',color:'#fff',cursor:'pointer',fontWeight:700,flexShrink:0,opacity:uploadingReply?0.6:1,display:'flex',alignItems:'center'}}>{uploadingReply?'...':<Send size={15}/>}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}, postCardPropsEqual)

// ── MAIN APP ───────────────────────────────────────────────────────────────

function NotificationsPanel({ currentUser, supabase, onUserClick, onPostClick }) {
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)
  const typeInfo = {
    like:{icon:<Heart size={16} fill="#FF4757" color="#FF4757"/>,text:'liked your post'},
    comment:{icon:<MessageCircle size={16}/>,text:'commented on your post'},
    follow:{icon:<User size={16}/>,text:'started following you'},
    repost:{icon:<Repeat2 size={16}/>,text:'reposted your flit'},
    welcome:{icon:<Globe size={16}/>,text:'Welcome to Flitters!'},
    follow_request:{icon:<User size={16}/>,text:'sent you a follow request'},
    follow_accepted:{icon:<CheckCircle2 size={16}/>,text:'accepted your follow request'},
    mention:{icon:<MessageSquare size={16}/>,text:'tagged you in a post'},
  }
  useEffect(()=>{
    supabase.from('notifications').select('*,actor:profiles!actor_id(id,display_name,username,avatar_color,avatar_url)').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(40).then(({data})=>{setNotifs(data||[]);setLoading(false)})
    supabase.from('notifications').update({read:true}).eq('user_id',currentUser.id).eq('read',false).then(()=>{})
    const ch = supabase.channel('notifs:'+currentUser.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${currentUser.id}`},async(payload)=>{
      const {data} = await supabase.from('notifications').select('*,actor:profiles!actor_id(id,display_name,username,avatar_color,avatar_url)').eq('id',payload.new.id).single()
      if(data) setNotifs(prev=>[data,...prev])
    }).subscribe()
    return()=>supabase.removeChannel(ch)
  },[])
  return(
    <div>
      <div style={{padding:'16px 16px 12px',fontWeight:800,fontSize:20,color:'var(--text-primary)',display:'flex',alignItems:'center',gap:8}}>Notifications <Bell size={18}/></div>
      {loading&&<p style={{padding:'20px',textAlign:'center',color:'var(--text-quaternary)'}}>Loading...</p>}
      {!loading&&notifs.length===0&&<div style={{padding:'50px 20px',textAlign:'center'}}><div style={{display:'flex',justifyContent:'center',color:'var(--text-quaternary)'}}><Bell size={40}/></div><p style={{color:'var(--text-secondary)',marginTop:8}}>No notifications yet</p></div>}
      {notifs.map((n,i)=>{
        const info = typeInfo[n.type]||{icon:<Bell size={16}/>,text:''}
        const actor = n.actor
        const goesToPost = ['mention','like','comment','repost'].includes(n.type) && n.post_id
        return(<div key={n.id||i} onClick={()=>{ if(goesToPost) onPostClick?.(n.post_id); else if(actor) onUserClick(actor) }} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderBottom:'1px solid var(--bg-card-4)',cursor:(goesToPost||actor)?'pointer':'default',background:n.read?'transparent':'rgba(91,156,246,0.05)'}}>
          <div style={{width:44,height:44,borderRadius:'50%',background:'var(--bg-card-3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0,overflow:'hidden'}}>
            {actor?.avatar_url?<img src={actor.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" loading="lazy"/>:<span style={{color:'var(--text-secondary)',display:'flex'}}>{info.icon}</span>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <span style={{fontWeight:700,fontSize:14,color:'var(--text-primary)'}}>{actor?.display_name||'Flitters'} </span>
            <span style={{color:'var(--text-tertiary)',fontSize:14}}>{n.message||info.text}</span>
          </div>
          <span style={{color:'var(--text-quaternary)',fontSize:12,flexShrink:0}}>{timeAgo(n.created_at)}</span>
        </div>)
      })}
    </div>
  )
}


function GroupChat({ group, currentUser, supabase, onBack, onUserClick }) {
  const [messages, setMessages] = useState([])
  const [members, setMembers] = useState([])
  const [msgText, setMsgText] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [showRequests, setShowRequests] = useState(false)
  const [joinRequests, setJoinRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMsg, setSelectedMsg] = useState(null)
  const [editingMsg, setEditingMsg] = useState(null)
  const [editText, setEditText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [replyToId, setReplyToId] = useState(null)
  const [highlightMsgId, setHighlightMsgId] = useState(null)
  const highlightTimer = useRef(null)
  const scrollToMessage = (id) => {
    if(!id) return
    document.getElementById('gcmsg-'+id)?.scrollIntoView({behavior:'smooth',block:'center'})
    setHighlightMsgId(id)
    clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(()=>setHighlightMsgId(null),1200)
  }
  const longPressTimer = useRef(null)
  const [fullscreenImg, setFullscreenImg] = useState(null)
  const gcChannelRef = useRef(null)
  const gcTypingTimeouts = useRef({})
  const gcMyTypingThrottle = useRef(0)
  const [typingUsers, setTypingUsers] = useState({})
  const sendGCTyping = () => {
    const now = Date.now()
    if(now - gcMyTypingThrottle.current < 2000) return
    gcMyTypingThrottle.current = now
    gcChannelRef.current?.send({type:'broadcast',event:'typing',payload:{user_id:currentUser.id,name:currentUser.display_name?.split(' ')[0]||'Someone'}})
  }
  const [editName, setEditName] = useState(group.name)
  const [sendingImg, setSendingImg] = useState(false)
  const [showStickerTray, setShowStickerTray] = useState(false)
  const imgRef = useRef(null)
  const [editDesc, setEditDesc] = useState(group.description||'')
  const [editJoinMode, setEditJoinMode] = useState(group.join_mode||'open')
  const [editSaving, setEditSaving] = useState(false)
  const [groupAvatar, setGroupAvatar] = useState(group.avatar_url||null)
  const [groupData, setGroupData] = useState(group)
  const avatarRef = useRef(null)
  const bottomRef = useRef(null)
  const myRole = members.find(m=>m.user_id===currentUser.id)?.role||'member'
  const isAdmin = myRole==='admin'
  const isCreator = group.creator_id===currentUser.id
  const scrollRef = useRef(null)
  const isNearBottom = () => {
    const el = scrollRef.current
    if(!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }
  const userScrolledUp = useRef(false)

  useEffect(()=>{ loadAll(); supabase.from('group_members').update({last_read_at:new Date().toISOString()}).eq('group_id',group.id).eq('user_id',currentUser.id).then(()=>{}) },[])
  useEffect(()=>{
    if(!userScrolledUp.current) bottomRef.current?.scrollIntoView({behavior:'smooth'})
  },[messages])
  useEffect(()=>{
    const ch = supabase.channel('gc:'+group.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_messages',filter:'group_id=eq.'+group.id},async(payload)=>{
        let alreadyHave = false
        setMessages(prev=>{ alreadyHave = prev.some(m=>m.id===payload.new.id); return prev })
        if(alreadyHave) return // broadcast already delivered this one — skip the extra round trip
        const {data} = await supabase.from('group_messages').select('*,sender:profiles(id,display_name,avatar_url,avatar_color),group_message_reactions(user_id,emoji)').eq('id',payload.new.id).single()
        if(data) setMessages(prev=>{
          const filtered = prev.filter(m=>!(m.id.toString().startsWith('temp_')&&m.content===data.content&&m.sender_id===data.sender_id))
          return filtered.some(m=>m.id===data.id) ? filtered : [...filtered,data]
        })
        supabase.from('group_members').update({last_read_at:new Date().toISOString()}).eq('group_id',group.id).eq('user_id',currentUser.id).then(()=>{})
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'group_messages',filter:'group_id=eq.'+group.id},(payload)=>{
        setMessages(prev=>prev.map(m=>m.id===payload.new.id?{...m,...payload.new}:m))
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'group_messages'},(payload)=>{
        setMessages(prev=>prev.filter(m=>m.id!==payload.old.id))
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'group_message_reactions'},async(payload)=>{
        const msgId = payload.new?.group_message_id || payload.old?.group_message_id
        if(!msgId) return
        const {data} = await supabase.from('group_message_reactions').select('user_id,emoji').eq('group_message_id',msgId)
        if(data) setMessages(prev=>prev.map(m=>m.id===msgId?{...m,group_message_reactions:data}:m))
      })
      .on('broadcast',{event:'new_message'},async(payload)=>{
        const msg = payload.payload
        if(!msg?.id) return
        // Use data directly from broadcast - no DB fetch needed, avoids RLS issues
        setMessages(prev=>{
          const filtered = prev.filter(m=>!(m.id.toString().startsWith('temp_')&&m.content===msg.content&&m.sender_id===msg.sender_id))
          return filtered.some(m=>m.id===msg.id) ? filtered : [...filtered,{...msg,group_message_reactions:msg.group_message_reactions||[]}]
        })
      })
      .on('broadcast',{event:'typing'},(payload)=>{
        if(payload.payload?.user_id===currentUser.id) return
        setTypingUsers(prev=>({...prev,[payload.payload.user_id]:payload.payload.name}))
        clearTimeout(gcTypingTimeouts.current[payload.payload.user_id])
        gcTypingTimeouts.current[payload.payload.user_id] = setTimeout(()=>{
          setTypingUsers(prev=>{ const n={...prev}; delete n[payload.payload.user_id]; return n })
        },3000)
      })
      .subscribe()
    gcChannelRef.current = ch
    return()=>supabase.removeChannel(ch)
  },[])

  const loadAll = async () => {
    const [{data:msgs},{data:mems},{data:reqs}] = await Promise.all([
      supabase.from('group_messages').select('*,sender:profiles(id,display_name,avatar_url,avatar_color),group_message_reactions(user_id,emoji)').eq('group_id',group.id).order('created_at',{ascending:true}).limit(100),
      supabase.from('group_members').select('*,profile:profiles(id,display_name,username,avatar_url,avatar_color)').eq('group_id',group.id),
      supabase.from('group_join_requests').select('*,profile:profiles(id,display_name,username,avatar_url,avatar_color)').eq('group_id',group.id).eq('status','pending')
    ])
    setMessages(msgs||[])
    setMembers(mems||[])
    setJoinRequests(reqs||[])
    setLoading(false)
  }

  const gcInputRef = useRef(null)
  const gcSendInFlight = useRef(false)
  const sendMsg = async () => {
    if(gcSendInFlight.current) return
    if(!msgText.trim()) return
    gcSendInFlight.current = true
    const text=msgText.trim(); const reply=replyTo; const replyId=replyToId
    setMsgText(''); setReplyTo(null); setReplyToId(null)
    if(gcInputRef.current) gcInputRef.current.style.height='auto'
    const tempId = 'temp_'+Date.now()
    const tempMsg = {id:tempId,group_id:group.id,sender_id:currentUser.id,content:text,reply_to:reply,reply_to_id:replyId,created_at:new Date().toISOString(),sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color},group_message_reactions:[]}
    setMessages(prev=>[...prev,tempMsg])
    try {
    let {data:inserted,error} = await supabase.from('group_messages').insert({group_id:group.id,sender_id:currentUser.id,content:text,reply_to:reply,reply_to_id:replyId}).select('id,created_at').single()
    if(error && isMissingColumnError(error)) {
      console.warn('reply_to_id column missing, retrying without it — run supabase_migration_reply_and_stickers.sql', error)
      ;({data:inserted,error} = await supabase.from('group_messages').insert({group_id:group.id,sender_id:currentUser.id,content:text,reply_to:reply}).select('id,created_at').single())
    }
    if(inserted){
      const confirmed = {...tempMsg, id:inserted.id, created_at:inserted.created_at}
      setMessages(prev=>prev.map(m=>m.id===tempId?confirmed:m))
      // broadcast full message to other members
      gcChannelRef.current?.send({type:'broadcast',event:'new_message',payload:{
        id:inserted.id, group_id:group.id, sender_id:currentUser.id,
        content:text, reply_to:reply, reply_to_id:replyId, created_at:inserted.created_at,
        sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color},
        group_message_reactions:[]
      }})
      // one-time delayed fetch to sync with DB - merges not overwrites
      setTimeout(async()=>{
        const {data} = await supabase.from('group_messages').select('*,sender:profiles(id,display_name,avatar_url,avatar_color),group_message_reactions(user_id,emoji)').eq('group_id',group.id).order('created_at',{ascending:true}).limit(100)
        if(data) setMessages(prev=>{
          const temps = prev.filter(m=>m.id.toString().startsWith('temp_'))
          const confirmedIds = new Set(data.map(m=>m.id))
          const stillPending = temps.filter(t=>!data.some(d=>d.content===t.content&&d.sender_id===t.sender_id&&Math.abs(new Date(d.created_at)-new Date(t.created_at))<10000))
          return [...data,...stillPending]
        })
      }, 1500)
    } else {
      console.error('GC insert error:', error)
      setMessages(prev=>prev.map(m=>m.id===tempId?{...m,_failed:true}:m))
    }
    } finally { gcSendInFlight.current = false }
  }

  const sendImage = async (file) => {
    if(!file) return
    setSendingImg(true)
    const ext = file.name.split('.').pop()
    const path = 'chats/gc_'+group.id+'_'+Date.now()+'.'+ext
    const {error} = await supabase.storage.from('avatars').upload(path,file,{upsert:false})
    if(error){alert('Image upload failed: '+error.message);setSendingImg(false);return}
    const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
    const url = urlData.publicUrl
    const tempMsg = {id:'temp_img_'+Date.now(),group_id:group.id,sender_id:currentUser.id,content:'[image]',image_url:url,created_at:new Date().toISOString(),sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}}
    setMessages(prev=>[...prev,tempMsg])
    const {data:inserted} = await supabase.from('group_messages').insert({group_id:group.id,sender_id:currentUser.id,content:'',image_url:url}).select('id,created_at').single()
    if(inserted){
      gcChannelRef.current?.send({type:'broadcast',event:'new_message',payload:{
        id:inserted.id, group_id:group.id, sender_id:currentUser.id, content:'', image_url:url, created_at:inserted.created_at,
        sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color},
        group_message_reactions:[]
      }})
    }
    setSendingImg(false)
  }

  const sendSticker = async (stickerUrl) => {
    setShowStickerTray(false)
    const tempId = 'temp_stk_'+Date.now()
    const tempMsg = {id:tempId,group_id:group.id,sender_id:currentUser.id,content:'',is_sticker:true,sticker_url:stickerUrl,created_at:new Date().toISOString(),sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color},group_message_reactions:[]}
    setMessages(prev=>[...prev,tempMsg])
    const {data:inserted,error} = await supabase.from('group_messages').insert({group_id:group.id,sender_id:currentUser.id,content:'',is_sticker:true,sticker_url:stickerUrl}).select('id,created_at').single()
    if(inserted){
      setMessages(prev=>prev.map(m=>m.id===tempId?{...m,id:inserted.id,created_at:inserted.created_at}:m))
      gcChannelRef.current?.send({type:'broadcast',event:'new_message',payload:{
        id:inserted.id, group_id:group.id, sender_id:currentUser.id, content:'', is_sticker:true, sticker_url:stickerUrl, created_at:inserted.created_at,
        sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color},
        group_message_reactions:[]
      }})
    } else {
      console.error('Sticker send failed:', error)
      setMessages(prev=>prev.map(m=>m.id===tempId?{...m,_failed:true}:m))
      if(isMissingColumnError(error)) alert('Stickers need one-time setup — run supabase_migration_reply_and_stickers.sql in Supabase first.')
      else alert('Sticker failed to send: '+(error?.message||'unknown error'))
    }
  }

  const promoteToAdmin = async (member) => {
    await supabase.from('group_members').update({role:'admin'}).eq('group_id',group.id).eq('user_id',member.user_id)
    setMembers(prev=>prev.map(m=>m.user_id===member.user_id?{...m,role:'admin'}:m))
  }

  const demoteAdmin = async (member) => {
    await supabase.from('group_members').update({role:'member'}).eq('group_id',group.id).eq('user_id',member.user_id)
    setMembers(prev=>prev.map(m=>m.user_id===member.user_id?{...m,role:'member'}:m))
  }

  const removeMember = async (member) => {
    if(member.user_id===group.creator_id) return
    const {error} = await supabase.from('group_members').delete().eq('group_id',group.id).eq('user_id',member.user_id)
    if(!error) setMembers(prev=>prev.filter(m=>m.user_id!==member.user_id))
    else alert('Could not remove member. Check admin permissions.')
  }

  const acceptRequest = async (req) => {
    await supabase.from('group_join_requests').update({status:'accepted'}).eq('id',req.id)
    await supabase.from('group_members').insert({group_id:group.id,user_id:req.user_id})
    setJoinRequests(prev=>prev.filter(r=>r.id!==req.id))
    setMembers(prev=>[...prev,{user_id:req.user_id,role:'member',profile:req.profile}])
  }

  const rejectRequest = async (req) => {
    await supabase.from('group_join_requests').update({status:'rejected'}).eq('id',req.id)
    setJoinRequests(prev=>prev.filter(r=>r.id!==req.id))
  }

  const copyInviteLink = () => {
    const link = window.location.origin+'/join/'+group.tag
    navigator.clipboard.writeText(link).then(()=>alert('Invite link copied!\n'+link))
  }

  const handleLongPress = (msg) => { longPressTimer.current = setTimeout(()=>setSelectedMsg(msg),500) }
  const handlePressEnd = () => clearTimeout(longPressTimer.current)
  const toggleGroupReaction = async(msg,emoji) => {
    const mine = msg.group_message_reactions?.find(r=>r.user_id===currentUser.id)
    setSelectedMsg(null)
    if(mine && mine.emoji===emoji){
      // tapping same emoji again removes it
      setMessages(prev=>prev.map(m=>m.id===msg.id?{...m,group_message_reactions:(m.group_message_reactions||[]).filter(r=>r.user_id!==currentUser.id)}:m))
      await supabase.from('group_message_reactions').delete().eq('group_message_id',msg.id).eq('user_id',currentUser.id)
    } else {
      setMessages(prev=>prev.map(m=>m.id===msg.id?{...m,group_message_reactions:[...(m.group_message_reactions||[]).filter(r=>r.user_id!==currentUser.id),{user_id:currentUser.id,emoji}]}:m))
      await supabase.from('group_message_reactions').upsert({group_message_id:msg.id,user_id:currentUser.id,emoji},{onConflict:'group_message_id,user_id'})
    }
  }
  const deleteGCMsg = async(msg) => {
    setSelectedMsg(null)
    // optimistic remove
    setMessages(prev=>prev.filter(m=>m.id!==msg.id))
    await supabase.from('group_messages').delete().eq('id',msg.id).eq('sender_id',currentUser.id)
  }
  const startEditGCMsg = (msg) => { setSelectedMsg(null); setEditingMsg(msg.id); setEditText(msg.content) }
  const saveEditGCMsg = async() => { if(!editText.trim()) return; await supabase.from('group_messages').update({content:editText.trim()}).eq('id',editingMsg).eq('sender_id',currentUser.id); setMessages(prev=>prev.map(m=>m.id===editingMsg?{...m,content:editText.trim()}:m)); setEditingMsg(null); setEditText('') }

  const uploadGroupAvatar = async (file) => {
    if(!file) return
    const ext = file.name.split('.').pop()
    const path = 'groups/'+group.id+'.'+ext
    const {error} = await supabase.storage.from('avatars').upload(path,file,{upsert:true})
    if(error){alert('Upload failed: '+error.message);return}
    const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
    const url = urlData.publicUrl+'?t='+Date.now()
    const {data:updated,error:dbErr} = await supabase.from('groups').update({avatar_url:urlData.publicUrl}).eq('id',group.id).select().single()
    if(dbErr){alert('DB error: '+dbErr.message+' groupid:'+group.id);return}
    if(!updated){alert('No rows updated - group id mismatch?');return}
    group.avatar_url = urlData.publicUrl
    setGroupAvatar(url)
    alert('Done! url:'+url.slice(0,40))
  }

  const saveGroupSettings = async () => {
    if(!editName.trim()){alert('Group name cannot be empty');return}
    setEditSaving(true)
    await supabase.from('groups').update({name:editName.trim(),description:editDesc.trim(),join_mode:editJoinMode}).eq('id',group.id)
    group.name = editName.trim()
    group.description = editDesc.trim()
    group.join_mode = editJoinMode
    setEditSaving(false)
    alert('Group updated!')
  }

  const leaveGroup = async () => {
    if(isCreator){ alert('You cannot leave a group you created. Delete it instead.'); return }
    await supabase.from('group_members').delete().eq('group_id',group.id).eq('user_id',currentUser.id)
    onBack()
  }

  const deleteGroup = async () => {
    if(!isCreator && !isAdmin) return
    await supabase.from('groups').delete().eq('id',group.id)
    onBack()
  }

  if(showRequests) return (
    <div className="screen-in" style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setShowRequests(false)} style={{background:'none',border:'none',color:'var(--text-primary)',fontSize:24,cursor:'pointer'}}>‹</button>
        <span style={{fontWeight:700,fontSize:17}}>Join Requests ({joinRequests.length})</span>
      </div>
      {joinRequests.length===0&&<div style={{padding:'50px 20px',textAlign:'center'}}><div style={{display:'flex',justifyContent:'center',color:'var(--text-quaternary)'}}><Inbox size={40}/></div><p style={{color:'var(--text-secondary)',marginTop:8}}>No pending requests</p></div>}
      {joinRequests.map(req=>(
        <div key={req.id} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:'1px solid var(--bg-card-4)'}}>
          <Avatar url={req.profile?.avatar_url} name={req.profile?.display_name} color={req.profile?.avatar_color||'#5B9CF6'} size={46}/>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:15}}>{req.profile?.display_name}</div>
            <div style={{color:'var(--text-secondary)',fontSize:13}}>@{req.profile?.username} · {timeAgo(req.created_at)}</div>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>acceptRequest(req)} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:10,padding:'8px 12px',color:'var(--text-primary)',fontWeight:700,fontSize:13,cursor:'pointer'}}>Accept</button>
            <button onClick={()=>rejectRequest(req)} style={{background:'rgba(255,71,87,0.1)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:10,padding:'8px 12px',color:'#FF4757',fontWeight:700,fontSize:13,cursor:'pointer'}}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  )

  if(showMembers) return (
    <div className="screen-in" style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setShowMembers(false)} style={{background:'none',border:'none',color:'var(--text-primary)',fontSize:24,cursor:'pointer'}}>‹</button>
        <span style={{fontWeight:700,fontSize:17}}>Members ({members.length})</span>
      </div>
      {members.map(m=>{
        const isThisCreator = m.user_id===group.creator_id
        const isThisAdmin = m.role==='admin'
        return(
          <div key={m.user_id} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:'1px solid var(--bg-card-4)'}}>
            <button onClick={()=>onUserClick(m.profile)} style={{background:'none',border:'none',padding:0,cursor:'pointer'}}>
              <Avatar url={m.profile?.avatar_url} name={m.profile?.display_name} color={m.profile?.avatar_color||'#5B9CF6'} size={46}/>
            </button>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontWeight:700,fontSize:15}}>{m.profile?.display_name}</span>
                {isThisCreator&&<span style={{background:'linear-gradient(135deg,#FFD700,#FFA500)',borderRadius:8,padding:'2px 7px',fontSize:10,fontWeight:800,color:'#000'}}>Creator</span>}
                {isThisAdmin&&!isThisCreator&&<span style={{background:'rgba(91,156,246,0.2)',border:'1px solid rgba(91,156,246,0.4)',borderRadius:8,padding:'2px 7px',fontSize:10,fontWeight:700,color:'#5B9CF6'}}>Admin</span>}
              </div>
              <div style={{color:'var(--text-secondary)',fontSize:13}}>@{m.profile?.username}</div>
            </div>
            {(isAdmin||isCreator)&&m.user_id!==currentUser.id&&!isThisCreator&&(
              <div style={{display:'flex',gap:6}}>
                {!isThisAdmin&&<button onClick={()=>promoteToAdmin(m)} style={{background:'rgba(91,156,246,0.1)',border:'1px solid rgba(91,156,246,0.2)',borderRadius:10,padding:'6px 10px',color:'#5B9CF6',fontSize:12,fontWeight:700,cursor:'pointer'}}>Promote</button>}
                {isThisAdmin&&isCreator&&<button onClick={()=>demoteAdmin(m)} style={{background:'rgba(255,71,87,0.1)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:10,padding:'6px 10px',color:'#FF4757',fontSize:12,fontWeight:700,cursor:'pointer'}}>Demote</button>}
                {isCreator&&<button onClick={()=>removeMember(m)} style={{background:'rgba(255,71,87,0.1)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:10,padding:'6px 10px',color:'#FF4757',fontSize:12,fontWeight:700,cursor:'pointer'}}>Remove</button>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  if(showSettings) return (
    <div className="screen-in" style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setShowSettings(false)} style={{background:'none',border:'none',color:'var(--text-primary)',fontSize:24,cursor:'pointer'}}>‹</button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>Group Settings</span>
        {isCreator&&<button onClick={saveGroupSettings} disabled={editSaving} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:16,padding:'8px 16px',color:'var(--text-primary)',fontWeight:700,fontSize:13,cursor:'pointer'}}>{editSaving?'Saving...':'Save'}</button>}
      </div>
      <div style={{padding:20}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div onClick={()=>isCreator&&avatarRef.current?.click()} style={{width:88,height:88,borderRadius:24,background:group.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,fontWeight:800,color:'var(--text-primary)',margin:'0 auto 8px',cursor:isCreator?'pointer':'default',overflow:'hidden',position:'relative'}}>
            {groupAvatar?<img src={groupAvatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" loading="lazy"/>:editName[0]||'G'}
            {isCreator&&<div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,0.5)',padding:'4px',textAlign:'center',fontSize:11,color:'var(--text-primary)'}}>Edit</div>}
          </div>
          {isCreator&&<input ref={avatarRef} type="file" accept="image/*" onChange={e=>uploadGroupAvatar(e.target.files[0])} style={{display:'none'}}/>}
          <p style={{color:'var(--text-secondary)',fontSize:13}}>{members.length} members · @{group.tag}</p>
        </div>
        {isCreator&&<>
          <input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Group name" style={{width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none',boxSizing:'border-box',marginBottom:12}}/>
          <textarea value={editDesc} onChange={e=>setEditDesc(e.target.value)} placeholder="Description (optional)" rows={2} style={{width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none',resize:'none',fontFamily:'sans-serif',boxSizing:'border-box',marginBottom:12}}/>
          <p style={{color:'var(--text-tertiary)',fontSize:13,marginBottom:8}}>Who can join?</p>
          <div style={{display:'flex',gap:8,marginBottom:20}}>
            <button onClick={()=>setEditJoinMode('open')} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid '+(editJoinMode==='open'?'#5B9CF6':'var(--bg-card-2)'),background:editJoinMode==='open'?'rgba(91,156,246,0.15)':'transparent',color:editJoinMode==='open'?'#5B9CF6':'#888',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Globe size={15}/> Anyone</button>
            <button onClick={()=>setEditJoinMode('request')} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid '+(editJoinMode==='request'?'#845EF7':'var(--bg-card-2)'),background:editJoinMode==='request'?'rgba(132,94,247,0.15)':'transparent',color:editJoinMode==='request'?'#845EF7':'#888',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Lock size={15}/> Request</button>
          </div>
        </>}
        <div style={{borderRadius:16,overflow:'hidden',border:'1px solid var(--border-color)'}}>
          <button onClick={()=>{setShowSettings(false);setShowMembers(true)}} style={{width:'100%',background:'var(--bg-card-5)',border:'none',borderBottom:'1px solid var(--border-color)',padding:'16px',color:'var(--text-primary)',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between'}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:8}}><Users size={16}/> Members</span><span style={{color:'var(--text-secondary)'}}>{members.length} ›</span>
          </button>
          <button onClick={copyInviteLink} style={{width:'100%',background:'var(--bg-card-5)',border:'none',borderBottom:'1px solid var(--border-color)',padding:'16px',color:'#00C9A7',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between'}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:8}}><Link2 size={16}/> Copy Invite Link</span><span style={{color:'var(--text-secondary)',fontSize:13}}>@{group.tag}</span>
          </button>
          {(isAdmin||isCreator)&&<button onClick={()=>{setShowSettings(false);setShowRequests(true)}} style={{width:'100%',background:'var(--bg-card-5)',border:'none',borderBottom:'1px solid var(--border-color)',padding:'16px',color:'#F7B731',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between'}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:8}}><Inbox size={16}/> Join Requests</span>{joinRequests.length>0&&<span style={{background:'#FF4757',borderRadius:10,padding:'2px 8px',fontSize:12,color:'var(--text-primary)'}}>{joinRequests.length}</span>}
          </button>}
          <button onClick={leaveGroup} style={{width:'100%',background:'var(--bg-card-5)',border:'none',borderBottom:isCreator?'1px solid rgba(255,255,255,0.07)':'none',padding:'16px',color:'#FF4757',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left'}}>
            <LogOut size={16}/> Leave Group
          </button>
          {(isCreator||isAdmin)&&<button onClick={()=>{if(window.confirm('Delete this group? This cannot be undone.'))deleteGroup()}} style={{width:'100%',background:'var(--bg-card-5)',border:'none',padding:'16px',color:'#FF4757',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left'}}>
            <Trash2 size={16}/> Delete Group
          </button>}
        </div>
      </div>
    </div>
  )

  return (
    <div className="screen-in-safe full-screen-height" style={{background:'var(--bg-app)',color:'var(--text-primary)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {fullscreenImg&&<div onClick={()=>setFullscreenImg(null)} style={{position:'fixed',inset:0,zIndex:999,background:'rgba(0,0,0,0.95)',display:'flex',alignItems:'center',justifyContent:'center'}}><img src={fullscreenImg} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} alt="" loading="lazy"/></div>}
      <div style={{position:'fixed',top:0,left:0,right:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'var(--text-primary)',fontSize:24,cursor:'pointer'}}>‹</button>
        <div onClick={()=>setShowSettings(true)} style={{display:'flex',alignItems:'center',gap:10,flex:1,cursor:'pointer'}}>
          <div style={{width:38,height:38,borderRadius:12,background:group.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:18,color:'var(--text-primary)',overflow:'hidden'}}>
            {groupAvatar?<img src={groupAvatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" loading="lazy"/>:group.name[0]}
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:16}}>{group.name}</div>
            <div style={{color:'var(--text-secondary)',fontSize:12}}>{members.length} members</div>
          </div>
        </div>
        <button onClick={()=>setShowSettings(true)} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',display:'flex'}}><Settings size={22}/></button>
      </div>

      <div ref={scrollRef} onScroll={()=>{ userScrolledUp.current = !isNearBottom() }} style={{flex:1,padding:'16px 14px',display:'flex',flexDirection:'column',gap:8,paddingTop:80,overflowY:'auto',height:0}}>
        {loading&&<p style={{textAlign:'center',color:'var(--text-quaternary)',marginTop:40}}>Loading...</p>}
        {!loading&&messages.length===0&&<div style={{textAlign:'center',marginTop:60}}>
          <p style={{fontSize:40}}>👋</p>
          <p style={{color:'var(--text-quaternary)',fontSize:14,marginTop:8}}>Say hello to the group!</p>
        </div>}
        {selectedMsg&&<div onClick={()=>setSelectedMsg(null)} style={{position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-end'}}>
          <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'#1a1d26',borderRadius:'20px 20px 0 0',padding:'16px 0 32px'}}>
            <div style={{width:36,height:4,borderRadius:2,background:'var(--bg-card-8)',margin:'0 auto 16px'}}/>
            <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:8,marginBottom:16,padding:'0 12px',maxHeight:170,overflowY:'auto'}}>
              {QUICK_REACTIONS.map(e=>{
                const mine = selectedMsg.group_message_reactions?.find(r=>r.user_id===currentUser.id)
                const isMineActive = mine?.emoji===e
                return (
                <button key={e} onClick={()=>toggleGroupReaction(selectedMsg,e)} style={{background:isMineActive?'rgba(91,156,246,0.25)':'var(--bg-card-6)',border:isMineActive?'1px solid #5B9CF6':'none',borderRadius:12,padding:'8px',fontSize:22,cursor:'pointer'}}>{e}</button>
                )
              })}
            </div>
            <button onClick={()=>{setReplyTo(selectedMsg.sender?.display_name+': '+selectedMsg.content?.slice(0,50));setReplyToId(selectedMsg.id);setSelectedMsg(null)}} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'rgba(255,255,255,0.92)',fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10}}><CornerUpLeft size={17}/> Reply</button>
            {selectedMsg.content&&<button onClick={()=>{navigator.clipboard?.writeText(selectedMsg.content);setSelectedMsg(null)}} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'rgba(255,255,255,0.92)',fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10}}><Copy size={17}/> Copy</button>}
            {selectedMsg.sender_id===currentUser.id&&<>
              <button onClick={()=>startEditGCMsg(selectedMsg)} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'#5B9CF6',fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10}}><Pencil size={17}/> Edit</button>
              <button onClick={()=>deleteGCMsg(selectedMsg)} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'#FF4757',fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10}}><Trash2 size={17}/> Delete</button>
            </>}
          </div>
        </div>}
        {messages.map(msg=>{
          const own = msg.sender_id===currentUser.id
          return(
            <MessageBubble key={msg.id}
              rowId={'gcmsg-'+msg.id}
              msg={msg} own={own} showSenderInfo currentUserId={currentUser.id}
              onAvatarClick={()=>onUserClick(msg.sender)}
              onImageClick={setFullscreenImg}
              onLongPress={()=>handleLongPress(msg)} onPressEnd={handlePressEnd}
              reactions={msg.group_message_reactions}
              onToggleReaction={(emoji)=>toggleGroupReaction(msg,emoji)}
              isEditing={editingMsg===msg.id}
              editValue={editText} onEditChange={e=>setEditText(e.target.value)}
              onSaveEdit={saveEditGCMsg} onCancelEdit={()=>setEditingMsg(null)}
              onJumpToReply={scrollToMessage} highlighted={highlightMsgId===msg.id}
            />
          )
        })}
        <div ref={bottomRef}/>
      </div>

      <div style={{flexShrink:0,maxWidth:600,width:'100%',margin:'0 auto',background:'var(--bg-app)',borderTop:'1px solid var(--border-color)',paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
        {Object.keys(typingUsers).length>0&&<div style={{padding:'6px 14px 0',color:'#5B9CF6',fontSize:12,fontStyle:'italic'}}>{Object.values(typingUsers).join(', ')} {Object.keys(typingUsers).length===1?'is':'are'} typing...</div>}
        <ReplyComposerBar text={replyTo} onCancel={()=>{setReplyTo(null);setReplyToId(null)}}/>
        {showStickerTray&&<StickerTray currentUser={currentUser} supabase={supabase} onSelect={sendSticker} onClose={()=>setShowStickerTray(false)}/>}
        <div style={{padding:'10px 14px',display:'flex',gap:10,alignItems:'center'}}>
          <input ref={imgRef} type="file" accept="image/*" onChange={e=>sendImage(e.target.files[0])} style={{display:'none'}}/>
          <button onClick={()=>imgRef.current?.click()} disabled={sendingImg} style={{width:40,height:40,borderRadius:'50%',background:'var(--bg-card)',border:'none',cursor:'pointer',color:'var(--text-tertiary)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>{sendingImg?<Loader2 size={18} className="xspin"/>:<ImageIcon size={18}/>}</button>
          <button onClick={()=>setShowStickerTray(v=>!v)} style={{width:40,height:40,borderRadius:'50%',background:showStickerTray?'rgba(91,156,246,0.2)':'var(--bg-card)',border:'none',cursor:'pointer',color:showStickerTray?'#5B9CF6':'var(--text-tertiary)',fontSize:18,flexShrink:0}}>😊</button>
        <textarea ref={gcInputRef} rows={1} value={msgText} onChange={e=>{setMsgText(e.target.value);sendGCTyping();e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'}} placeholder="Message group..." style={{flex:1,background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:20,padding:'12px 18px',color:'var(--text-primary)',fontSize:15,outline:'none',fontFamily:'sans-serif',resize:'none',maxHeight:120,overflowY:'auto',lineHeight:1.4}}/>
          <button onClick={sendMsg} disabled={!msgText.trim()} style={{width:46,height:46,borderRadius:'50%',background:msgText.trim()?'linear-gradient(135deg,#5B9CF6,#845EF7)':'var(--bg-card-3)',border:'none',cursor:msgText.trim()?'pointer':'not-allowed',color:msgText.trim()?'#fff':'#333',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><Send size={19}/></button>
        </div>
      </div>
    </div>
  )
}

function ReelsView({ currentUser, supabase, onUserClick, onClose, initialReelId }) {
  const [reels, setReels] = useState([])
  const [reelAds, setReelAds] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [caption, setCaption] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [liked, setLiked] = useState({})
  const [likes, setLikes] = useState({})
  const [playing, setPlaying] = useState(true)
  const [buffering, setBuffering] = useState(false)
  const [animDir, setAnimDir] = useState(null) // 'up' | 'down' | null
  const [animating, setAnimating] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [commentCounts, setCommentCounts] = useState({})
  const videoRef = useRef(null)
  const fileRef = useRef(null)
  const touchStart = useRef(null)
  const containerRef = useRef(null)
  const isMounted = useRef(false)

  useEffect(()=>{ loadReels() },[])
  useEffect(()=>{
    // lock body scroll/overscroll while reels are open
    const prev = document.body.style.overscrollBehavior
    document.body.style.overscrollBehavior = 'none'
    document.body.style.overflow = 'hidden'
    return ()=>{ document.body.style.overscrollBehavior = prev; document.body.style.overflow = '' }
  },[])
  useEffect(()=>{ supabase.from('ads').select('*').eq('active',true).eq('type','reel').then(({data})=>setReelAds(data||[])) },[])
  useEffect(()=>{
    if(!isMounted.current){ isMounted.current=true; return }
    if(videoRef.current){ videoRef.current.currentTime=0; videoRef.current.play().catch(()=>{}) }
    setPlaying(true)
  },[currentIdx])
  useEffect(()=>{
    if(!videoRef.current) return
    playing?videoRef.current.play().catch(()=>{}):videoRef.current.pause()
  },[playing])

  const loadReels = async() => {
    const {data} = await supabase.from('reels').select('*,author:profiles(id,display_name,username,avatar_url,avatar_color,verified,is_authentic),reel_likes(user_id)').order('created_at',{ascending:false}).limit(20)
    if(!data) return
    setReels(data)
    const likedMap={}, likesMap={}
    data.forEach(r=>{ likedMap[r.id]=r.reel_likes?.some(l=>l.user_id===currentUser.id); likesMap[r.id]=r.reel_likes?.length||0 })
    setLiked(likedMap); setLikes(likesMap)
    // load real comment counts for all reels
    const ids = data.map(r=>r.id)
    if(ids.length>0){
      const {data:cc} = await supabase.from('comments').select('reel_id').in('reel_id',ids)
      if(cc){
        const countMap={}
        cc.forEach(c=>{ countMap[c.reel_id]=(countMap[c.reel_id]||0)+1 })
        setCommentCounts(countMap)
      }
    }
    // preload first two videos
    data.slice(0,2).forEach(r=>{ const v=document.createElement('video'); v.src=r.video_url; v.preload='auto' })
    // jump to specific reel if opened from feed preview
    if(initialReelId){ const idx=data.findIndex(r=>r.id===initialReelId); if(idx>=0) setCurrentIdx(idx) }
  }

  const goToReel = (nextIdx, dir) => {
    if(animating) return
    setAnimDir(dir)
    setAnimating(true)
    setTimeout(()=>{ setCurrentIdx(nextIdx); setAnimDir(null); setAnimating(false); setBuffering(false)
      // preload next video
      if(reels[nextIdx+1]) { const v=document.createElement('video'); v.src=reels[nextIdx+1].video_url; v.preload='auto' }
    }, 320)
  }

  const toggleLike = async(reel) => {
    const isLiked = liked[reel.id]
    setLiked(p=>({...p,[reel.id]:!isLiked}))
    setLikes(p=>({...p,[reel.id]:(p[reel.id]||0)+(isLiked?-1:1)}))
    if(isLiked) await supabase.from('reel_likes').delete().eq('reel_id',reel.id).eq('user_id',currentUser.id)
    else await supabase.from('reel_likes').insert({reel_id:reel.id,user_id:currentUser.id})
  }

  const openComments = async(reel) => {
    setShowComments(true)
    setComments([]) // clear stale comments from a previously viewed reel immediately
    const {data} = await supabase.from('comments').select('*,author:profiles(id,display_name,username,avatar_url,avatar_color)').eq('reel_id',reel.id).order('created_at',{ascending:true})
    setComments(data||[])
    setCommentCounts(p=>({...p,[reel.id]:data?.length||0}))
  }

  const postComment = async(reel) => {
    if(!commentText.trim()) return
    const text = commentText.trim()
    setCommentText('')
    // optimistic insert immediately so it never disappears
    const optimistic = {id:'tmp_'+Date.now(),reel_id:reel.id,user_id:currentUser.id,content:text,author:{id:currentUser.id,display_name:currentUser.display_name,username:currentUser.username,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}}
    setComments(p=>[...p,optimistic])
    setCommentCounts(p=>({...p,[reel.id]:(p[reel.id]||0)+1}))
    const {data:c} = await supabase.from('comments').insert({reel_id:reel.id,user_id:currentUser.id,content:text}).select('*,author:profiles(id,display_name,username,avatar_url,avatar_color)').single()
    // replace optimistic with real
    if(c) setComments(p=>p.map(x=>x.id===optimistic.id?c:x))
  }

  const uploadReel = async() => {
    if(!videoFile) return
    setUploading(true)
    const ext = videoFile.name.split('.').pop()
    const path = 'reels/'+currentUser.id+'_'+Date.now()+'.'+ext
    const {error} = await supabase.storage.from('avatars').upload(path,videoFile,{upsert:false})
    if(error){alert('Upload failed: '+error.message);setUploading(false);return}
    const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
    const {data:reel} = await supabase.from('reels').insert({user_id:currentUser.id,video_url:urlData.publicUrl,caption:caption.trim()}).select('*,author:profiles(id,display_name,username,avatar_url,avatar_color)').single()
    if(reel){ setReels(prev=>[reel,...prev]); setLikes(p=>({...p,[reel.id]:0})); setLiked(p=>({...p,[reel.id]:false})) }
    setVideoFile(null); setCaption(''); setShowUpload(false); setUploading(false)
  }

  const deleteReel = async(reel) => {
    await supabase.from('reels').delete().eq('id',reel.id)
    const newReels = reels.filter(r=>r.id!==reel.id)
    setReels(newReels)
    if(currentIdx>=newReels.length) setCurrentIdx(Math.max(0,newReels.length-1))
  }

  const handleTouchStart = (e) => { if(showComments) return; touchStart.current = e.touches[0].clientY }
  const handleTouchEnd = (e) => {
    if(showComments||!touchStart.current) return
    const diff = touchStart.current - e.changedTouches[0].clientY
    if(Math.abs(diff)>60){
      if(diff>0 && currentIdx<reels.length-1) goToReel(currentIdx+1,'up')
      else if(diff<0 && currentIdx>0) goToReel(currentIdx-1,'down')
    }
    touchStart.current = null
  }

  const slideStyle = animDir==='up' ? {transform:'translateY(-100%)',transition:'transform 0.32s cubic-bezier(0.4,0,0.2,1)'}
    : animDir==='down' ? {transform:'translateY(100%)',transition:'transform 0.32s cubic-bezier(0.4,0,0.2,1)'}
    : {transform:'translateY(0)',transition:'transform 0.32s cubic-bezier(0.4,0,0.2,1)'}

  const isAdSlot = reelAds.length>0 && (currentIdx+1)%5===0
  const currentAd = isAdSlot ? reelAds[Math.floor(currentIdx/5)%reelAds.length] : null
  const reel = reels[currentIdx]

  if(showUpload) return (
    <div style={{position:'fixed',inset:0,zIndex:400,background:'var(--bg-app)',color:'var(--text-primary)',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'16px',display:'flex',alignItems:'center',gap:12,borderBottom:'1px solid var(--border-color)'}}>
        <button onClick={()=>setShowUpload(false)} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',display:'flex'}}><X size={24}/></button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>New Reel</span>
        <button onClick={uploadReel} disabled={!videoFile||uploading} style={{background:videoFile?'linear-gradient(135deg,#5B9CF6,#845EF7)':'var(--bg-card-2)',border:'none',borderRadius:20,padding:'8px 20px',color:'var(--text-primary)',fontWeight:700,cursor:'pointer'}}>{uploading?'Uploading...':'Post'}</button>
      </div>
      <div style={{flex:1,padding:20,display:'flex',flexDirection:'column',gap:16}}>
        <div onClick={()=>fileRef.current?.click()} style={{height:200,background:'var(--bg-card-4)',border:'2px dashed rgba(255,255,255,0.15)',borderRadius:16,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',gap:8}}>
          {videoFile?<><Clapperboard size={36}/><span style={{color:'#00C9A7',fontSize:14}}>{videoFile.name}</span></>:<><Video size={36}/><span style={{color:'var(--text-secondary)',fontSize:14}}>Tap to select video</span></>}
        </div>
        <input ref={fileRef} type="file" accept="video/*" onChange={e=>setVideoFile(e.target.files[0])} style={{display:'none'}}/>
        <textarea value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Write a caption..." rows={3} style={{background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none',resize:'none',fontFamily:'sans-serif'}}/>
      </div>
    </div>
  )

  return (
    <div ref={containerRef} style={{position:'fixed',inset:0,zIndex:400,background:'#000',color:'#fff',overflow:'hidden',overscrollBehavior:'none',touchAction:'pan-y'}}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {/* top controls */}
      <button onClick={onClose} style={{position:'absolute',top:16,left:16,zIndex:20,background:'rgba(0,0,0,0.5)',border:'none',borderRadius:'50%',width:36,height:36,color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={20}/></button>
      <button onClick={()=>setShowUpload(true)} style={{position:'absolute',top:16,right:16,zIndex:20,background:'rgba(0,0,0,0.5)',border:'none',borderRadius:20,padding:'8px 14px',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>+ Reel</button>

      {reels.length===0&&<div style={{height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'center'}}><Clapperboard size={44}/></div>
        <p style={{fontSize:18,fontWeight:700}}>No reels yet</p>
        <button onClick={()=>setShowUpload(true)} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:24,padding:'12px 28px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer'}}>Post First Reel</button>
      </div>}

      {/* animated reel container */}
      {reels.length>0&&<div style={{...slideStyle,position:'absolute',inset:0}}>
        {isAdSlot&&currentAd?<>
          <video src={currentAd.video_url} style={{width:'100%',height:'100%',objectFit:'cover',background:'#000'}} loop playsInline autoPlay muted={false}/>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 50%)'}}/>
          <div style={{position:'absolute',bottom:100,left:16,right:80,color:'#fff'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#F7B731,#FF6B35)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:'#fff'}}>{currentAd.advertiser_name?.[0]||'A'}</div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <span style={{fontWeight:700,fontSize:15,textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>{currentAd.advertiser_name}</span>
                <span style={{background:'rgba(247,183,49,0.2)',border:'1px solid rgba(247,183,49,0.4)',borderRadius:6,padding:'1px 6px',fontSize:10,color:'#F7B731',fontWeight:700}}>Sponsored</span>
              </div>
            </div>
            {currentAd.content&&<p style={{fontSize:14,lineHeight:1.5,textShadow:'0 1px 4px rgba(0,0,0,0.8)',margin:0}}>{currentAd.content}</p>}
            {currentAd.link_url&&<button onClick={()=>window.open(currentAd.link_url.startsWith('http')?currentAd.link_url:'https://'+currentAd.link_url,'_blank')} style={{marginTop:10,background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:20,padding:'10px 20px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>Learn More</button>}
          </div>
        </>:reel?<>
          {/* dark background while buffering — no gray flash */}
          <div style={{position:'absolute',inset:0,background:'#000',zIndex:0}}/>
          {buffering&&<div style={{position:'absolute',inset:0,zIndex:2,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
            <div style={{width:48,height:48,borderRadius:'50%',border:'3px solid rgba(255,255,255,0.15)',borderTopColor:'#fff',animation:'spin 0.8s linear infinite'}}/>
          </div>}
          <video ref={videoRef} src={reel.video_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',zIndex:1,background:'#000'}}
            loop playsInline autoPlay muted={false}
            onWaiting={()=>setBuffering(true)}
            onPlaying={()=>setBuffering(false)}
            onCanPlay={()=>setBuffering(false)}
            onClick={()=>setPlaying(p=>!p)}/>
          {/* gradient overlay */}
          <div style={{position:'absolute',inset:0,zIndex:2,background:'linear-gradient(to top,rgba(0,0,0,0.75) 0%,transparent 45%)',pointerEvents:'none'}}/>
          {!playing&&<div style={{position:'absolute',inset:0,zIndex:3,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
            <div style={{width:72,height:72,borderRadius:'50%',background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>▶️</div>
          </div>}

          {/* author + caption */}
          <div style={{position:'absolute',bottom:showComments?'52%':110,left:16,right:80,color:'#fff',zIndex:4,transition:'bottom 0.3s'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,cursor:'pointer'}} onClick={()=>onUserClick(reel.author)}>
              <Avatar url={reel.author?.avatar_url} name={reel.author?.display_name} color={reel.author?.avatar_color||'#5B9CF6'} size={38}/>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  <span style={{fontWeight:700,fontSize:15,textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>{reel.author?.display_name}</span>
                  {reel.author?.verified&&<span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:16,height:16,borderRadius:'50%',background:'linear-gradient(135deg,#1a1a2e,#16213e)',border:'1.5px solid #C9A84C',flexShrink:0}}><img src="/flitters-logo-white.svg" alt="Verified" width={9} height={9} style={{objectFit:'contain',display:'block'}}/></span>}
                  {reel.author?.is_authentic&&<span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:16,height:16,borderRadius:'50%',background:'#1877F2',flexShrink:0}}><svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'><polyline points='2,6 5,9 10,3' fill='none' stroke='#fff' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/></svg></span>}
                </div>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.7)'}}>@{reel.author?.username}</div>
              </div>
            </div>
            {reel.caption&&<p style={{fontSize:14,lineHeight:1.5,textShadow:'0 1px 4px rgba(0,0,0,0.8)',margin:0}}>{reel.caption}</p>}
          </div>

          {/* action buttons */}
          <div style={{position:'absolute',bottom:130,right:12,display:'flex',flexDirection:'column',alignItems:'center',gap:22,zIndex:4}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,cursor:'pointer'}} onClick={()=>toggleLike(reel)}>
              <Heart size={28} fill={liked[reel.id]?'#FF4757':'none'} color={liked[reel.id]?'#FF4757':'currentColor'}/>
              <span style={{color:'#fff',fontSize:12,fontWeight:700,textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>{likes[reel.id]||0}</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,cursor:'pointer'}} onClick={()=>openComments(reel)}>
              <MessageCircle size={26}/>
              <span style={{color:'#fff',fontSize:12,fontWeight:700,textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>{commentCounts[reel.id]||0}</span>
            </div>
            {reel.user_id===currentUser.id&&<div style={{cursor:'pointer'}} onClick={()=>deleteReel(reel)}>
              <Trash2 size={24}/>
            </div>}
          </div>

          {currentIdx<reels.length-1&&<div style={{position:'absolute',bottom:20,left:'50%',transform:'translateX(-50%)',color:'rgba(255,255,255,0.35)',fontSize:11,zIndex:4,display:'flex',flexDirection:'column',alignItems:'center',gap:2,pointerEvents:'none'}}>
            <ArrowRight size={14} style={{transform:'rotate(-90deg)'}}/><span>swipe up</span>
          </div>}

          {/* comments panel */}
          {showComments&&<div className="sheet-in" style={{position:'absolute',bottom:0,left:0,right:0,height:'55%',background:'rgba(10,10,15,0.97)',borderRadius:'20px 20px 0 0',zIndex:10,display:'flex',flexDirection:'column'}}>
            <div style={{padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
              <span style={{fontWeight:700,fontSize:15,color:'#fff'}}>Comments</span>
              <button onClick={()=>setShowComments(false)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer',display:'flex'}}><X size={22}/></button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'12px 16px',display:'flex',flexDirection:'column',gap:12}}>
              {comments.length===0&&<p style={{color:'rgba(255,255,255,0.55)',textAlign:'center',marginTop:20,fontSize:14}}>No comments yet. Be first!</p>}
              {comments.map(c=>(
                <div key={c.id} style={{display:'flex',gap:10,alignItems:'flex-end'}}>
                  <div style={{cursor:'pointer',flexShrink:0}} onClick={()=>{ setShowComments(false); onUserClick(c.author) }}>
                    <Avatar url={c.author?.avatar_url} name={c.author?.display_name} color={c.author?.avatar_color||'#5B9CF6'} size={32}/>
                  </div>
                  <div style={{flex:1,maxWidth:'80%'}}>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.55)',marginBottom:3,paddingLeft:4}}>{c.author?.display_name}</div>
                    <div style={{background:'rgba(255,255,255,0.09)',borderRadius:'18px 18px 18px 4px',padding:'9px 14px',display:'inline-block',maxWidth:'100%'}}>
                      <span style={{fontSize:14,color:'rgba(255,255,255,0.92)',lineHeight:1.4}}>{c.content}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{padding:'10px 14px',borderTop:'1px solid rgba(255,255,255,0.1)',display:'flex',gap:10,alignItems:'center',paddingBottom:'env(safe-area-inset-bottom,10px)'}}>
              <Avatar url={currentUser?.avatar_url} name={currentUser?.display_name} color={currentUser?.avatar_color||'#5B9CF6'} size={32}/>
              <input value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&postComment(reel)} placeholder="Add a comment..." style={{flex:1,background:'rgba(255,255,255,0.08)',border:'none',borderRadius:20,padding:'10px 14px',color:'#fff',fontSize:14,outline:'none'}}/>
              <button onClick={()=>postComment(reel)} disabled={!commentText.trim()} style={{background:commentText.trim()?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.1)',border:'none',borderRadius:20,padding:'8px 16px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>Post</button>
            </div>
          </div>}
        </>:null}
      </div>}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function PulseTab({ currentUser, supabase, onUserClick, autoOpenGroup, onAutoOpenDone, onHideNav, pendingReelId, onReelsOpened, viewingGroupRef, reelsRef }) {
  const [groups, setGroups] = useState([])
  const [pulses, setPulses] = useState([])
  const [myPulse, setMyPulse] = useState([])
  const [viewingPulse, setViewingPulse] = useState(null)
  const [viewingGroup, setViewingGroup] = useState(null)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showCreatePulse, setShowCreatePulse] = useState(false)
  const [showReels, setShowReels] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [groupTag, setGroupTag] = useState('')
  const [joinMode, setJoinMode] = useState('open')
  const [groupSearch, setGroupSearch] = useState('')
  const [searchedGroups, setSearchedGroups] = useState([])
  const [pulseText, setPulseText] = useState('')
  const [pulseBg, setPulseBg] = useState('#5B9CF6')
  const [saving, setSaving] = useState(false)
  const COLORS = ['#5B9CF6','#845EF7','#FF6B35','#00C9A7','#FF4757','#F7B731','#FD79A8','#A29BFE']
  const [unreadGroups, setUnreadGroups] = useState({})

  const loadUnreadGroups = async (myGroupIds) => {
    if(!myGroupIds.length) { setUnreadGroups({}); return }
    const {data:mems} = await supabase.from('group_members').select('group_id,last_read_at').eq('user_id',currentUser.id).in('group_id',myGroupIds)
    if(!mems?.length) return
    const map = {}
    await Promise.all(mems.map(async m=>{
      const {count} = await supabase.from('group_messages').select('id',{count:'exact',head:true}).eq('group_id',m.group_id).neq('sender_id',currentUser.id).gt('created_at',m.last_read_at||'1970-01-01T00:00:00Z')
      if(count>0) map[m.group_id] = true
    }))
    setUnreadGroups(map)
  }

  useEffect(()=>{ loadAll() },[])
  useEffect(()=>{
    if(autoOpenGroup){setViewingGroup(autoOpenGroup);if(onAutoOpenDone)onAutoOpenDone()}
  },[autoOpenGroup])
  useEffect(()=>{
    if(pendingReelId){ setShowReels(true); onReelsOpened&&onReelsOpened() }
  },[pendingReelId])
  useEffect(()=>{
    onHideNav&&onHideNav(!!(viewingGroup||viewingPulse||showCreatePulse||showCreateGroup))
  },[viewingGroup,viewingPulse,showCreatePulse,showCreateGroup])

  const loadAll = async () => {
    const [{data:g},{data:p},{data:mp}] = await Promise.all([
      supabase.from('groups').select('*,group_members(user_id)').order('created_at',{ascending:false}),
      supabase.from('pulses').select('*,author:profiles(id,display_name,username,avatar_url,avatar_color)').order('created_at',{ascending:false}),
      supabase.from('pulses').select('*,author:profiles(id,display_name,username,avatar_url,avatar_color)').eq('user_id',currentUser.id).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false})
    ])
    setGroups(g||[])
    setPulses((p||[]).filter(x=>x.user_id!==currentUser.id))
    setMyPulse(mp||[])
    const myIds = (g||[]).filter(x=>x.group_members?.some(m=>m.user_id===currentUser.id)).map(x=>x.id)
    loadUnreadGroups(myIds)
  }

  const searchGroups = async (q) => {
    setGroupSearch(q)
    if(!q.trim()){setSearchedGroups([]);return}
    const {data} = await supabase.from('groups').select('*,group_members(user_id)').ilike('tag',q.trim().toLowerCase()+'%').limit(10)
    setSearchedGroups(data||[])
  }

  const joinGroupByTag = async (group) => {
    const isMember = group.group_members?.some(m=>m.user_id===currentUser.id)
    if(isMember){setViewingGroup(group);return}
    if(group.join_mode==='open'){
      await supabase.from('group_members').insert({group_id:group.id,user_id:currentUser.id})
      setViewingGroup({...group,group_members:[...(group.group_members||[]),{user_id:currentUser.id}]})
    } else {
      const {error} = await supabase.from('group_join_requests').insert({group_id:group.id,user_id:currentUser.id})
      if(!error) alert('Join request sent! Waiting for admin approval.')
      else alert('Request already sent or you are already a member.')
    }
    loadAll()
  }

  const createGroup = async () => {
    if(!groupName.trim()) return
    setSaving(true)
    const tag = groupTag.trim().toLowerCase().replace(/[^a-z0-9_]/g,'')
    if(!tag){setSaving(false);alert('Please enter a valid group tag');return}
    const {data} = await supabase.from('groups').insert({name:groupName.trim(),description:groupDesc.trim(),creator_id:currentUser.id,cover_color:pulseBg,tag,join_mode:joinMode}).select().single()
    if(data) {
      await supabase.from('group_members').insert({group_id:data.id,user_id:currentUser.id})
      setGroups(g=>[{...data,group_members:[{user_id:currentUser.id}]},...g])
      setGroupName(''); setGroupDesc(''); setGroupTag(''); setJoinMode('open'); setShowCreateGroup(false)
    }
    setSaving(false)
  }

  const createPulse = async () => {
    if(!pulseText.trim()) return
    setSaving(true)
    const {data} = await supabase.from('pulses').insert({user_id:currentUser.id,content:pulseText.trim(),bg_color:pulseBg}).select('*,author:profiles(id,display_name,username,avatar_url,avatar_color)').single()
    if(data) { setMyPulse(prev=>[data,...(Array.isArray(prev)?prev:[])].filter(Boolean)); setPulseText(''); setShowCreatePulse(false) }
    setSaving(false)
  }

  const joinGroup = async (group) => {
    const isMember = group.group_members?.some(m=>m.user_id===currentUser.id)
    if(isMember) { setViewingGroup(group); return }
    await supabase.from('group_members').insert({group_id:group.id,user_id:currentUser.id})
    setGroups(g=>g.map(x=>x.id===group.id?{...x,group_members:[...(x.group_members||[]),{user_id:currentUser.id}]}:x))
    setViewingGroup({...group,group_members:[...(group.group_members||[]),{user_id:currentUser.id}]})
  }

  if(showReels){
    if(reelsRef) reelsRef.current = {closeReels:()=>{setShowReels(false);onHideNav&&onHideNav(false)}}
    return <ReelsView currentUser={currentUser} supabase={supabase} onUserClick={onUserClick} initialReelId={pendingReelId} onClose={()=>{setShowReels(false);onHideNav&&onHideNav(false);if(reelsRef)reelsRef.current=null}}/>
  }
  if(reelsRef) reelsRef.current = null

  if(viewingPulse) {
    const allPulses=[...(Array.isArray(myPulse)?myPulse:[]),...pulses]
    const currentIdx=allPulses.findIndex(p=>p.id===viewingPulse.id)
    const goNext=()=>{ if(currentIdx<allPulses.length-1)setViewingPulse(allPulses[currentIdx+1]); else{setViewingPulse(null);onHideNav&&onHideNav(false)} }
    const goPrev=()=>{ if(currentIdx>0)setViewingPulse(allPulses[currentIdx-1]) }
  return (
    <div style={{position:'fixed',inset:0,zIndex:300,background:viewingPulse.bg_color||'#090B10',display:'flex',flexDirection:'column'}}>
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
        <button onClick={()=>{setViewingPulse(null);onHideNav&&onHideNav(false)}} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',display:'flex'}}><X size={24}/></button>
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

  if(viewingGroup) {
    // register closeGC callback for back button handler
    if(viewingGroupRef) viewingGroupRef.current = {closeGC:()=>{ setViewingGroup(null); onHideNav&&onHideNav(false); loadAll() }}
    return <GroupChat group={viewingGroup} currentUser={currentUser} supabase={supabase} onBack={()=>{setViewingGroup(null);if(viewingGroupRef)viewingGroupRef.current=null;onHideNav&&onHideNav(false);loadAll()}} onUserClick={onUserClick}/>
  }
  // clear viewingGroupRef when no group open
  if(viewingGroupRef) viewingGroupRef.current = null

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

  if(showCreateGroup) return (
    <div className="screen-in" style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setShowCreateGroup(false)} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',display:'flex'}}><X size={24}/></button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>Create Group</span>
        <button onClick={createGroup} disabled={saving||!groupName.trim()} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:20,padding:'8px 20px',color:'var(--text-primary)',fontWeight:700,cursor:'pointer'}}>{saving?'Creating...':'Create'}</button>
      </div>
      <div style={{padding:16}}>
        <div style={{width:72,height:72,borderRadius:20,background:pulseBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,fontWeight:800,color:'var(--text-primary)',margin:'16px auto 24px'}}>{groupName[0]||'G'}</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center',marginBottom:24}}>
          {COLORS.map(c=><div key={c} onClick={()=>setPulseBg(c)} style={{width:28,height:28,borderRadius:'50%',background:c,border:pulseBg===c?'3px solid #fff':'3px solid transparent',cursor:'pointer'}}/>)}
        </div>
        <input value={groupName} onChange={e=>setGroupName(e.target.value)} placeholder="Group name" style={{width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none',boxSizing:'border-box',marginBottom:12}}/>
        <div style={{position:'relative',marginBottom:12}}>
          <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)',fontSize:15}}>@</span>
          <input value={groupTag} onChange={e=>setGroupTag(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} placeholder="group_tag (unique)" style={{width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px 12px 28px',color:'var(--text-primary)',fontSize:15,outline:'none',boxSizing:'border-box'}}/>
        </div>
        <textarea value={groupDesc} onChange={e=>setGroupDesc(e.target.value)} placeholder="Description (optional)" rows={2} style={{width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none',resize:'none',fontFamily:'sans-serif',boxSizing:'border-box',marginBottom:12}}/>
        <div style={{marginBottom:8}}>
          <p style={{color:'var(--text-tertiary)',fontSize:13,marginBottom:8}}>Who can join?</p>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setJoinMode('open')} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid '+(joinMode==='open'?'#5B9CF6':'var(--bg-card-2)'),background:joinMode==='open'?'rgba(91,156,246,0.15)':'transparent',color:joinMode==='open'?'#5B9CF6':'#888',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Globe size={15}/> Anyone</button>
            <button onClick={()=>setJoinMode('request')} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid '+(joinMode==='request'?'#845EF7':'var(--bg-card-2)'),background:joinMode==='request'?'rgba(132,94,247,0.15)':'transparent',color:joinMode==='request'?'#845EF7':'#888',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Lock size={15}/> Request</button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{paddingBottom:20}}>
      <div style={{padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontWeight:800,fontSize:18,display:'inline-flex',alignItems:'center',gap:6}}>Pulse <Zap size={16}/></span>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>{setShowReels(true);onHideNav&&onHideNav(true)}} style={{background:'rgba(255,71,87,0.1)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:12,padding:'6px 14px',color:'#FF4757',cursor:'pointer',fontWeight:700,fontSize:13,display:'inline-flex',alignItems:'center',gap:6}}><Clapperboard size={14}/> Reels</button>
          <button onClick={()=>setShowCreateGroup(true)} style={{background:'rgba(91,156,246,0.1)',border:'1px solid rgba(91,156,246,0.2)',borderRadius:12,padding:'6px 14px',color:'#5B9CF6',cursor:'pointer',fontWeight:700,fontSize:13}}>+ Group</button>
        </div>
      </div>
      <div style={{padding:'0 16px 12px'}}>
        <input value={groupSearch} onChange={e=>searchGroups(e.target.value)} placeholder="Search group by @tag..." style={{width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:24,padding:'10px 16px',color:'var(--text-primary)',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
        {searchedGroups.length>0&&<div style={{marginTop:8,borderRadius:12,overflow:'hidden',border:'1px solid var(--bg-card-6)'}}>
          {searchedGroups.map(g=>{
            const isMember = g.group_members?.some(m=>m.user_id===currentUser.id)
            return(
              <div key={g.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderBottom:'1px solid var(--bg-card-4)',background:'var(--bg-card-4)'}}>
                <div style={{width:42,height:42,borderRadius:12,background:g.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:'var(--text-primary)',flexShrink:0}}>{g.name[0]}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:15,color:'var(--text-primary)'}}>{g.name}</div>
                  <div style={{color:'var(--text-secondary)',fontSize:12,display:'flex',alignItems:'center',gap:4}}>@{g.tag} · {g.group_members?.length||0} members · {g.join_mode==='open'?<><Globe size={12}/> Open</>:<><Lock size={12}/> Request</>}</div>
                </div>
                <button onClick={()=>joinGroupByTag(g)} style={{background:isMember?'var(--bg-card)':'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:16,padding:'8px 14px',color:'var(--text-primary)',fontWeight:700,fontSize:13,cursor:'pointer'}}>{isMember?'Open':'Join'}</button>
              </div>
            )
          })}
        </div>}
        {groupSearch&&searchedGroups.length===0&&<p style={{color:'var(--text-quaternary)',fontSize:13,padding:'8px 4px'}}>No groups found for "@{groupSearch}"</p>}
      </div>

      {groups.filter(g=>g.group_members?.some(m=>m.user_id===currentUser.id)).length>0&&<>
        <p style={{padding:'0 16px 8px',color:'var(--text-secondary)',fontSize:13,fontWeight:600}}>MY GROUPS</p>
        <div style={{display:'flex',gap:12,padding:'0 16px 16px',overflowX:'auto',scrollbarWidth:'none'}}>
          {groups.filter(g=>g.group_members?.some(m=>m.user_id===currentUser.id)).map(g=>(
            <div key={g.id} onClick={()=>setViewingGroup(g)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,cursor:'pointer',flexShrink:0}}>
              <div style={{position:'relative'}}>
                <div style={{width:60,height:60,borderRadius:18,background:g.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:800,color:'var(--text-primary)',border:'2px solid #5B9CF6',overflow:'hidden'}}>
                {g.avatar_url?<img src={g.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" loading="lazy"/>:g.name[0]}
              </div>
                {unreadGroups[g.id]&&<span style={{position:'absolute',top:-2,right:-2,width:14,height:14,borderRadius:'50%',background:'#FF4757',border:'2px solid #090B10'}}/>}
              </div>
              <span style={{color:'var(--text-subtle)',fontSize:11,maxWidth:60,textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.name}</span>
            </div>
          ))}
        </div>
      </>}

      <p style={{padding:'0 16px 8px',color:'var(--text-secondary)',fontSize:13,fontWeight:600}}>PULSES</p>
      <div style={{display:'flex',gap:12,padding:'0 16px 20px',overflowX:'auto',scrollbarWidth:'none'}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flexShrink:0}}>
          <div onClick={()=>setShowCreatePulse(true)} style={{width:64,height:64,borderRadius:'50%',background:'var(--bg-card)',border:'2px dashed #5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,color:'#5B9CF6',cursor:'pointer'}}>＋</div>
          <span style={{color:'var(--text-subtle)',fontSize:11}}>Add Pulse</span>
        </div>
        {(Array.isArray(myPulse)?myPulse:[]).map(mp=>(
          <div key={mp.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flexShrink:0,position:'relative'}}>
            <div onClick={()=>setViewingPulse({...mp,author:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}})} style={{width:64,height:64,borderRadius:'50%',background:mp.bg_color||'#5B9CF6',border:'3px solid #00C9A7',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-primary)',cursor:'pointer'}}><Zap size={22}/></div>
            <button onClick={async(e)=>{e.stopPropagation();await supabase.from('pulses').delete().eq('id',mp.id);setMyPulse(prev=>prev.filter(p=>p.id!==mp.id))}} style={{position:'absolute',top:-4,right:-4,width:20,height:20,borderRadius:'50%',background:'#FF4757',border:'none',color:'var(--text-primary)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={12}/></button>
            <span style={{color:'var(--text-subtle)',fontSize:11}}>My Pulse</span>
          </div>
        ))}
        {pulses.map(p=>(
          <div key={p.id} onClick={()=>setViewingPulse(p)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,cursor:'pointer',flexShrink:0}}>
            <div style={{width:64,height:64,borderRadius:'50%',background:p.bg_color||'#5B9CF6',border:'3px solid #845EF7',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
              {p.author?.avatar_url?<img src={p.author.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" loading="lazy"/>:<span style={{color:'var(--text-primary)',fontWeight:800,fontSize:20}}>{p.author?.display_name?.[0]}</span>}
            </div>
            <span style={{color:'var(--text-subtle)',fontSize:11,maxWidth:64,textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.author?.display_name}</span>
          </div>
        ))}
        {pulses.length===0&&<p style={{color:'var(--text-quaternary)',fontSize:14,padding:'20px 0'}}>No pulses yet</p>}
      </div>
    </div>
  )
}

function FlittersAI({ currentUser, onClose }) {
  const STORAGE_KEY = 'flittersai_history_'+(currentUser?.id||'guest')
  const defaultMsg = [{role:'assistant',content:'Hey ' + (currentUser?.display_name?.split(' ')[0]||'there') + '! I\'m Flitters AI. How can I help you today?'}]
  const [messages, setMessages] = useState(()=>{
    try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved) : defaultMsg } catch(e) { return defaultMsg }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [genImg, setGenImg] = useState('')
  const [imgPrompt, setImgPrompt] = useState('')
  const [generatingImg, setGeneratingImg] = useState(false)
  const [showImgGen, setShowImgGen] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [deepThink, setDeepThink] = useState(false)
  const bottomRef = useRef(null)
  const AI_GRADIENT = 'linear-gradient(135deg,#22D3EE,#A855F7,#EC4899)'

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])
  useEffect(()=>{ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)) } catch(e){} },[messages])

  const clearHistory = () => { try { localStorage.removeItem(STORAGE_KEY) } catch(e){} ; setMessages(defaultMsg) }

  const generateImage = async() => {
    if(!imgPrompt.trim()) return
    setGeneratingImg(true)
    setGenImg(null)
    try {
      const res = await fetch('/api/flittersai-image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:imgPrompt})})
      const data = await res.json()
      if(data.image) setGenImg(data.image)
      else alert(data.error||'Generation failed, try again')
    } catch(e) { alert('Error: '+e.message) }
    setGeneratingImg(false)
  }

  const send = async() => {
    if(!input.trim()||loading) return
    const userMsg = {role:'user',content:input.trim()}
    setMessages(prev=>[...prev,userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/flittersai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[...messages,userMsg].filter(m=>m.role!=='system'),deepThink})})
      if(!res.body) throw new Error('No response stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let started = false
      while(true) {
        const {done, value} = await reader.read()
        if(done) break
        fullText += decoder.decode(value, {stream:true})
        if(!started) {
          started = true
          setLoading(false)
          setMessages(prev=>[...prev,{role:'assistant',content:fullText}])
        } else {
          setMessages(prev=>{
            const copy=[...prev]
            copy[copy.length-1] = {role:'assistant',content:fullText}
            return copy
          })
        }
      }
      if(!started) setMessages(prev=>[...prev,{role:'assistant',content:fullText||'Sorry, I am having trouble connecting. Please try again.'}])
    } catch(e) {
      setMessages(prev=>[...prev,{role:'assistant',content:'Sorry, I am having trouble connecting. Please try again.'}])
    }
    setLoading(false)
  }

  return (
    <div className="screen-in-safe" style={{position:'fixed',inset:0,zIndex:500,background:'var(--bg-app)',color:'var(--text-primary)',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border-color)',display:'flex',alignItems:'center',gap:12,background:'rgba(9,11,16,0.98)'}}>
        <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-tertiary)',cursor:'pointer',fontSize:24}}>‹</button>
        <img src="/flitters-ai-icon.png" alt="Flitters AI" style={{width:38,height:38,objectFit:'contain'}} loading="lazy"/>
        <div onClick={()=>setShowAbout(true)} style={{cursor:'pointer'}}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div style={{fontWeight:800,fontSize:16,background:AI_GRADIENT,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Flitters AI</div>
            {deepThink&&<span style={{fontSize:10,background:AI_GRADIENT,color:'var(--text-primary)',borderRadius:6,padding:'1px 6px',fontWeight:700}}>DEEP THINK</span>}
          </div>
          <div style={{color:'#00C9A7',fontSize:11}}>● Always online</div>
        </div>
        <button onClick={()=>setDeepThink(d=>!d)} title="Toggle deep thinking mode" style={{marginLeft:'auto',background:deepThink?AI_GRADIENT:'var(--bg-card)',border:'none',borderRadius:14,padding:'6px 12px',color:'var(--text-primary)',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
          <Brain size={14}/> {deepThink?'Deep':'Fast'}
        </button>
        <button onClick={clearHistory} style={{background:'rgba(255,71,87,0.1)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:14,padding:'6px 10px',color:'#FF4757',fontWeight:700,cursor:'pointer',display:'flex'}}><Trash2 size={14}/></button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'16px 14px',display:'flex',flexDirection:'column',gap:12,paddingBottom:80}}>
        {messages.map((msg,i)=>(
          <div key={i} style={{display:'flex',justifyContent:msg.role==='user'?'flex-end':'flex-start',gap:8,alignItems:'flex-end'}}>
            {msg.role==='assistant'&&<img src="/flitters-ai-icon.png" alt="" style={{width:28,height:28,objectFit:'contain',flexShrink:0}} loading="lazy"/>}
            <div style={{maxWidth:'80%',padding:'11px 15px',borderRadius:msg.role==='user'?'20px 20px 5px 20px':'20px 20px 20px 5px',background:msg.role==='user'?AI_GRADIENT:'var(--bg-card-6)',color:'var(--text-primary)',fontSize:15,lineHeight:1.6,wordBreak:'break-word',whiteSpace:'pre-wrap'}}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading&&<div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
          <img src="/flitters-ai-icon.png" alt="" style={{width:28,height:28,objectFit:'contain'}} loading="lazy"/>
          <div style={{padding:'11px 15px',borderRadius:'20px 20px 20px 5px',background:'var(--bg-card-6)',color:'var(--text-tertiary)',fontSize:15}}>{deepThink?'Thinking deeply...':'Thinking...'}</div>
        </div>}
        <div ref={bottomRef}/>
      </div>

      {showAbout&&<div className="backdrop-in" onClick={()=>setShowAbout(false)} style={{position:'fixed',inset:0,zIndex:20,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
        <div className="sheet-in" onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:380,background:'#12141c',borderRadius:20,padding:'28px 24px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
          <img src="/flitters-ai-logo.png" alt="Flitters AI" style={{width:160,objectFit:'contain',marginBottom:6}} loading="lazy"/>
          <p style={{color:'var(--text-tertiary)',fontSize:13,lineHeight:1.7,marginTop:8}}>
            Flitters AI is built and maintained by <strong style={{color:'var(--text-primary)'}}>Flitters Labs Corp</strong>.
          </p>
          <p style={{color:'var(--text-tertiary)',fontSize:13,lineHeight:1.7}}>
            Founded by <strong style={{color:'var(--text-primary)'}}>Dara Samuel</strong>, popularly known as <strong style={{color:'var(--text-primary)'}}>Samzy Bankz</strong>, with support from <strong style={{color:'var(--text-primary)'}}>Beauty</strong>.
          </p>
          <p style={{color:'var(--text-tertiary)',fontSize:13,lineHeight:1.7}}>
            Logo design by <strong style={{color:'var(--text-primary)'}}>Artist Bigkizz</strong>.
          </p>
          <button onClick={()=>setShowAbout(false)} style={{marginTop:14,background:AI_GRADIENT,border:'none',borderRadius:14,padding:'10px 24px',color:'var(--text-primary)',fontWeight:700,fontSize:14,cursor:'pointer'}}>Close</button>
        </div>
      </div>}

      {showImgGen&&<div className="backdrop-in" style={{position:'fixed',inset:0,zIndex:10,background:'rgba(0,0,0,0.85)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,gap:12}}>
        <div className="sheet-in" style={{width:'100%',maxWidth:400,background:'#1a1d26',borderRadius:20,padding:20,display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontWeight:700,fontSize:17,color:'var(--text-primary)',display:'inline-flex',alignItems:'center',gap:8}}><Palette size={17}/> Image Generator</span>
            <button onClick={()=>{setShowImgGen(false);setGenImg('')}} style={{background:'none',border:'none',color:'var(--text-tertiary)',cursor:'pointer',display:'flex'}}><X size={22}/></button>
          </div>
          <input value={imgPrompt} onChange={e=>setImgPrompt(e.target.value)} placeholder="Describe the image..." style={{background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none'}}/>
          <button onClick={generateImage} disabled={generatingImg||!imgPrompt.trim()} style={{background:AI_GRADIENT,border:'none',borderRadius:12,padding:'12px',color:'var(--text-primary)',fontWeight:700,fontSize:15,cursor:'pointer'}}>{generatingImg?'Generating...':'Generate Image'}</button>
          {genImg&&<img src={genImg} style={{width:'100%',borderRadius:12,marginTop:4}} alt="generated" loading="lazy"/>}
          {genImg&&<button onClick={()=>{
            const a=document.createElement('a')
            a.href=genImg
            a.download='flitters-ai-image-'+Date.now()+'.jpg'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
          }} style={{background:'var(--bg-card)',border:'none',borderRadius:12,padding:'10px',color:'var(--text-primary)',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Save size={15}/> Save Image</button>}
        </div>
      </div>}
      <div style={{position:'fixed',bottom:0,left:0,right:0,maxWidth:600,margin:'0 auto',padding:'10px 14px 24px',background:'var(--bg-app)',borderTop:'1px solid var(--border-color)',display:'flex',gap:10,alignItems:'center'}}>
        <button onClick={()=>setShowImgGen(true)} style={{width:40,height:40,borderRadius:'50%',background:'var(--bg-card)',border:'none',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><Palette size={18}/></button>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask Flitters AI anything..." style={{flex:1,background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:26,padding:'12px 18px',color:'var(--text-primary)',fontSize:15,outline:'none',fontFamily:'sans-serif'}}/>
        <button onClick={send} disabled={!input.trim()||loading} style={{width:46,height:46,borderRadius:'50%',background:input.trim()&&!loading?AI_GRADIENT:'var(--bg-card-3)',border:'none',cursor:input.trim()&&!loading?'pointer':'not-allowed',color:input.trim()&&!loading?'#fff':'#333',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><Send size={19}/></button>
      </div>
    </div>
  )
}

function AdminPanel({ currentUser, supabase, onBack }) {
  const [ads, setAds] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [advertiserName, setAdvertiserName] = useState('')
  const [content, setContent] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [adType, setAdType] = useState('post')
  const [mediaFile, setMediaFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  useEffect(()=>{ loadAds() },[])

  const loadAds = async() => {
    const {data} = await supabase.from('ads').select('*').order('created_at',{ascending:false})
    setAds(data||[])
  }

  const createAd = async() => {
    if(!advertiserName.trim()) { alert('Advertiser name required'); return }
    setSaving(true)
    let imageUrl = null, videoUrl = null
    if(mediaFile) {
      const ext = mediaFile.name.split('.').pop()
      const path = 'ads/'+Date.now()+'.'+ext
      const {error} = await supabase.storage.from('avatars').upload(path,mediaFile,{upsert:false,contentType:mediaFile.type})
      if(error) { alert('Upload failed: '+error.message); setSaving(false); return }
      const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
      if(adType==='reel') videoUrl = urlData.publicUrl
      else imageUrl = urlData.publicUrl
    }
    const {error} = await supabase.from('ads').insert({
      advertiser_name: advertiserName.trim(),
      content: content.trim(),
      image_url: imageUrl,
      video_url: videoUrl,
      link_url: linkUrl.trim()||null,
      type: adType,
      active: true
    })
    if(error) alert('Error: '+error.message)
    else {
      setAdvertiserName(''); setContent(''); setLinkUrl(''); setMediaFile(null); setShowForm(false)
      loadAds()
    }
    setSaving(false)
  }

  const toggleActive = async(ad) => {
    await supabase.from('ads').update({active:!ad.active}).eq('id',ad.id)
    setAds(prev=>prev.map(a=>a.id===ad.id?{...a,active:!a.active}:a))
  }

  const deleteAd = async(ad) => {
    if(!window.confirm('Delete this ad?')) return
    await supabase.from('ads').delete().eq('id',ad.id)
    setAds(prev=>prev.filter(a=>a.id!==ad.id))
  }

  if(showForm) return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setShowForm(false)} style={{background:'none',border:'none',color:'var(--text-primary)',fontSize:24,cursor:'pointer'}}>‹</button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>New Ad</span>
        <button onClick={createAd} disabled={saving} style={{background:'linear-gradient(135deg,#F7B731,#FF6B35)',border:'none',borderRadius:20,padding:'8px 18px',color:'var(--text-primary)',fontWeight:700,cursor:'pointer'}}>{saving?'Saving...':'Create'}</button>
      </div>
      <div style={{padding:20,display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setAdType('post')} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid '+(adType==='post'?'#F7B731':'var(--bg-card-2)'),background:adType==='post'?'rgba(247,183,49,0.15)':'transparent',color:adType==='post'?'#F7B731':'#888',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><FileText size={15}/> Feed Post</button>
          <button onClick={()=>setAdType('reel')} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid '+(adType==='reel'?'#F7B731':'var(--bg-card-2)'),background:adType==='reel'?'rgba(247,183,49,0.15)':'transparent',color:adType==='reel'?'#F7B731':'#888',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Clapperboard size={15}/> Reel Video</button>
        </div>
        <input value={advertiserName} onChange={e=>setAdvertiserName(e.target.value)} placeholder="Advertiser/Brand name" style={{background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none'}}/>
        <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Ad text/caption" rows={3} style={{background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none',resize:'none',fontFamily:'sans-serif'}}/>
        <input value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} placeholder="Link URL (optional)" style={{background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none'}}/>
        <div onClick={()=>fileRef.current?.click()} style={{height:120,background:'var(--bg-card-4)',border:'2px dashed rgba(255,255,255,0.15)',borderRadius:16,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',gap:6}}>
          {mediaFile?<span style={{color:'#00C9A7',fontSize:13}}>{mediaFile.name}</span>:<>{adType==='reel'?<Video size={26}/>:<ImageIcon size={26}/>}<span style={{color:'var(--text-secondary)',fontSize:13}}>Tap to select {adType==='reel'?'video':'image'} (optional)</span></>}
        </div>
        <input ref={fileRef} type="file" accept={adType==='reel'?'video/*':'image/*'} onChange={e=>setMediaFile(e.target.files[0])} style={{display:'none'}}/>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'var(--text-primary)',fontSize:24,cursor:'pointer'}}>‹</button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>Ad Manager</span>
        <button onClick={()=>setShowForm(true)} style={{background:'linear-gradient(135deg,#F7B731,#FF6B35)',border:'none',borderRadius:20,padding:'8px 16px',color:'var(--text-primary)',fontWeight:700,fontSize:13,cursor:'pointer'}}>+ New</button>
      </div>
      {ads.length===0&&<div style={{padding:'60px 20px',textAlign:'center'}}><div style={{display:'flex',justifyContent:'center',color:'var(--text-quaternary)'}}><Megaphone size={44}/></div><p style={{color:'var(--text-secondary)',marginTop:8}}>No ads yet</p></div>}
      {ads.map(ad=>(
        <div key={ad.id} style={{padding:'14px 16px',borderBottom:'1px solid var(--border-color)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
            <div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontWeight:700,fontSize:15}}>{ad.advertiser_name}</span>
                <span style={{background:ad.type==='reel'?'rgba(255,71,87,0.15)':'rgba(91,156,246,0.15)',borderRadius:6,padding:'1px 6px',fontSize:10,color:ad.type==='reel'?'#FF4757':'#5B9CF6',fontWeight:700,display:'inline-flex',alignItems:'center',gap:3}}>{ad.type==='reel'?<><Clapperboard size={10}/> REEL</>:<><FileText size={10}/> POST</>}</span>
              </div>
              <span style={{color:ad.active?'#00C9A7':'#555',fontSize:12}}>{ad.active?'● Active':'○ Inactive'}</span>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>toggleActive(ad)} style={{background:'var(--bg-card)',border:'none',borderRadius:10,padding:'6px 12px',color:'var(--text-primary)',fontSize:12,cursor:'pointer'}}>{ad.active?'Pause':'Activate'}</button>
              <button onClick={()=>deleteAd(ad)} style={{background:'rgba(255,71,87,0.1)',border:'none',borderRadius:10,padding:'6px 12px',color:'#FF4757',fontSize:12,cursor:'pointer'}}>Delete</button>
            </div>
          </div>
          {ad.content&&<p style={{color:'var(--text-subtle)',fontSize:13,margin:0}}>{ad.content}</p>}
        </div>
      ))}
    </div>
  )
}

function FlittersAppInner({ currentUser }) {
  const { theme } = useTheme()
  const [ads, setAds] = useState([])
  const [showAdmin, setShowAdmin] = useState(false)
  const ADMIN_ID = 'b29fa752-34f5-4a3e-a3e7-8178c2b176ae'

  // URL-based navigation
  const getHashTab = () => {
    const h = window.location.hash.replace('#','')
    return ['home','messages','pulse','people','notifications'].includes(h) ? h : 'home'
  }
  const [tab, setTab] = useState(getHashTab)
  const setTabWithHash = (t) => {
    window.location.hash = t
    setTab(t)
    if(t==='messages') setDmView('list')
  }
  const [autoOpenGroup, setAutoOpenGroup] = useState(null)
  const [pendingReelId, setPendingReelId] = useState(null)
  const [feedTab, setFeedTab] = useState('foryou')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [composeText, setComposeText] = useState('')
  const [composeImage, setComposeImage] = useState(null)
  const [composeImageUrl, setComposeImageUrl] = useState(null)
  const composeImgRef = useRef(null)
  const [conversations, setConversations] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [msgText, setMsgText] = useState('')
  const [dmView, setDmView] = useState('list')
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [followed, setFollowed] = useState({})
  const [friendsSubTab, setFriendsSubTab] = useState('friends')
  const [selectedDMMsg, setSelectedDMMsg] = useState(null)
  const [editingDMMsg, setEditingDMMsg] = useState(null)
  const [editDMText, setEditDMText] = useState('')
  const [dmReplyTo, setDmReplyTo] = useState(null)
  const [dmReplyToId, setDmReplyToId] = useState(null)
  const [dmHighlightMsgId, setDmHighlightMsgId] = useState(null)
  const dmHighlightTimer = useRef(null)
  const scrollToDMMessage = (id) => {
    if(!id) return
    document.getElementById('dmmsg-'+id)?.scrollIntoView({behavior:'smooth',block:'center'})
    setDmHighlightMsgId(id)
    clearTimeout(dmHighlightTimer.current)
    dmHighlightTimer.current = setTimeout(()=>setDmHighlightMsgId(null),1200)
  }
  const dmLongPressTimer = useRef(null)
  const selectedConvRef = useRef(null)
  useEffect(()=>{ selectedConvRef.current = selectedConv },[selectedConv])
  const dmImgRef = useRef(null)
  const dmChannelRef = useRef(null)
  const dmTypingTimeoutRef = useRef(null)
  const dmMyTypingThrottle = useRef(0)
  const [otherTyping, setOtherTyping] = useState(false)
  const sendDMTyping = () => {
    const now = Date.now()
    if(now - dmMyTypingThrottle.current < 2000) return
    dmMyTypingThrottle.current = now
    dmChannelRef.current?.send({type:'broadcast',event:'typing',payload:{user_id:currentUser.id}})
  }
  const [sendingDMImg, setSendingDMImg] = useState(false)
  const [showDMStickerTray, setShowDMStickerTray] = useState(false)
  const [fullscreenImg, setFullscreenImg] = useState(null)
  const [unreadDM, setUnreadDM] = useState(0)
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [unreadGC, setUnreadGC] = useState(false)

  const loadUnreadCounts = async () => {
    try {
      const {data:parts} = await supabase.from('conversation_participants').select('conversation_id,last_read_at').eq('user_id',currentUser.id)
      if(parts?.length){
        let dmCount = 0
        await Promise.all(parts.map(async p=>{
          const {count:c} = await supabase.from('messages').select('id',{count:'exact',head:true}).eq('conversation_id',p.conversation_id).neq('sender_id',currentUser.id).gt('created_at',p.last_read_at||'1970-01-01T00:00:00Z')
          if(c>0) dmCount++
        }))
        setUnreadDM(dmCount)
      } else setUnreadDM(0)

      const {count:nc} = await supabase.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',currentUser.id).eq('read',false)
      setUnreadNotifs(nc||0)

      const {data:mems} = await supabase.from('group_members').select('group_id,last_read_at').eq('user_id',currentUser.id)
      if(mems?.length){
        let hasUnread = false
        for(const m of mems){
          const {count:gc} = await supabase.from('group_messages').select('id',{count:'exact',head:true}).eq('group_id',m.group_id).neq('sender_id',currentUser.id).gt('created_at',m.last_read_at||'1970-01-01T00:00:00Z')
          if(gc>0){ hasUnread=true; break }
        }
        setUnreadGC(hasUnread)
      } else setUnreadGC(false)
    } catch(e) { /* tables may not have these columns yet */ }
  }

  useEffect(()=>{
    loadUnreadCounts()
    const interval = setInterval(loadUnreadCounts, 15000)
    return ()=>clearInterval(interval)
  },[])
  useEffect(()=>{ loadUnreadCounts() },[tab])
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search)
    const gid = params.get('opengroup')
    if(gid){
      supabase.from('groups').select('*,group_members(user_id)').eq('id',gid).single().then(({data})=>{
        if(data){setTabWithHash('pulse');setAutoOpenGroup(data)}
      })
      window.history.replaceState({},'',window.location.pathname)
    }
    const pid = params.get('openpost')
    if(pid){
      openPost(pid)
      window.history.replaceState({},'',window.location.pathname)
    }
  },[])
  const [people, setPeople] = useState([])
  const [notifs, setNotifs] = useState([])
  const [viewingUser, setViewingUser] = useState(null)
  const [viewingPost, setViewingPost] = useState(null)
  const openPost = async(postId) => {
    const {data} = await supabase.from('posts').select('*,author:profiles(*),likes(user_id),reposts(user_id),comments(id)').eq('id',postId).single()
    if(data) setViewingPost({...data,user_liked:data.likes?.some(l=>l.user_id===currentUser.id),user_reposted:data.reposts?.some(r=>r.user_id===currentUser.id),likes_count:data.likes?.length||0,reposts_count:data.reposts?.length||0,comments_count:data.comments?.length||0})
    setHideNav(true)
  }
  const closePost = () => { setViewingPost(null); setHideNav(false) }
  const [showMyProfile, setShowMyProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url||'')
  const color = currentUser?.avatar_color||'#5B9CF6'
  const inp = {width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none',fontFamily:'sans-serif',boxSizing:'border-box'}
  const handleSignOut = async() => { await supabase.auth.signOut(); window.location.href='/auth' }

  useEffect(()=>{
    supabase.from('ads').select('*').eq('active',true).eq('type','post').order('created_at',{ascending:false}).then(({data})=>setAds(data||[]))
  },[])
  const [navVisible, setNavVisible] = useState(true)
  const [hideNav, setHideNav] = useState(false)
  const OMNICORE_ID = 'omnicore-ai'
  const OMNICORE_PROFILE = {id:'omnicore-ai',display_name:'Flitters AI',username:'flittersai',avatar_color:'#A855F7',avatar_url:'/flitters-ai-icon.png',is_ai:true}
  const [onlineUsers, setOnlineUsers] = useState({})
  const stateRef = useRef({})
  const viewingGroupRef = useRef(null)
  const reelsRef = useRef(null)
  useEffect(()=>{
    stateRef.current = {viewingUser,showMyProfile,showSettings,tab,dmView,hideNav,viewingGroup:viewingGroupRef.current,viewingReels:reelsRef.current,viewingPost}
  },[viewingUser,showMyProfile,showSettings,tab,dmView,hideNav,viewingPost])

  // Global listener for push notifications regardless of tab
  useEffect(()=>{
    const ch = supabase.channel('global_notifs_'+currentUser.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+currentUser.id},async(payload)=>{
        // Push notifications are handled server-side via sendPush (VAPID/web-push).
        // This listener just keeps the in-app unread badge count fresh.
        loadUnreadCounts()
      })
      .subscribe()

    // Separate channel for DMs - filter by user's conversations
    supabase.from('conversation_participants').select('conversation_id').eq('user_id',currentUser.id).then(({data:convs})=>{
      if(!convs?.length) return
      convs.forEach(({conversation_id})=>{
        supabase.channel('dm_notif_'+conversation_id)
          .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'conversation_id=eq.'+conversation_id},async(payload)=>{
            if(payload.new.sender_id === currentUser.id) return
            // Push notifications handled server-side via sendPush (VAPID/web-push).
            loadUnreadCounts()
          })
          .subscribe()
      })
    })

    return()=>{ supabase.removeChannel(ch) }
  },[])

  // Polling backup for notifications/messages — Supabase Realtime (websockets)
  // is unreliable inside WebView-wrapped apps (background connection gets
  // killed, auth token refresh isn't always handled). This polls on an
  // interval instead, so notifications keep working even if the websocket dies.
  useEffect(()=>{
    const notifiedIds = new Set()
    let lastPollTime = new Date().toISOString()

    const poll = async () => {
      try {
        const pollStart = new Date().toISOString()

        // New notifications (likes, comments, follows, reposts, mentions)
        const {data:newNotifs} = await supabase.from('notifications')
          .select('*,actor:profiles!actor_id(display_name)')
          .eq('user_id', currentUser.id)
          .gt('created_at', lastPollTime)
          .order('created_at', {ascending:true})
        if(newNotifs?.length){
          for(const n of newNotifs){
            if(notifiedIds.has(n.id)) continue
            notifiedIds.add(n.id)
          }
        }

        // New DM messages across all of the user's conversations
        const {data:convs} = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', currentUser.id)
        if(convs?.length){
          const convIds = convs.map(c=>c.conversation_id)
          const {data:newMsgs} = await supabase.from('messages')
            .select('*,sender:profiles!sender_id(display_name)')
            .in('conversation_id', convIds)
            .gt('created_at', lastPollTime)
            .order('created_at', {ascending:true})
          if(newMsgs?.length){
            for(const m of newMsgs){
              if(notifiedIds.has(m.id)) continue
              notifiedIds.add(m.id)
            }
          }
        }

        if(newNotifs?.length || convs?.length) loadUnreadCounts()
        lastPollTime = pollStart
      } catch(e) { console.log('Notification poll error:', e.message) }
    }

    const interval = setInterval(poll, 25000)
    return () => clearInterval(interval)
  },[])

  useEffect(()=>{
    const presenceChannel = supabase.channel('online_users')
      .on('presence',{event:'sync'},()=>{
        const state = presenceChannel.presenceState()
        const online = {}
        Object.values(state).flat().forEach(p=>{ online[p.user_id]=true })
        setOnlineUsers(online)
      })
      .subscribe(async(status)=>{
        if(status==='SUBSCRIBED'){
          await presenceChannel.track({user_id:currentUser.id,online_at:new Date().toISOString()})
        }
      })
    return()=>supabase.removeChannel(presenceChannel)
  },[])

  useEffect(()=>{
    const setupPush = async() => {
      try {
        if(!('Notification' in window)) { console.log('No Notification API'); return }
        if(!('serviceWorker' in navigator)) { console.log('No SW'); return }
        if(!('PushManager' in window)) { console.log('No PushManager'); return }

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if(!vapidKey) { console.log('Push setup skipped: NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set'); return }

        // Clean up any other service worker registration (e.g. a leftover
        // OneSignal worker from a previous setup) so it can't compete for
        // the same push scope and cause duplicate/conflicting deliveries.
        const existingRegs = await navigator.serviceWorker.getRegistrations()
        for(const r of existingRegs){
          const scriptUrl = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || ''
          if(scriptUrl && !scriptUrl.endsWith('/sw.js')) await r.unregister()
        }

        const reg = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready
        let permission = Notification.permission
        if(permission === 'default') permission = await Notification.requestPermission()
        if(permission !== 'granted') { console.log('Permission:',permission); return }

        let sub = await reg.pushManager.getSubscription()
        if(!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidKey
          })
        }
        const {error} = await supabase.from('push_subscriptions').upsert({
          user_id:currentUser.id,
          subscription:JSON.parse(JSON.stringify(sub))
        },{onConflict:'user_id'})
        if(error) console.log('Sub save error:',error.message)
        else console.log('Push ready!')
      } catch(e) { console.log('Push setup error:',e.message) }
    }
    setupPush()
  },[])

  useEffect(()=>{
    // Prevent back button from ever going to auth/login
    window.history.pushState({flitters:true},'',window.location.href)
    const handlePop = (e) => {
      // Always push a new state to stay in-app
      window.history.pushState({flitters:true},'',window.location.href)
      const s = stateRef.current
      // Priority order: deepest screen first
      if(s.viewingPost){setViewingPost(null);setHideNav(false);return}
      if(s.viewingUser){setViewingUser(null);return}
      if(s.showMyProfile){setShowMyProfile(false);return}
      if(s.showSettings){setShowSettings(false);return}
      if(s.dmView==='chat'){setDmView('list');setSelectedConv(null);setMessages([]);return}
      if(s.viewingReels){
        if(reelsRef.current?.closeReels) reelsRef.current.closeReels()
        reelsRef.current = null
        stateRef.current.viewingReels = null
        setHideNav(false)
        return
      }
      if(s.viewingGroup){
        // signal PulseTab to close GC via a shared ref callback
        if(viewingGroupRef.current?.closeGC) viewingGroupRef.current.closeGC()
        viewingGroupRef.current = null
        stateRef.current.viewingGroup = null
        setHideNav(false)
        return
      }
      if(s.tab!=='home'){setTabWithHash('home');return}
    }
    window.addEventListener('popstate',handlePop)
    return()=>window.removeEventListener('popstate',handlePop)
  },[])
  const lastScrollY = useRef(0)

  useEffect(()=>{
    const handleScroll = () => {
      const y = window.scrollY
      if(y < 50) setNavVisible(true)
      else if(y > lastScrollY.current + 8) setNavVisible(false)
      else if(y < lastScrollY.current - 8) setNavVisible(true)
      lastScrollY.current = y
    }
    window.addEventListener('scroll', handleScroll, {passive:true})
    return()=>window.removeEventListener('scroll', handleScroll)
  },[])
  const [chatOverlay, setChatOverlay] = useState(null)
  const [pendingDM, setPendingDM] = useState(null)
  const bottomRef = useRef(null)

  const loadPosts = useCallback(async (feedType='foryou') => {
    setLoading(true)
    try {
      // fetch who current user follows and has interacted with
      const [{data:followsData},{data:likedData},{data:commentedData}] = await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id',currentUser.id),
        supabase.from('likes').select('post_id,posts(user_id)').eq('user_id',currentUser.id).limit(50),
        supabase.from('comments').select('post_id,posts(user_id)').eq('user_id',currentUser.id).limit(50),
      ])
      const followingIds = new Set((followsData||[]).map(f=>f.following_id))
      // build author affinity score: how much this user has interacted with each author
      const affinityMap = {}
      ;(likedData||[]).forEach(l=>{ const uid=l.posts?.user_id; if(uid){ affinityMap[uid]=(affinityMap[uid]||0)+1 } })
      ;(commentedData||[]).forEach(c=>{ const uid=c.posts?.user_id; if(uid){ affinityMap[uid]=(affinityMap[uid]||0)+2 } })
      followingIds.forEach(id=>{ affinityMap[id]=(affinityMap[id]||0)+3 })

      let postsQuery = supabase.from('posts').select('*,author:profiles(*),likes(user_id),reposts(user_id),comments(id)').order('created_at',{ascending:false}).limit(feedType==='following'?60:100)
      let repostsQuery = supabase.from('reposts').select('id,created_at,user:profiles(*),post:posts(*,author:profiles(*),likes(user_id),reposts(user_id),comments(id))').order('created_at',{ascending:false}).limit(40)

      if(feedType==='following'){
        if(!followingIds.size){ setPosts([]); setLoading(false); return }
        postsQuery = postsQuery.in('user_id',[...followingIds])
        repostsQuery = repostsQuery.in('user_id',[...followingIds])
      }

      const [{data},{data:repostsData}] = await Promise.all([postsQuery,repostsQuery])
      const now = Date.now()

      const normalized = (data||[]).map(p=>{
        const ageHours = (now - new Date(p.created_at).getTime()) / 3600000
        const likes = p.likes?.length||0
        const comments = p.comments?.length||0
        const reposts = p.reposts?.length||0
        const engagement = likes*1 + comments*2 + reposts*1.5
        const recencyScore = Math.max(0, 100 - ageHours*1.5) // decays over time
        const affinityScore = (affinityMap[p.user_id]||0) * 8
        const isOwn = p.user_id===currentUser.id ? -20 : 0 // slightly deprioritize own posts
        const score = feedType==='foryou' ? (recencyScore + engagement*0.8 + affinityScore + isOwn) : recencyScore
        return {...p,user_liked:p.likes?.some(l=>l.user_id===currentUser.id),user_reposted:p.reposts?.some(r=>r.user_id===currentUser.id),likes_count:likes,reposts_count:reposts,comments_count:comments,sortTime:p.created_at,_score:score}
      })

      const repostItems = (repostsData||[]).filter(r=>r.post).map(r=>{
        const p=r.post
        const ageHours=(now-new Date(r.created_at).getTime())/3600000
        const recencyScore=Math.max(0,100-ageHours*1.5)
        const affinityScore=(affinityMap[r.user?.id]||0)*8
        return {...p,user_liked:p.likes?.some(l=>l.user_id===currentUser.id),user_reposted:p.reposts?.some(rp=>rp.user_id===currentUser.id),likes_count:p.likes?.length||0,reposts_count:p.reposts?.length||0,comments_count:p.comments?.length||0,isRepost:true,reposter:r.user,sortTime:r.created_at,_score:recencyScore+affinityScore}
      })

      // sort by score descending
      let merged = [...normalized,...repostItems].sort((a,b)=>b._score-a._score)

      // diversity pass: avoid 3+ consecutive posts from same author
      const final=[]
      const deferred=[]
      const recentAuthors=[]
      for(const post of merged){
        const author=post.user_id
        const recentCount=recentAuthors.slice(-3).filter(a=>a===author).length
        if(recentCount>=2){ deferred.push(post); continue }
        final.push(post)
        recentAuthors.push(author)
        if(final.length>=60) break
      }
      // append deferred posts at the end (no more loop risk)
      for(const post of deferred){
        if(final.length>=60) break
        final.push(post)
      }

      setPosts(final)
    } catch(e){ console.error('loadPosts error',e) }
    setLoading(false)
  },[currentUser.id])

  useEffect(()=>{ loadPosts(feedTab) },[feedTab])

  useEffect(()=>{
    const ch = supabase.channel('new-posts').on('postgres_changes',{event:'INSERT',schema:'public',table:'posts'},async(payload)=>{
      if(payload.new.user_id===currentUser.id) return
      const {data} = await supabase.from('posts').select('*,author:profiles(*),likes(user_id),reposts(user_id),comments(id)').eq('id',payload.new.id).single()
      if(data) setPosts(prev=>[{...data,likes_count:0,reposts_count:0,comments_count:0,user_liked:false,user_reposted:false},...prev])
    }).subscribe()
    return()=>supabase.removeChannel(ch)
  },[])

  useEffect(()=>{
    if(tab==='friends') {
      supabase.from('profiles').select('*').neq('id',currentUser.id).limit(40).then(({data})=>setPeople(data||[]))
      // Load who current user already follows
      supabase.from('follows').select('following_id').eq('follower_id',currentUser.id).then(({data})=>{
        const map = {}
        ;(data||[]).forEach(f=>{ map[f.following_id]=true })
        setFollowed(map)
      })
    }
  },[tab])
  useEffect(()=>{ if(tab==='messages'&&dmView==='list') loadConvos() },[tab])

  const loadConvos = async() => {
    const {data:parts} = await supabase.from('conversation_participants').select('conversation_id,last_read_at').eq('user_id',currentUser.id)
    if(!parts?.length){setConversations([]);return}
    const results = await Promise.all(parts.map(async p=>{
      const id = p.conversation_id
      const {data:op} = await supabase.from('conversation_participants').select('user_id').eq('conversation_id',id).neq('user_id',currentUser.id).maybeSingle()
      if(!op) return null
      const {data:prof} = await supabase.from('profiles').select('id,display_name,username,avatar_color,avatar_url').eq('id',op.user_id).single()
      const {data:lastMsg} = await supabase.from('messages').select('content,created_at,sender_id,is_sticker').eq('conversation_id',id).order('created_at',{ascending:false}).limit(1).maybeSingle()
      const {count:unreadCount} = await supabase.from('messages').select('id',{count:'exact',head:true}).eq('conversation_id',id).neq('sender_id',currentUser.id).gt('created_at',p.last_read_at||'1970-01-01T00:00:00Z')
      return {id, other:prof, last:lastMsg, unread:(unreadCount||0)>0}
    }))
    setConversations(results.filter(Boolean).sort((a,b)=>new Date(b.last?.created_at||0)-new Date(a.last?.created_at||0)))
  }

  useEffect(()=>{
    if(!selectedConv) return
    if(selectedConv.id!=='omnicore-ai') {
      supabase.from('conversation_participants').update({last_read_at:new Date().toISOString()}).eq('conversation_id',selectedConv.id).eq('user_id',currentUser.id).then(()=>loadUnreadCounts())
      supabase.from('messages').update({read_at:new Date().toISOString()}).eq('conversation_id',selectedConv.id).neq('sender_id',currentUser.id).is('read_at',null).then(()=>{})
    }
    const fetchMessages = async() => {
      const {data} = await supabase.from('messages').select('*,sender:profiles(id,display_name,avatar_color,avatar_url),message_reactions(user_id,emoji)').eq('conversation_id',selectedConv.id).order('created_at',{ascending:true})
      // Preserve any not-yet-confirmed optimistic bubble for *this* conversation
      // instead of wiping it — a slow insert shouldn't make a just-sent message
      // vanish before its confirmation (or failure) comes back.
      if(data) setMessages(prev=>{
        const pending = prev.filter(m=>m.id.toString().startsWith('tmp')&&m.conversation_id===selectedConv.id)
        return [...data,...pending]
      })
    }
    fetchMessages()
    // Realtime subscription below handles live updates — this poll is just a
    // safety net in case a realtime connection silently drops, not the
    // primary sync mechanism, so it doesn't need to run every few seconds.
    const pollInterval = setInterval(fetchMessages, 30000)
    const ch = supabase.channel(`m:${selectedConv.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`conversation_id=eq.${selectedConv.id}`},async(payload)=>{
      let alreadyHave = false
      setMessages(prev=>{ alreadyHave = prev.some(m=>m.id===payload.new.id); return prev })
      if(alreadyHave) { // broadcast already delivered this one — just mark it read, skip the extra round trip
        if(payload.new.sender_id !== currentUser.id) supabase.from('messages').update({read_at:new Date().toISOString()}).eq('id',payload.new.id).then(()=>{})
        return
      }
      const {data} = await supabase.from('messages').select('*,sender:profiles(id,display_name,avatar_color,avatar_url),message_reactions(user_id,emoji)').eq('id',payload.new.id).single()
      if(data) {
        setMessages(prev=>{
          // remove any optimistic temp message that matches, avoid duplicates
          const filtered = prev.filter(m=>!(m.id.toString().startsWith('tmp')&&m.content===data.content&&m.sender_id===data.sender_id))
          const exists = filtered.some(m=>m.id===data.id)
          return exists ? filtered : [...filtered,data]
        })
        if(data.sender_id !== currentUser.id) {
          supabase.from('messages').update({read_at:new Date().toISOString()}).eq('id',data.id).then(()=>{})
        }
      }
    }).on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages',filter:`conversation_id=eq.${selectedConv.id}`},(payload)=>{
      setMessages(prev=>prev.map(m=>m.id===payload.new.id?{...m,read_at:payload.new.read_at}:m))
    }).on('postgres_changes',{event:'*',schema:'public',table:'message_reactions'},async()=>{
      const {data} = await supabase.from('messages').select('*,sender:profiles(id,display_name,avatar_color,avatar_url),message_reactions(user_id,emoji)').eq('conversation_id',selectedConv.id).order('created_at',{ascending:true})
      if(data) setMessages(prev=>{
        const pending = prev.filter(m=>m.id.toString().startsWith('tmp')&&m.conversation_id===selectedConv.id)
        return [...data,...pending]
      })
    }).on('broadcast',{event:'new_message'},async(payload)=>{
      // Delivered instantly by the sender — no DB round trip needed on this end.
      const msg = payload.payload
      if(!msg?.id) return
      setMessages(prev=>{
        const filtered = prev.filter(m=>!(m.id.toString().startsWith('tmp')&&m.content===msg.content&&m.sender_id===msg.sender_id))
        return filtered.some(m=>m.id===msg.id) ? filtered : [...filtered,{...msg,message_reactions:msg.message_reactions||[]}]
      })
      if(msg.sender_id !== currentUser.id) {
        supabase.from('messages').update({read_at:new Date().toISOString()}).eq('id',msg.id).then(()=>{})
      }
    }).on('broadcast',{event:'typing'},(payload)=>{
      if(payload.payload?.user_id===currentUser.id) return
      setOtherTyping(true)
      clearTimeout(dmTypingTimeoutRef.current)
      dmTypingTimeoutRef.current = setTimeout(()=>setOtherTyping(false),3000)
    }).subscribe()
    dmChannelRef.current = ch
    return()=>{ clearInterval(pollInterval); supabase.removeChannel(ch); setOtherTyping(false) }
  },[selectedConv])

  const dmScrollRef = useRef(null)
  const dmUserScrolledUp = useRef(false)
  const dmIsNearBottom = () => { const el=dmScrollRef.current; if(!el) return true; return el.scrollHeight-el.scrollTop-el.clientHeight < 120 }
  useEffect(()=>{ if(!dmUserScrolledUp.current) bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])
  // reset scroll-up flag when conversation changes
  useEffect(()=>{ dmUserScrolledUp.current=false },[selectedConv])

  const [allPeople, setAllPeople] = useState([])

  useEffect(()=>{
    if(dmView==='new'){
      supabase.from('profiles').select('id,display_name,username,avatar_color,avatar_url').neq('id',currentUser.id).limit(50).then(({data})=>setAllPeople(data||[]))
    }
  },[dmView])

  useEffect(()=>{
    if(!searchQ.trim()){setSearchResults([]);return}
    const q = searchQ.toLowerCase()
    setSearchResults(allPeople.filter(u=>u.display_name?.toLowerCase().includes(q)||u.username?.toLowerCase().includes(q)))
  },[searchQ,allPeople])

  const sendPost = async() => {
    if(!composeText.trim()&&!composeImage) return
    let imageUrl = null
    if(composeImage) {
      const ext = composeImage.name.split('.').pop().toLowerCase()
      const path = 'posts/'+currentUser.id+'_'+Date.now()+'.'+ext
      const {data:upData, error} = await supabase.storage.from('avatars').upload(path, composeImage, {upsert:true, contentType:composeImage.type})
      if(error) { alert('Image upload failed: '+error.message); return }
      const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
      imageUrl = urlData.publicUrl
    }
    const {data} = await supabase.from('posts').insert({user_id:currentUser.id,content:composeText.trim(),image_url:imageUrl}).select('*,author:profiles(*),likes(user_id),reposts(user_id),comments(id)').single()
    if(data) {
      setPosts(prev=>[{...data,likes_count:0,reposts_count:0,comments_count:0,user_liked:false,user_reposted:false},...prev])
      // detect @mentions and notify tagged users
      const handles = [...new Set((composeText.match(/@([a-zA-Z0-9_]+)/g)||[]).map(h=>h.slice(1).toLowerCase()))]
      if(handles.length){
        const {data:taggedUsers} = await supabase.from('profiles').select('id,username').in('username',handles)
        if(taggedUsers?.length){
          await Promise.all(taggedUsers.filter(u=>u.id!==currentUser.id).map(u=>
            supabase.from('notifications').insert({user_id:u.id,actor_id:currentUser.id,type:'mention',post_id:data.id})
          ))
        }
      }
    }
    setComposeText(''); setComposeImage(null); setComposeImageUrl(null); setShowCompose(false)
  }

  const deletePost = async(postId) => {
    await supabase.from('posts').delete().eq('id',postId).eq('user_id',currentUser.id)
    setPosts(prev=>prev.filter(p=>p.id!==postId))
  }

  const openDMWithUser = async(user) => {
    setViewingUser(null)
    setShowMyProfile(false)
    const {data:myP} = await supabase.from('conversation_participants').select('conversation_id').eq('user_id',currentUser.id)
    let convId = null
    if(myP?.length){
      const {data:shared} = await supabase.from('conversation_participants').select('conversation_id').eq('user_id',user.id).in('conversation_id',myP.map(p=>p.conversation_id))
      if(shared?.length) convId = shared[0].conversation_id
    }
    if(!convId){
      const {data:conv} = await supabase.from('conversations').insert({}).select().single()
      await supabase.from('conversation_participants').insert([{conversation_id:conv.id,user_id:currentUser.id},{conversation_id:conv.id,user_id:user.id}])
      convId = conv.id
    }
    setSelectedConv({id:convId,other:user})
    setDmView('chat')
    setTabWithHash('messages')
  }

  const dmInputRef = useRef(null)
  const dmSendInFlight = useRef(false)
  const sendMsg = async() => {
    if(dmSendInFlight.current) return
    if(!msgText.trim()||!selectedConv?.id) return
    dmSendInFlight.current = true
    const content=msgText.trim(); const reply=dmReplyTo; const replyId=dmReplyToId
    setMsgText(''); setDmReplyTo(null); setDmReplyToId(null)
    if(dmInputRef.current) dmInputRef.current.style.height='auto'
    const tempId = 'tmp'+Date.now()
    const tmp={id:tempId,conversation_id:selectedConv.id,sender_id:currentUser.id,content,reply_to:reply,reply_to_id:replyId,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    try {
      let {data:inserted, error} = await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content,reply_to:reply,reply_to_id:replyId}).select('id,created_at').single()
      if(error && isMissingColumnError(error)) {
        // reply_to_id column doesn't exist yet (migration not run) — fall back
        // so the core chat still works instead of failing every send.
        console.warn('reply_to_id column missing, retrying without it — run supabase_migration_reply_and_stickers.sql', error)
        ;({data:inserted, error} = await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content,reply_to:reply}).select('id,created_at').single())
      }
      if(inserted){
        setMessages(prev=>prev.map(m=>m.id===tempId?{...tmp,id:inserted.id,created_at:inserted.created_at}:m))
        // broadcast the full message straight to the other side — no waiting
        // on postgres replication lag for it to feel instant on their end.
        dmChannelRef.current?.send({type:'broadcast',event:'new_message',payload:{
          id:inserted.id, sender_id:currentUser.id, content, reply_to:reply, reply_to_id:replyId, created_at:inserted.created_at,
          sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url},
          message_reactions:[]
        }})
      } else {
        console.error('Message send failed:', error)
        setMessages(prev=>prev.map(m=>m.id===tempId?{...m,_failed:true}:m))
      }
      if(selectedConv.other?.id && selectedConv.id!=='omnicore-ai') {
        sendPush(selectedConv.other.id, (currentUser.display_name||'New message'), content.slice(0,100))
      }
      loadConvos()
    } finally { dmSendInFlight.current = false }
  }


  const toggleFollow = async(user) => {
    const isF = !!followed[user.id]
    // Update UI immediately
    setFollowed(p=>({...p,[user.id]:!isF}))
    if(isF) {
      const {error} = await supabase.from('follows').delete().eq('follower_id',currentUser.id).eq('following_id',user.id)
      if(error) setFollowed(p=>({...p,[user.id]:true})) // revert on error
    } else {
      const {error} = await supabase.from('follows').insert({follower_id:currentUser.id,following_id:user.id})
      if(error) setFollowed(p=>({...p,[user.id]:false})) // revert on error
    }
  }

  const handleUserClick = (user) => {
    if(!user?.id) return
    if(user.id===currentUser.id){setShowMyProfile(true);return}
    setViewingUser(user)
  }

  const handleDMLongPress = (msg) => { dmLongPressTimer.current = setTimeout(()=>setSelectedDMMsg(msg),500) }
  const handleDMPressEnd = () => clearTimeout(dmLongPressTimer.current)
  const toggleDMReaction = async(msg,emoji) => {
    const mine = msg.message_reactions?.find(r=>r.user_id===currentUser.id)
    setSelectedDMMsg(null)
    if(mine && mine.emoji===emoji){
      setMessages(prev=>prev.map(m=>m.id===msg.id?{...m,message_reactions:(m.message_reactions||[]).filter(r=>r.user_id!==currentUser.id)}:m))
      await supabase.from('message_reactions').delete().eq('message_id',msg.id).eq('user_id',currentUser.id)
    } else {
      setMessages(prev=>prev.map(m=>m.id===msg.id?{...m,message_reactions:[...(m.message_reactions||[]).filter(r=>r.user_id!==currentUser.id),{user_id:currentUser.id,emoji}]}:m))
      await supabase.from('message_reactions').upsert({message_id:msg.id,user_id:currentUser.id,emoji},{onConflict:'message_id,user_id'})
    }
  }

  const deleteDMMsg = async(msg) => {
    setSelectedDMMsg(null)
    await supabase.from('messages').delete().eq('id',msg.id).eq('sender_id',currentUser.id)
    setMessages(prev=>prev.filter(m=>m.id!==msg.id))
  }

  const saveDMEdit = async() => {
    if(!editDMText.trim()) return
    await supabase.from('messages').update({content:editDMText.trim()}).eq('id',editingDMMsg).eq('sender_id',currentUser.id)
    setMessages(prev=>prev.map(m=>m.id===editingDMMsg?{...m,content:editDMText.trim()}:m))
    setEditingDMMsg(null); setEditDMText('')
  }

  const sendDMImage = async(file)=>{
    if(!file||!selectedConv?.id) return
    setSendingDMImg(true)
    const ext=file.name.split('.').pop()
    const path='chats/dm_'+selectedConv.id+'_'+Date.now()+'.'+ext
    const {error}=await supabase.storage.from('avatars').upload(path,file,{upsert:false})
    if(error){alert('Upload failed: '+error.message);setSendingDMImg(false);return}
    const {data:urlData}=supabase.storage.from('avatars').getPublicUrl(path)
    const url=urlData.publicUrl
    const tempId = 'tmp_img'+Date.now()
    const tmp={id:tempId,conversation_id:selectedConv.id,sender_id:currentUser.id,content:'',image_url:url,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    const {data:inserted} = await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content:'',image_url:url}).select('id,created_at').single()
    if(inserted){
      setMessages(prev=>prev.map(m=>m.id===tempId?{...tmp,id:inserted.id,created_at:inserted.created_at}:m))
      dmChannelRef.current?.send({type:'broadcast',event:'new_message',payload:{
        id:inserted.id, sender_id:currentUser.id, content:'', image_url:url, created_at:inserted.created_at,
        sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url},
        message_reactions:[]
      }})
    }
    setSendingDMImg(false)
  }

  const sendDMSticker = async(stickerUrl)=>{
    if(!selectedConv?.id) return
    setShowDMStickerTray(false)
    const tempId = 'tmp_stk'+Date.now()
    const tmp={id:tempId,conversation_id:selectedConv.id,sender_id:currentUser.id,content:'',is_sticker:true,sticker_url:stickerUrl,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    const {data:inserted,error} = await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content:'',is_sticker:true,sticker_url:stickerUrl}).select('id,created_at').single()
    if(inserted){
      setMessages(prev=>prev.map(m=>m.id===tempId?{...tmp,id:inserted.id,created_at:inserted.created_at}:m))
      dmChannelRef.current?.send({type:'broadcast',event:'new_message',payload:{
        id:inserted.id, sender_id:currentUser.id, content:'', is_sticker:true, sticker_url:stickerUrl, created_at:inserted.created_at,
        sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url},
        message_reactions:[]
      }})
      if(selectedConv.other?.id && selectedConv.id!=='omnicore-ai') {
        sendPush(selectedConv.other.id, (currentUser.display_name||'New message'), (currentUser.display_name||'Someone')+' sent you a sticker')
      }
      loadConvos()
    } else {
      console.error('Sticker send failed:', error)
      setMessages(prev=>prev.map(m=>m.id===tempId?{...m,_failed:true}:m))
      if(isMissingColumnError(error)) alert('Stickers need one-time setup — run supabase_migration_reply_and_stickers.sql in Supabase first.')
      else alert('Sticker failed to send: '+(error?.message||'unknown error'))
    }
  }

  const showLocalNotif = (title, body) => {
    try {
      if(typeof Notification === 'undefined') return
      if(Notification.permission !== 'granted') return
      setTimeout(async ()=>{
        try {
          if('serviceWorker' in navigator){
            const reg = await navigator.serviceWorker.ready
            reg.showNotification(title, {body, icon:'/icon-192.png', tag:Date.now().toString()})
          } else {
            new Notification(title, {body, icon:'/icon-192.png', tag:Date.now().toString()})
          }
        }
        catch(e){ console.log('Notif error:',e.message) }
      }, 100)
    } catch(e){ console.log('showLocalNotif error:',e) }
  }

  const sendPush = async(userId, title, body) => {
    try {
      const {data} = await supabase.from('push_subscriptions').select('subscription').eq('user_id',userId).order('created_at',{ascending:false}).limit(1)
      const subscription = data?.[0]?.subscription
      if(subscription) {
        const res = await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription,title,body,url:'/'})})
        if(!res.ok) {
          const err = await res.json().catch(()=>({}))
          console.error('Push send failed:', res.status, err.error||'unknown error')
        }
      }
    } catch(e) { console.log('Push send error',e) }
  }

  const TABS=[{id:'home',label:'Home',icon:<Home size={22}/>},{id:'messages',label:'Messages',icon:<MessageCircle size={22}/>},{id:'pulse',label:'Pulse',icon:<Zap size={22}/>},{id:'friends',label:'People',icon:<Users size={22}/>},{id:'notifications',label:'Alerts',icon:<Bell size={22}/>}]
  const TRENDING=[{tag:'#GlobalVoices',posts:'142K',cat:'Worldwide'},{tag:'#TechForGood',posts:'89K',cat:'Technology'},{tag:'#WorldCulture',posts:'211K',cat:'Culture'},{tag:'#FlittersSpotlight',posts:'445K',cat:'Flitters'},{tag:'#FutureNow',posts:'78K',cat:'Trending'},{tag:'#ClimateAction',posts:'190K',cat:'Environment'},{tag:'#StartupLife',posts:'55K',cat:'Business'},{tag:'#MusicMonday',posts:'33K',cat:'Entertainment'}]

  
  if(showAdmin) return <AdminPanel currentUser={currentUser} supabase={supabase} onBack={()=>setShowAdmin(false)}/>
  if(showSettings) return <SettingsView currentUser={currentUser} supabase={supabase} onBack={()=>setShowSettings(false)} onSignOut={handleSignOut} onAvatarUpdate={url=>{setAvatarUrl(url);currentUser.avatar_url=url}}/>
  if(showMyProfile) return <MyProfileView currentUser={currentUser} supabase={supabase} avatarUrl={avatarUrl} onBack={()=>setShowMyProfile(false)} onSettings={()=>{setShowMyProfile(false);setShowSettings(true)}}/>
  if(viewingUser) return <UserProfileView user={viewingUser} currentUser={currentUser} supabase={supabase} onBack={()=>setViewingUser(null)} onMessage={openDMWithUser} onOpenPost={openPost} sendPush={sendPush}/>
  if(viewingPost) return (
    <div className="screen-in-safe" style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={closePost} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',fontSize:24,padding:0}}>‹</button>
        <span style={{fontWeight:700,fontSize:17}}>Post</span>
      </div>
      <PostCard post={viewingPost} currentUser={currentUser} supabase={supabase} onUserClick={u=>{closePost();handleUserClick(u)}} onDelete={null} autoExpandComments sendPush={sendPush}/>
    </div>
  )

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',maxWidth:600,margin:'0 auto',color:'var(--text-primary)',fontFamily:'sans-serif'}}>
      {!hideNav && <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'10px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <button onClick={()=>setShowMyProfile(true)} style={{background:'none',border:'none',cursor:'pointer',padding:0}}>
          <Avatar url={avatarUrl} name={currentUser?.display_name} color={color} size={36}/>
        </button>
        <div onClick={()=>window.location.reload()} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',userSelect:'none'}}>
          <img src="/flitters-mark.png" alt="Flitters" width="36" height="36" style={{objectFit:'contain',filter:theme==='light'?'drop-shadow(0 0 1px rgba(0,0,0,0.5)) drop-shadow(0 0 1px rgba(0,0,0,0.5))':'none'}} loading="lazy"/>
          <span style={{fontWeight:900,fontSize:18,background:'linear-gradient(135deg,#A855F7,#06B6D4)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',letterSpacing:'2px'}}>FLITTERS</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          
          {currentUser?.id===ADMIN_ID&&<button onClick={()=>setShowAdmin(true)} style={{background:'linear-gradient(135deg,#F7B731,#FF6B35)',border:'none',borderRadius:16,padding:'5px 10px',cursor:'pointer',color:'var(--text-primary)',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',gap:4}}><Megaphone size={13}/> Ads</button>}
<button onClick={()=>setShowSettings(true)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex'}}><Settings size={22}/></button>
        </div>
      </div>}

      <div style={{paddingBottom:110}}>
        {tab==='home'&&<>
          <div style={{display:'flex',borderBottom:'1px solid var(--border-color)',position:'sticky',top:58,zIndex:5,background:'var(--bg-header)',backdropFilter:'blur(7px)'}}>
            {[{id:'foryou',label:'For You'},{id:'following',label:'Following'},{id:'global',label:'Global'}].map(t=>(
              <button key={t.id} onClick={()=>setFeedTab(t.id)} style={{flex:1,padding:'14px 0',background:'none',border:'none',borderBottom:feedTab===t.id?'2px solid #5B9CF6':'2px solid transparent',color:feedTab===t.id?'#fff':'#555',fontWeight:feedTab===t.id?700:500,fontSize:14,cursor:'pointer'}}>{t.label}</button>
            ))}
          </div>
          {loading&&<div style={{padding:'50px',textAlign:'center',color:'var(--text-quaternary)'}}>Loading...</div>}
          {!loading&&posts.length===0&&<div style={{padding:'60px 20px',textAlign:'center'}}><div style={{display:'flex',justifyContent:'center',color:'var(--text-quaternary)'}}><Globe size={44}/></div><p style={{color:'var(--text-muted)',fontSize:16,marginTop:8}}>{feedTab==='following'?'Follow people to see their posts':'No posts yet. Be the first on Flitters!'}</p></div>}
          {posts.map((post,i)=>(
            <div key={(post.isRepost?'repost_'+post.id+'_'+post.reposter?.id:'post_'+post.id)}>
              {post.isRepost&&<div onClick={()=>handleUserClick(post.reposter)} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 16px 0',color:'var(--text-tertiary)',fontSize:13,cursor:'pointer'}}>
                <Repeat2 size={14}/>
                <span><strong style={{color:'var(--text-subtle)'}}>{post.reposter?.id===currentUser.id?'You':post.reposter?.display_name}</strong> reposted</span>
              </div>}
              <PostCard post={post} currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick} onDelete={deletePost} onOpenPost={openPost} sendPush={sendPush}/>
              {ads.length>0&&(i+1)%4===0&&<AdCard ad={ads[Math.floor(i/4)%ads.length]}/>}
              
              {(i+1)%10===0&&<ReelPreviewCard supabase={supabase} onOpen={(reelId)=>{setTabWithHash('pulse');setPendingReelId(reelId)}}/>}
            </div>
          ))}
        </>}

        {tab==='messages'&&<>
          {dmView==='list'&&<>
            <div style={{padding:'16px',borderBottom:'1px solid var(--border-color)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontWeight:800,fontSize:20}}>Messages</span>
              <button onClick={()=>{setSearchQ('');setDmView('new')}} style={{background:'rgba(91,156,246,0.1)',border:'1px solid rgba(91,156,246,0.2)',borderRadius:12,padding:'8px 16px',color:'#5B9CF6',cursor:'pointer',fontWeight:700,fontSize:13}}>+ New</button>
            </div>
            {/* Flitters AI — always pinned first */}
            <div onClick={()=>{setSelectedConv({id:'omnicore-ai',other:OMNICORE_PROFILE});setDmView('chat')}}
              style={{display:'flex',alignItems:'center',gap:12,padding:'16px',borderBottom:'1px solid var(--bg-card-5)',color:'var(--text-primary)',cursor:'pointer',background:'rgba(168,85,247,0.04)'}}>
              <img src="/flitters-ai-icon.png" alt="Flitters AI" style={{width:50,height:50,objectFit:'contain',flexShrink:0}} loading="lazy"/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                  <span style={{fontWeight:700,fontSize:15}}>Flitters AI</span>
                  <span style={{fontSize:10,background:'linear-gradient(135deg,#22D3EE,#A855F7,#EC4899)',color:'var(--text-primary)',borderRadius:6,padding:'1px 6px',fontWeight:700}}>AI</span>
                </div>
                <p style={{color:'var(--text-secondary)',fontSize:13,margin:0}}>Your AI assistant · Always online</p>
              </div>
              <span style={{color:'var(--text-quaternary)',fontSize:20}}>›</span>
            </div>
            {conversations.map(conv=>(
              <div key={conv.id}
                onClick={()=>{ setSelectedConv(conv); setDmView('chat') }}
                style={{display:'flex',alignItems:'center',gap:12,padding:'16px',borderBottom:'1px solid var(--bg-card-5)',color:'var(--text-primary)',cursor:'pointer',WebkitTapHighlightColor:'rgba(91,156,246,0.1)',userSelect:'none'}}>
                <div style={{position:'relative',flexShrink:0}}>
                  <Avatar url={conv.other?.avatar_url} name={conv.other?.display_name} color={conv.other?.avatar_color||'#5B9CF6'} size={50} online={!!onlineUsers[conv.other?.id]}/>
                  {conv.unread&&<span style={{position:'absolute',top:-2,right:-2,width:13,height:13,borderRadius:'50%',background:'#FF4757',border:'2px solid #090B10'}}/>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontWeight:conv.unread?800:700,fontSize:15}}>{conv.other?.display_name}</span>
                    {conv.last&&<span style={{color:conv.unread?'#5B9CF6':'var(--text-quaternary)',fontSize:12,fontWeight:conv.unread?700:400}}>{timeAgo(conv.last.created_at)}</span>}
                  </div>
                  <p style={{color:conv.unread?'var(--text-primary)':'var(--text-secondary)',fontWeight:conv.unread?600:400,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',margin:0}}>
                    {conv.last
                      ? (conv.last.is_sticker
                          ? (conv.last.sender_id===currentUser.id?'You sent a sticker':(conv.other?.display_name||'They')+' sent a sticker')
                          : (conv.last.sender_id===currentUser.id?'You: ':'')+conv.last.content)
                      : 'Tap to chat'}
                  </p>
                </div>
                <span style={{color:'var(--text-quaternary)',fontSize:20}}>›</span>
              </div>
            ))}
          </>}

          {dmView==='new'&&<>
            <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border-color)',display:'flex',alignItems:'center',gap:12}}>
              <button onClick={()=>setDmView('list')} style={{background:'none',border:'none',color:'var(--text-tertiary)',cursor:'pointer',fontSize:24}}>‹</button>
              <span style={{fontWeight:700,fontSize:17}}>New Message</span>
            </div>
            <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border-color)'}}>
              <input autoFocus value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search name or username..." style={{...inp}}/>
            </div>
            {!searchQ&&allPeople.map(u=>(
              <div key={u.id} onClick={()=>openDMWithUser(u)} style={{display:'flex',alignItems:'center',gap:12,padding:'16px',borderBottom:'1px solid var(--bg-card-5)',color:'var(--text-primary)',cursor:'pointer'}}>
                <Avatar url={u.avatar_url} name={u.display_name} color={u.avatar_color||getColor(u.id)} size={46}/>
                <div style={{flex:1}}><div style={{fontWeight:700,fontSize:15}}>{u.display_name}</div><div style={{color:'var(--text-secondary)',fontSize:13}}>@{u.username}</div></div>
                <span style={{color:'#5B9CF6',fontSize:22}}>›</span>
              </div>
            ))}
            {searchQ&&!searchResults.length&&<p style={{padding:'30px',textAlign:'center',color:'var(--text-quaternary)',fontSize:14}}>No users found</p>}
            {searchQ&&searchResults.map(u=>(
              <div key={u.id}
                onClick={()=>openDMWithUser(u)}
                onTouchEnd={(e)=>{ e.preventDefault(); openDMWithUser(u) }}
                style={{display:'flex',alignItems:'center',gap:12,padding:'16px',borderBottom:'1px solid var(--bg-card-5)',color:'var(--text-primary)',cursor:'pointer',WebkitTapHighlightColor:'transparent',userSelect:'none'}}>
                <Avatar url={u.avatar_url} name={u.display_name} color={u.avatar_color||getColor(u.id)} size={46}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:16}}>{u.display_name}</div>
                  <div style={{color:'var(--text-secondary)',fontSize:13}}>@{u.username}</div>
                </div>
                <span style={{color:'#5B9CF6',fontSize:22}}>›</span>
              </div>
            ))}
          </>}

          {dmView==='chat'&&selectedConv&&selectedConv.id==='omnicore-ai'&&<FlittersAI currentUser={currentUser} onClose={()=>{setDmView('list');setSelectedConv(null)}}/>}
          {dmView==='chat'&&selectedConv&&selectedConv.id!=='omnicore-ai'&&<div style={{position:'fixed',inset:0,zIndex:50,background:'var(--bg-app)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            {fullscreenImg&&<div onClick={()=>setFullscreenImg(null)} style={{position:'fixed',inset:0,zIndex:999,background:'rgba(0,0,0,0.95)',display:'flex',alignItems:'center',justifyContent:'center'}}><img src={fullscreenImg} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} alt="" loading="lazy"/></div>}
            <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border-color)',display:'flex',alignItems:'center',gap:12,background:'var(--bg-header)',backdropFilter:'blur(7px)',flexShrink:0}}>
              <button onClick={()=>{setDmView('list');setSelectedConv(null);setMessages([]);loadConvos()}} style={{background:'none',border:'none',color:'var(--text-tertiary)',cursor:'pointer',fontSize:24}}>‹</button>
              <div onClick={()=>setViewingUser(selectedConv.other)} style={{display:'flex',alignItems:'center',gap:10,flex:1,cursor:'pointer'}}>
                <Avatar url={selectedConv.other?.avatar_url} name={selectedConv.other?.display_name} color={selectedConv.other?.avatar_color||'#5B9CF6'} size={38} online/>
                <div>
                  <div style={{fontWeight:700,fontSize:15}}>{selectedConv.other?.display_name}</div>
                  <div style={{color:otherTyping?'#5B9CF6':(onlineUsers[selectedConv?.other?.id]?'#00C9A7':'#555'),fontSize:11}}>{otherTyping?'typing...':(onlineUsers[selectedConv?.other?.id]?'● Active now':'● Offline')}</div>
                </div>
              </div>
            </div>
            <div ref={dmScrollRef} onScroll={()=>{ dmUserScrolledUp.current = !dmIsNearBottom() }} style={{flex:1,padding:'16px 14px',display:'flex',flexDirection:'column',gap:8,overflowY:'auto',height:0}}>
              {messages.length===0&&<div style={{textAlign:'center',marginTop:60,display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
                <Avatar url={selectedConv.other?.avatar_url} name={selectedConv.other?.display_name} color={selectedConv.other?.avatar_color||'#5B9CF6'} size={72}/>
                <p style={{color:'var(--text-quaternary)',fontSize:14}}>Say hello! 👋</p>
              </div>}
              {selectedDMMsg&&<div onClick={()=>setSelectedDMMsg(null)} style={{position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-end'}}>
                <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'#1a1d26',borderRadius:'20px 20px 0 0',padding:'16px 0 32px'}}>
                  <div style={{width:36,height:4,borderRadius:2,background:'var(--bg-card-8)',margin:'0 auto 16px'}}/>
                  <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:8,marginBottom:16,padding:'0 12px',maxHeight:170,overflowY:'auto'}}>
                    {QUICK_REACTIONS.map(e=>{
                      const mine = selectedDMMsg.message_reactions?.find(r=>r.user_id===currentUser.id)
                      const isMineActive = mine?.emoji===e
                      return (
                      <button key={e} onClick={()=>toggleDMReaction(selectedDMMsg,e)} style={{background:isMineActive?'rgba(91,156,246,0.25)':'var(--bg-card-6)',border:isMineActive?'1px solid #5B9CF6':'none',borderRadius:12,padding:'8px',fontSize:22,cursor:'pointer'}}>{e}</button>
                      )
                    })}
                  </div>
                  <button onClick={()=>{setDmReplyTo(selectedDMMsg.sender?.display_name+': '+selectedDMMsg.content?.slice(0,50));setDmReplyToId(selectedDMMsg.id);setSelectedDMMsg(null)}} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'rgba(255,255,255,0.92)',fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10}}><CornerUpLeft size={17}/> Reply</button>
                  {selectedDMMsg.content&&<button onClick={()=>{navigator.clipboard?.writeText(selectedDMMsg.content);setSelectedDMMsg(null)}} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'rgba(255,255,255,0.92)',fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10}}><Copy size={17}/> Copy</button>}
                  {selectedDMMsg.sender_id===currentUser.id&&<>
                    <button onClick={()=>{setEditingDMMsg(selectedDMMsg.id);setEditDMText(selectedDMMsg.content);setSelectedDMMsg(null)}} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'#5B9CF6',fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10}}><Pencil size={17}/> Edit</button>
                    <button onClick={()=>deleteDMMsg(selectedDMMsg)} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'#FF4757',fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10}}><Trash2 size={17}/> Delete</button>
                  </>}
                </div>
              </div>}
              {messages.map(msg=>{
                const own = msg.sender_id===currentUser.id
                return(
                  <MessageBubble key={msg.id}
                    rowId={'dmmsg-'+msg.id}
                    msg={msg} own={own} currentUserId={currentUser.id}
                    onAvatarClick={()=>setViewingUser(msg.sender)}
                    onImageClick={setFullscreenImg}
                    onLongPress={()=>handleDMLongPress(msg)} onPressEnd={handleDMPressEnd}
                    reactions={msg.message_reactions}
                    onToggleReaction={(emoji)=>toggleDMReaction(msg,emoji)}
                    isEditing={editingDMMsg===msg.id}
                    editValue={editDMText} onEditChange={e=>setEditDMText(e.target.value)}
                    onSaveEdit={saveDMEdit} onCancelEdit={()=>setEditingDMMsg(null)}
                    showReadTicks
                    onJumpToReply={scrollToDMMessage} highlighted={dmHighlightMsgId===msg.id}
                  />
                )
              })}
              <div ref={bottomRef}/>
            </div>
            <div style={{flexShrink:0,maxWidth:600,width:'100%',margin:'0 auto',background:'var(--bg-app)',borderTop:'1px solid var(--border-color)',paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
              <ReplyComposerBar text={dmReplyTo} onCancel={()=>{setDmReplyTo(null);setDmReplyToId(null)}}/>
              {showDMStickerTray&&<StickerTray currentUser={currentUser} supabase={supabase} onSelect={sendDMSticker} onClose={()=>setShowDMStickerTray(false)}/>}
              <div style={{padding:'10px 14px',display:'flex',gap:10,alignItems:'center'}}>
              <input ref={dmImgRef} type="file" accept="image/*" onChange={e=>sendDMImage(e.target.files[0])} style={{display:'none'}}/>
              <button onClick={()=>dmImgRef.current?.click()} disabled={sendingDMImg} style={{width:40,height:40,borderRadius:'50%',background:'var(--bg-card)',border:'none',cursor:'pointer',color:'var(--text-tertiary)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>{sendingDMImg?<Loader2 size={18} className="xspin"/>:<ImageIcon size={18}/>}</button>
              <button onClick={()=>setShowDMStickerTray(v=>!v)} style={{width:40,height:40,borderRadius:'50%',background:showDMStickerTray?'rgba(91,156,246,0.2)':'var(--bg-card)',border:'none',cursor:'pointer',color:showDMStickerTray?'#5B9CF6':'var(--text-tertiary)',fontSize:18,flexShrink:0}}>😊</button>
              <textarea ref={dmInputRef} rows={1} value={msgText} onChange={e=>{setMsgText(e.target.value);sendDMTyping();e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'}} placeholder={dmReplyTo?'Reply...':'Message...'} style={{...inp,flex:1,borderRadius:20,marginBottom:0,padding:'12px 18px',resize:'none',maxHeight:120,overflowY:'auto',lineHeight:1.4,fontFamily:'sans-serif'}}/>
              <button onClick={sendMsg} disabled={!msgText.trim()} style={{width:46,height:46,borderRadius:'50%',background:msgText.trim()?'linear-gradient(135deg,#5B9CF6,#845EF7)':'var(--bg-card-3)',border:'none',cursor:msgText.trim()?'pointer':'not-allowed',color:msgText.trim()?'#fff':'#333',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><Send size={19}/></button>
              </div>
            </div>
          </div>}
        </>}

        {tab==='friends'&&<>
          <div style={{display:'flex',borderBottom:'1px solid var(--border-color)',position:'sticky',top:58,zIndex:5,background:'var(--bg-header)',backdropFilter:'blur(7px)'}}>
            <button onClick={()=>setFriendsSubTab('friends')} style={{flex:1,padding:'14px 0',background:'none',border:'none',borderBottom:friendsSubTab==='friends'?'2px solid #5B9CF6':'2px solid transparent',color:friendsSubTab==='friends'?'#fff':'#555',fontWeight:friendsSubTab==='friends'?700:500,fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Users size={15}/> Friends</button>
            <button onClick={()=>setFriendsSubTab('explore')} style={{flex:1,padding:'14px 0',background:'none',border:'none',borderBottom:friendsSubTab==='explore'?'2px solid #5B9CF6':'2px solid transparent',color:friendsSubTab==='explore'?'#fff':'#555',fontWeight:friendsSubTab==='explore'?700:500,fontSize:14,cursor:'pointer'}}>🔭 Explore</button>
          </div>
          {friendsSubTab==='friends'&&<>
            {people.filter(u=>followed[u.id]).length===0&&<div style={{padding:'50px 20px',textAlign:'center'}}><div style={{display:'flex',justifyContent:'center',color:'var(--text-quaternary)'}}><Users size={36}/></div><p style={{color:'var(--text-secondary)',marginTop:8}}>You are not following anyone yet</p><p style={{color:'var(--text-quaternary)',fontSize:13,marginTop:4}}>Go to Explore to find people</p></div>}
            {people.filter(u=>followed[u.id]).map((u,i)=>(
              <div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid var(--bg-card-4)'}}>
                <button onClick={()=>handleUserClick(u)} style={{background:'none',border:'none',padding:0,cursor:'pointer'}}>
                  <Avatar url={u.avatar_url} name={u.display_name} color={u.avatar_color||COLORS[i%COLORS.length]} size={48}/>
                </button>
                <button onClick={()=>handleUserClick(u)} style={{flex:1,minWidth:0,background:'none',border:'none',cursor:'pointer',textAlign:'left',padding:0,color:'var(--text-primary)'}}>
                  <div style={{fontWeight:700,fontSize:15}}>{u.display_name}</div>
                  <div style={{color:'var(--text-secondary)',fontSize:13}}>@{u.username}</div>
                  {u.bio&&<div style={{color:'var(--text-muted)',fontSize:12,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.bio}</div>}
                </button>
                <button onClick={()=>toggleFollow(u)} style={{background:'var(--bg-card)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:20,padding:'8px 16px',color:'var(--text-primary)',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0}}>Following</button>
              </div>
            ))}
          </>}
          {friendsSubTab==='explore'&&<>
            <p style={{color:'var(--text-secondary)',fontSize:13,padding:'12px 16px 4px'}}>People you might know</p>
            {people.filter(u=>!followed[u.id]).map((u,i)=>(
              <div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid var(--bg-card-4)'}}>
                <button onClick={()=>handleUserClick(u)} style={{background:'none',border:'none',padding:0,cursor:'pointer'}}>
                  <Avatar url={u.avatar_url} name={u.display_name} color={u.avatar_color||COLORS[i%COLORS.length]} size={48}/>
                </button>
                <button onClick={()=>handleUserClick(u)} style={{flex:1,minWidth:0,background:'none',border:'none',cursor:'pointer',textAlign:'left',padding:0,color:'var(--text-primary)'}}>
                  <div style={{fontWeight:700,fontSize:15}}>{u.display_name}</div>
                  <div style={{color:'var(--text-secondary)',fontSize:13}}>@{u.username}</div>
                  {u.bio&&<div style={{color:'var(--text-muted)',fontSize:12,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.bio}</div>}
                </button>
                <button onClick={()=>toggleFollow(u)} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:20,padding:'8px 16px',color:'var(--text-primary)',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0}}>Follow</button>
              </div>
            ))}
            {!people.filter(u=>!followed[u.id]).length&&<p style={{padding:'40px',textAlign:'center',color:'var(--text-quaternary)'}}>You follow everyone on Flitters!</p>}
          </>}
        </>}

        {tab==='pulse'&&<PulseTab currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick} autoOpenGroup={autoOpenGroup} onAutoOpenDone={()=>setAutoOpenGroup(null)} onHideNav={setHideNav} pendingReelId={pendingReelId} onReelsOpened={()=>setPendingReelId(null)} viewingGroupRef={viewingGroupRef} reelsRef={reelsRef}/>}
        {tab==='search'&&<div style={{padding:'60px 20px',textAlign:'center'}}><div style={{display:'flex',justifyContent:'center',color:'var(--text-quaternary)'}}><Search size={44}/></div><p style={{color:'var(--text-muted)',fontSize:16,marginTop:8}}>Search coming soon</p></div>}

        {tab==='notifications'&&<NotificationsPanel currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick} onPostClick={openPost}/>}
      </div>

      {tab==='home'&&<button onClick={()=>setShowCompose(true)} style={{position:'fixed',bottom:96,right:18,width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-primary)',fontSize:28,boxShadow:'0 4px 24px rgba(91,156,246,0.55)',zIndex:50}}>+</button>}

      <div style={{position:'fixed',bottom:14,left:'50%',transform:(navVisible&&!(tab==='messages'&&dmView==='chat')&&!hideNav)?'translateX(-50%)':'translateX(-50%) translateY(100px)',zIndex:100,width:'calc(100% - 28px)',maxWidth:500,transition:'transform 0.3s ease',opacity:navVisible?1:0}}>
        <div style={{background:'var(--bg-header)',backdropFilter:'blur(14px)',borderRadius:30,padding:'8px 4px',border:'1px solid var(--border-color-2)',display:'flex',alignItems:'center',justifyContent:'space-around',boxShadow:'0 8px 40px var(--shadow-color)'}}>
          {TABS.map(({id,label,icon})=>{
            const badgeCount = id==='messages'?unreadDM:id==='notifications'?unreadNotifs:0
            const showDot = id==='pulse'&&unreadGC
            return (
            <button key={id} onClick={()=>setTabWithHash(id)} style={{position:'relative',display:'flex',flexDirection:'column',alignItems:'center',gap:3,background:tab===id?'rgba(91,156,246,0.14)':'none',border:'none',cursor:'pointer',color:tab===id?'#5B9CF6':'var(--text-muted)',padding:'8px 10px',borderRadius:20,minWidth:48}}>
              <span style={{fontSize:20,position:'relative'}}>
                {icon}
                {badgeCount>0&&<span style={{position:'absolute',top:-6,right:-10,background:'#FF4757',color:'var(--text-primary)',fontSize:10,fontWeight:800,borderRadius:9,minWidth:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px',border:'2px solid #090B10'}}>{badgeCount>9?'9+':badgeCount}</span>}
                {showDot&&<span style={{position:'absolute',top:-2,right:-6,width:9,height:9,borderRadius:'50%',background:'#FF4757',border:'2px solid #090B10',animation:'pulseDot 1.5s infinite'}}/>}
              </span>
              <span style={{fontSize:9.5,fontWeight:tab===id?700:500}}>{label}</span>
            </button>
            )
          })}
          <style>{`@keyframes pulseDot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:0.6}}`}</style>
        </div>
      </div>

      {showCompose&&<div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'flex-end'}} onClick={()=>setShowCompose(false)}>
        <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'var(--bg-app)',borderRadius:'24px 24px 0 0',padding:'16px 20px 40px',border:'1px solid rgba(255,255,255,0.09)'}}>
          <div style={{width:36,height:4,borderRadius:2,background:'var(--bg-card-8)',margin:'0 auto 20px'}}/>
          <div style={{display:'flex',gap:12}}>
            <Avatar url={avatarUrl} name={currentUser?.display_name} color={color} size={42}/>
            <div style={{flex:1}}>
              <textarea value={composeText} onChange={e=>setComposeText(e.target.value)} placeholder="What's happening around the world?" autoFocus rows={3} style={{width:'100%',background:'transparent',border:'none',color:'var(--text-primary)',fontSize:17,resize:'none',outline:'none',lineHeight:1.6,fontFamily:'sans-serif'}}/>
              {composeImageUrl&&<div style={{position:'relative',marginBottom:8}}>
                <img src={composeImageUrl} style={{width:'100%',maxHeight:200,objectFit:'cover',borderRadius:12}} alt="preview" loading="lazy"/>
                <button onClick={()=>{setComposeImage(null);setComposeImageUrl(null)}} style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,0.7)',border:'none',borderRadius:'50%',width:28,height:28,color:'var(--text-primary)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14}/></button>
              </div>}
              <input ref={composeImgRef} type="file" accept="image/*" onChange={e=>{const f=e.target.files[0];if(f){setComposeImage(f);if(typeof window!=='undefined')setComposeImageUrl(URL.createObjectURL(f))}}} style={{display:'none'}}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:12,borderTop:'1px solid var(--border-color)'}}>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <button onClick={()=>composeImgRef.current?.click()} style={{background:'none',border:'none',color:'#5B9CF6',cursor:'pointer',display:'flex'}}><ImageIcon size={22}/></button>
                  <span style={{color:composeText.length>250?'#FF4757':'#444',fontSize:13}}>{280-composeText.length}</span>
                </div>
                <button onClick={sendPost} disabled={!composeText.trim()&&!composeImage} style={{background:(composeText.trim()||composeImage)?'linear-gradient(135deg,#5B9CF6,#845EF7)':'var(--bg-card)',border:'none',borderRadius:24,padding:'10px 26px',color:(composeText.trim()||composeImage)?'#fff':'#444',fontWeight:700,fontSize:14,cursor:(composeText.trim()||composeImage)?'pointer':'not-allowed'}}>Flit it</button>
              </div>
            </div>
          </div>
        </div>
      </div>}
    </div>
  )
}

export default function FlittersApp({ currentUser }) {
  if (!currentUser || !currentUser.id) {
    return (
      <div style={{ minHeight: '100dvh', background: '#090B10', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
        <img src="/flitters-mark.png" alt="Flitters" width="70" height="70" style={{ objectFit: 'contain' }}  loading="lazy"/>
        <p style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>Something went wrong loading your account</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: 8, background: 'linear-gradient(135deg,#A855F7,#06B6D4)', border: 'none', borderRadius: 14, padding: '12px 28px', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Reload</button>
      </div>
    )
  }
  return <ErrorBoundary><FlittersAppInner currentUser={currentUser}/></ErrorBoundary>
}