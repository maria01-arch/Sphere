'use client'
import { useState } from 'react'
import { EMOJI_CATEGORIES } from '@/lib/emojiData'

// ── EMOJI GRID (shared by DM + GroupChat, embedded in the combined tray below) ──
// Flat category-tab + grid layout. Selecting an emoji doesn't close the
// tray — WhatsApp/Telegram-style — so picking several in a row is one tap
// each instead of reopening the picker every time.
export function EmojiGrid({ onSelect }) {
  const [activeCat, setActiveCat] = useState(EMOJI_CATEGORIES[0].id)
  const cat = EMOJI_CATEGORIES.find(c=>c.id===activeCat) || EMOJI_CATEGORIES[0]
  return (
    <>
      <div style={{display:'flex',alignItems:'center',gap:4,padding:'8px 10px',overflowX:'auto',borderBottom:'1px solid var(--border-color)',flexShrink:0}}>
        {EMOJI_CATEGORIES.map(c=>(
          <button key={c.id} onClick={()=>setActiveCat(c.id)} title={c.label} style={{flexShrink:0,width:32,height:32,borderRadius:10,border:'none',background:activeCat===c.id?'rgba(var(--primary-rgb),0.2)':'transparent',fontSize:17,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{c.icon}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:8,display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,alignContent:'start'}}>
        {cat.emojis.map((e,i)=>(
          <button key={cat.id+i} onClick={()=>onSelect(e)} style={{aspectRatio:'1',background:'none',border:'none',fontSize:22,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:8}}>{e}</button>
        ))}
      </div>
    </>
  )
}
