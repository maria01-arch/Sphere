'use client'
import { isUrlToken, splitTrailingPunct, urlHref } from '@/lib/links'

// Renders plain text with any URLs turned into clickable, colored links.
// Deliberately doesn't handle @mentions — that's TextWithMentions' job for
// feed content; chat bubbles use this directly since they don't have a
// mention feature.
export function Linkify({ text, color='var(--primary)' }) {
  if(!text) return null
  const parts = text.split(/(https?:\/\/[^\s]+|www\.[a-zA-Z0-9][^\s]*)/g)
  return <>{parts.map((part,i)=>{
    if(isUrlToken(part)) {
      const [clean, trail] = splitTrailingPunct(part)
      return <span key={i}><a href={urlHref(clean)} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{color,textDecoration:'underline',wordBreak:'break-all'}}>{clean}</a>{trail}</span>
    }
    return <span key={i}>{part}</span>
  })}</>
}

export function TextWithMentions({ text, supabase, onUserClick, linkColor='var(--primary)' }) {
  if(!text) return null
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g)
  return <>{parts.map((part,i)=>{
    if(part.startsWith('@')&&part.length>1){
      const handle = part.slice(1)
      return <span key={i} onClick={async(e)=>{
        e.stopPropagation()
        const {data} = await supabase.from('profiles').select('*').eq('username',handle.toLowerCase()).maybeSingle()
        if(data) onUserClick(data)
      }} style={{color:'var(--primary)',fontWeight:600,cursor:'pointer'}}>{part}</span>
    }
    return <Linkify key={i} text={part} color={linkColor}/>
  })}</>
}
