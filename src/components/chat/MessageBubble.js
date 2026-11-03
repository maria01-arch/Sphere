'use client'
import { memo } from 'react'
import { AlertTriangle, Check, CheckCheck, X } from 'lucide-react'
import { ReplyQuoteInline } from '@/components/chat/ReplyBars'
import { StickerMedia } from '@/components/chat/StickerMedia'
import { VoiceMessagePlayer } from '@/components/chat/VoiceMessage'
import { Avatar } from '@/components/common/Avatar'
import { Linkify } from '@/components/common/Linkify'
import { LinkPreviewCard } from '@/components/common/LinkPreviewCard'
import { TICK_BLUE } from '@/lib/colors'
import { getFirstUrl } from '@/lib/links'
import { timeAgo } from '@/lib/timeAgo'

// Single message row: avatar (for others) + bubble + reactions.
// Bubble corners are uniform/rounded (no tail) — pill-style like Beeper.
// Reply quotes render *inside* the bubble — WhatsApp-style — via ReplyQuoteInline.
// Custom comparator: the call sites pass onClick/onLongPress/etc as fresh
// inline arrow functions on every parent render (they close over `msg`,
// which is itself a stable reference from the `messages` array state), so a
// plain shallow-compare memo would never skip a re-render — every keystroke
// in the composer would re-render the entire message list. Comparing only
// the props that actually affect what's rendered lets memo do its job.
export function messageBubblePropsEqual(prev, next) {
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

export const MessageBubble = memo(function MessageBubble({
  msg, own, showSenderInfo=false,
  onAvatarClick, onImageClick,
  onLongPress, onPressEnd,
  reactions, onToggleReaction, currentUserId,
  isEditing, editValue, onEditChange, onSaveEdit, onCancelEdit,
  showReadTicks=false,
  onJumpToReply, highlighted=false, rowId
}) {
  const isSticker = msg.is_sticker && msg.sticker_url
  const isVoice = msg.is_voice && msg.voice_url
  // Long-press handlers live on the bubble/sticker element itself, not the
  // full-width row — otherwise tapping empty space next to a bubble (the
  // rest of the flex row) would also trigger the action sheet.
  const pressHandlers = isEditing ? {} : {
    onTouchStart:onLongPress, onTouchEnd:onPressEnd, onTouchMove:onPressEnd,
    onMouseDown:onLongPress, onMouseUp:onPressEnd
  }
  return (
    <div id={rowId}
      style={{display:'flex',justifyContent:own?'flex-end':'flex-start',gap:8,alignItems:'flex-end',userSelect:'none',WebkitUserSelect:'none',transition:'background-color 0.3s ease',backgroundColor:highlighted?'rgba(var(--primary-rgb),0.14)':'transparent',borderRadius:14}}>
      {!own&&showSenderInfo&&<div onClick={onAvatarClick} style={{cursor:'pointer',flexShrink:0}}><Avatar url={msg.sender?.avatar_url} name={msg.sender?.display_name} color={msg.sender?.avatar_color||'#5B9CF6'} size={28}/></div>}
      <div style={{maxWidth:'75%'}}>
        {!own&&showSenderInfo&&<div style={{color:'var(--primary)',fontSize:11,fontWeight:700,marginBottom:3,paddingLeft:4}}>{msg.sender?.display_name}</div>}
        {isEditing?(
          <div style={{display:'flex',gap:6}}>
            <input value={editValue} onChange={onEditChange} onKeyDown={e=>e.key==='Enter'&&onSaveEdit()} style={{flex:1,background:'var(--bg-card-2)',border:'1px solid var(--primary)',borderRadius:16,padding:'8px 12px',color:'var(--text-primary)',fontSize:14,outline:'none'}}/>
            <button onClick={onSaveEdit} style={{background:'var(--primary)',border:'none',borderRadius:16,padding:'8px 12px',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center'}}><Check size={16}/></button>
            <button onClick={onCancelEdit} style={{background:'var(--bg-card-2)',border:'none',borderRadius:16,padding:'8px 12px',color:'var(--text-primary)',cursor:'pointer',display:'flex',alignItems:'center'}}><X size={16}/></button>
          </div>
        ):isSticker?(
          <div {...pressHandlers} onContextMenu={e=>e.preventDefault()} style={{WebkitTouchCallout:'none'}}>
            {msg.reply_to&&<ReplyQuoteInline text={msg.reply_to} own={own} onJump={msg.reply_to_id?()=>onJumpToReply?.(msg.reply_to_id):undefined}/>}
            <StickerMedia url={msg.sticker_url}/>
            <div style={{fontSize:10,color:msg._failed?'var(--danger)':'var(--text-quaternary)',marginTop:2,textAlign:own?'right':'left',display:'flex',gap:4,justifyContent:own?'flex-end':'flex-start',alignItems:'center'}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}>{msg._failed?<><AlertTriangle size={12}/> Failed to send</>:timeAgo(msg.created_at)}</span>
              {showReadTicks&&own&&!msg._failed&&<span style={{color:msg.read_at?'#5EE6C4':'var(--text-quaternary)',display:'inline-flex'}}>{msg.read_at?<CheckCheck size={14}/>:<Check size={14}/>}</span>}
            </div>
          </div>
        ):isVoice?(
          <div {...pressHandlers} style={{padding:'8px 12px',borderRadius:16,background:own?TICK_BLUE:'var(--bg-card-7)',opacity:msg._failed?0.7:1,outline:msg._failed?'1px solid var(--danger)':'none'}}>
            {msg.reply_to&&<ReplyQuoteInline text={msg.reply_to} own={own} onJump={msg.reply_to_id?()=>onJumpToReply?.(msg.reply_to_id):undefined}/>}
            <VoiceMessagePlayer url={msg.voice_url} duration={msg.voice_duration} own={own}/>
            <div style={{fontSize:10,color:msg._failed?'var(--danger)':(own?'rgba(255,255,255,0.75)':'var(--text-quaternary)'),marginTop:4,textAlign:'right',display:'flex',gap:4,justifyContent:'flex-end',alignItems:'center'}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}>{msg._failed?<><AlertTriangle size={12}/> Failed to send</>:timeAgo(msg.created_at)}</span>
              {showReadTicks&&own&&!msg._failed&&<span style={{color:msg.read_at?'#5EE6C4':'rgba(255,255,255,0.5)',display:'inline-flex'}}>{msg.read_at?<CheckCheck size={14}/>:<Check size={14}/>}</span>}
            </div>
          </div>
        ):(
          <div {...pressHandlers} style={{padding:msg.image_url?'4px':'7px 11px',borderRadius:16,background:own?TICK_BLUE:'var(--bg-card-7)',color:own?'#fff':'var(--text-primary)',fontSize:14,lineHeight:1.4,wordBreak:'break-word',overflow:'hidden',opacity:msg._failed?0.7:1,outline:msg._failed?'1px solid var(--danger)':'none'}}>
            {msg.reply_to&&<ReplyQuoteInline text={msg.reply_to} own={own} onJump={msg.reply_to_id?()=>onJumpToReply?.(msg.reply_to_id):undefined}/>}
            {msg.image_url?<img src={msg.image_url} style={{maxWidth:220,maxHeight:220,borderRadius:12,display:'block',cursor:'pointer'}} alt="img" loading="lazy" onClick={()=>onImageClick(msg.image_url)}/>:<Linkify text={msg.content} color={own?'#D6ECFF':'var(--primary)'}/>}
            {!msg.image_url&&msg.content&&<LinkPreviewCard url={getFirstUrl(msg.content)} own={own}/>}
            <div style={{fontSize:10,color:msg._failed?'var(--danger)':(own?'rgba(255,255,255,0.75)':'var(--text-quaternary)'),marginTop:4,textAlign:'right',padding:msg.image_url?'0 6px 4px':'0',display:'flex',gap:4,justifyContent:'flex-end',alignItems:'center'}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}>{msg._failed?<><AlertTriangle size={12}/> Failed to send</>:timeAgo(msg.created_at)}</span>
              {showReadTicks&&own&&!msg._failed&&<span style={{color:msg.read_at?'#5EE6C4':'rgba(255,255,255,0.5)',display:'inline-flex'}}>{msg.read_at?<CheckCheck size={14}/>:<Check size={14}/>}</span>}
            </div>
          </div>
        )}
        {reactions?.length>0&&<div style={{display:'flex',gap:4,marginTop:2,flexWrap:'wrap',justifyContent:own?'flex-end':'flex-start'}}>
          {Object.entries(reactions.reduce((acc,r)=>{acc[r.emoji]=(acc[r.emoji]||0)+1;return acc},{})).map(([emoji,count])=>{
            const mine = reactions.some(r=>r.emoji===emoji&&r.user_id===currentUserId)
            return <span key={emoji} onClick={()=>onToggleReaction(emoji)} style={{background:mine?'rgba(var(--primary-rgb),0.25)':'var(--bg-card-2)',border:mine?'1px solid var(--primary)':'none',borderRadius:10,padding:'2px 7px',fontSize:12,cursor:'pointer'}}>{emoji}{count>1?' '+count:''}</span>
          })}
        </div>}
      </div>
    </div>
  )
}, messageBubblePropsEqual)
