'use client'
import { X } from 'lucide-react'

// Reply text is stored as a flattened "Sender Name: quoted text" string today.
// We split on the first ": " to render it WhatsApp-style (bold name + dimmed
// quote) without needing a schema migration. Older messages with no ": " just
// render as a plain quoted line. If replyToId is present (new messages only —
// requires the reply_to_id column) the quote becomes tappable and jumps to
// the original message.
export function ReplyQuoteInline({ text, own, onJump }) {
  if(!text) return null
  const idx = text.indexOf(': ')
  const name = idx>-1 ? text.slice(0,idx) : null
  const quoted = idx>-1 ? text.slice(idx+2) : text
  return (
    <div onClick={onJump?(e)=>{e.stopPropagation();onJump()}:undefined} style={{borderLeft:'3px solid '+(own?'rgba(255,255,255,0.6)':'var(--primary)'),background:own?'rgba(0,0,0,0.16)':'rgba(var(--primary-rgb),0.08)',borderRadius:8,padding:'5px 10px',marginBottom:6,cursor:onJump?'pointer':'default'}}>
      {name&&<div style={{fontWeight:700,fontSize:12,color:own?'rgba(255,255,255,0.95)':'var(--primary)',marginBottom:1}}>{name}</div>}
      <div style={{fontSize:12.5,color:own?'rgba(255,255,255,0.7)':'var(--text-tertiary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{quoted}</div>
    </div>
  )
}

// The quote-reply preview shown above the composer while replying.
export function ReplyComposerBar({ text, onCancel }) {
  if(!text) return null
  const idx = text.indexOf(': ')
  const name = idx>-1 ? text.slice(0,idx) : null
  const quoted = idx>-1 ? text.slice(idx+2) : text
  return (
    <div style={{padding:'8px 14px',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid var(--border-color)'}}>
      <div style={{width:3,alignSelf:'stretch',background:'var(--primary)',borderRadius:2,minHeight:28}}/>
      <div style={{flex:1,minWidth:0}}>
        {name&&<div style={{color:'var(--primary)',fontSize:12,fontWeight:700}}>{name}</div>}
        <div style={{color:'var(--text-tertiary)',fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{quoted}</div>
      </div>
      <button onClick={onCancel} style={{background:'none',border:'none',color:'var(--text-secondary)',cursor:'pointer',flexShrink:0,display:'flex'}}><X size={18}/></button>
    </div>
  )
}
