'use client'
import { isUrlToken, splitTrailingPunct, urlHref } from '@/lib/links'

// Renders plain text with any URLs turned into clickable, colored links.
// Deliberately doesn't handle @mentions — that's TextWithMentions' job for
// feed content; chat bubbles use this directly since they don't have a
// mention feature.
// Tapping a #tag asks the app shell to open that hashtag's page.
export function openHashtag(tag) {
  if(typeof window!=='undefined') window.dispatchEvent(new CustomEvent('flitters:hashtag',{detail:{tag}}))
}

function Tags({ text }) {
  const parts = text.split(/((?:^|\s)#[\p{L}\p{N}_]+)/u)
  return <>{parts.map((part,i)=>{
    const m = part.match(/^(\s?)#([\p{L}\p{N}_]+)$/u)
    if(m && !/^\d+$/.test(m[2])) {
      return <span key={i}>{m[1]}<span onClick={e=>{e.stopPropagation();openHashtag(m[2].toLowerCase())}} style={{color:'var(--primary)',fontWeight:600,cursor:'pointer'}}>#{m[2]}</span></span>
    }
    return <span key={i}>{part}</span>
  })}</>
}

export function Linkify({ text, color='var(--primary)', tags=false }) {
  if(!text) return null
  const parts = text.split(/(https?:\/\/[^\s]+|www\.[a-zA-Z0-9][^\s]*)/g)
  return <>{parts.map((part,i)=>{
    if(isUrlToken(part)) {
      const [clean, trail] = splitTrailingPunct(part)
      return <span key={i}><a href={urlHref(clean)} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{color,textDecoration:'underline',wordBreak:'break-all'}}>{clean}</a>{trail}</span>
    }
    return tags ? <Tags key={i} text={part}/> : <span key={i}>{part}</span>
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
    return <Linkify key={i} text={part} color={linkColor} tags/>
  })}</>
}
