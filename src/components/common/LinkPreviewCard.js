'use client'
import { useEffect, useState } from 'react'

// In-memory only — a link's metadata doesn't change within a session, and
// re-fetching every time a message scrolls back into view would be wasteful.
export const linkPreviewCache = new Map()

export function LinkPreviewCard({ url, own }) {
  const [data, setData] = useState(()=>linkPreviewCache.get(url)||null)
  const [failed, setFailed] = useState(false)
  useEffect(()=>{
    if(!url) return
    if(linkPreviewCache.has(url)) { setData(linkPreviewCache.get(url)); return }
    let cancelled = false
    fetch('/api/link-preview?url='+encodeURIComponent(url)).then(r=>r.json()).then(json=>{
      if(cancelled) return
      if(json.error || (!json.title && !json.image)) { setFailed(true); return }
      linkPreviewCache.set(url, json)
      setData(json)
    }).catch(()=>{ if(!cancelled) setFailed(true) })
    return ()=>{cancelled=true}
  },[url])
  // No skeleton/loading state on purpose — most links either resolve in a
  // few hundred ms or never resolve at all (blocked, broken, no og tags),
  // and a permanent "loading" card for the latter would look broken.
  if(!url || failed || !data) return null
  return (
    <a href={data.url||url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
      style={{display:'block',marginTop:8,borderRadius:12,overflow:'hidden',textDecoration:'none',
        background:own?'rgba(255,255,255,0.15)':'var(--bg-card-2)',
        border:own?'1px solid rgba(255,255,255,0.25)':'1px solid var(--border-color-2)'}}>
      {data.image&&<img src={data.image} alt="" loading="lazy" style={{width:'100%',maxHeight:160,objectFit:'cover',display:'block'}}/>}
      <div style={{padding:'8px 10px'}}>
        {data.title&&<div style={{color:own?'#fff':'var(--text-primary)',fontSize:13,fontWeight:700,marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{data.title}</div>}
        {data.description&&<div style={{color:own?'rgba(255,255,255,0.8)':'var(--text-quaternary)',fontSize:12,marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{data.description}</div>}
        {data.domain&&<div style={{color:own?'rgba(255,255,255,0.65)':'var(--text-quaternary)',fontSize:11}}>{data.domain}</div>}
      </div>
    </a>
  )
}
