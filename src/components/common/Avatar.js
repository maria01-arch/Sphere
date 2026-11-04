'use client'
import { useState, useEffect } from 'react'

// A friendly flat 2D person, drawn in SVG, used whenever a profile has no
// picture (or the picture fails to load). It is picked from the person's
// name so each person always gets the same face, but different people look
// different (skin tone, hair style, hair color, clothes). No network needed.
const SKINS = ['#F6D5BD', '#EDBB98', '#D9A07A', '#B97C58', '#8D5A3C', '#6B4128']
const HAIRS = ['#1F1A17', '#3B2A20', '#5A3A25', '#8A5A2B', '#C9A24B', '#2E2E3A']
const CLOTHES = ['#3DA9FF', '#845EF7', '#FF6B35', '#00BA7C', '#F7B731', '#FD79A8', '#5B6478', '#EF4444']

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

export function DefaultAvatar({ seed = '', color, size = 42 }) {
  const h = hash(String(seed || 'x'))
  const skin = SKINS[h % SKINS.length]
  const hair = HAIRS[(h >>> 3) % HAIRS.length]
  const style = (h >>> 6) % 4 // 0 short, 1 long, 2 bun, 3 curly-top
  const cloth = CLOTHES[(h >>> 9) % CLOTHES.length]
  const bg = color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#3DA9FF'
  const id = 'da' + (h % 100000)
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{display:'block',borderRadius:'50%'}} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={bg} stopOpacity="0.55"/>
          <stop offset="1" stopColor={bg} stopOpacity="0.95"/>
        </linearGradient>
        <clipPath id={id + 'c'}><circle cx="50" cy="50" r="50"/></clipPath>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <rect width="100" height="100" fill={`url(#${id})`}/>
        {/* long hair sits behind the head */}
        {style === 1 && <path d="M30 46 C26 20 40 13 50 13 C60 13 74 20 70 46 L74 76 L26 76 Z" fill={hair}/>}
        {/* shoulders / clothes */}
        <path d="M10 104 C12 78 28 69 50 69 C72 69 88 78 90 104 Z" fill={cloth}/>
        <path d="M40 69 C44 77 56 77 60 69 Z" fill="rgba(0,0,0,0.18)"/>
        {/* neck */}
        <rect x="43.5" y="55" width="13" height="17" rx="6" fill={skin}/>
        <rect x="43.5" y="62" width="13" height="6" rx="3" fill="rgba(0,0,0,0.12)"/>
        {/* head */}
        <ellipse cx="50" cy="42" rx="17" ry="19" fill={skin}/>
        {/* hair on top */}
        {style === 0 && <path d="M32.5 41 C30 22 42 17 50 17 C58 17 70 22 67.5 41 C63 33 57 29.5 50 29.5 C43 29.5 37 33 32.5 41 Z" fill={hair}/>}
        {style === 1 && <path d="M32.5 42 C31 24 42 18 50 18 C58 18 69 24 67.5 42 C62 31 38 31 32.5 42 Z" fill={hair}/>}
        {style === 2 && <><circle cx="50" cy="15" r="7.5" fill={hair}/><path d="M32.5 41 C30 22 42 18 50 18 C58 18 70 22 67.5 41 C63 33 57 29.5 50 29.5 C43 29.5 37 33 32.5 41 Z" fill={hair}/></>}
        {style === 3 && <><circle cx="38" cy="24" r="8" fill={hair}/><circle cx="50" cy="20" r="9" fill={hair}/><circle cx="62" cy="24" r="8" fill={hair}/><path d="M32.5 40 C34 30 40 28 50 28 C60 28 66 30 67.5 40 C62 34 38 34 32.5 40 Z" fill={hair}/></>}
        {/* face */}
        <circle cx="43.5" cy="44" r="1.9" fill="#2B2B33"/>
        <circle cx="56.5" cy="44" r="1.9" fill="#2B2B33"/>
        <path d="M44.5 51.5 C47.5 54.5 52.5 54.5 55.5 51.5" stroke="#2B2B33" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
        <ellipse cx="38.5" cy="49" rx="3" ry="2" fill="#FF8A8A" opacity="0.22"/>
        <ellipse cx="61.5" cy="49" rx="3" ry="2" fill="#FF8A8A" opacity="0.22"/>
      </g>
    </svg>
  )
}

// Used everywhere a person's avatar is shown. If there is no picture, or the
// picture is broken / not found, it shows the 2D person above instead.
export function Avatar({ url, name='', color='#3DA9FF', size=42, online=false }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [url])
  const ring = '0 0 0 2px var(--bg-app)'
  return (
    <div style={{position:'relative',flexShrink:0,display:'inline-block',width:size,height:size}}>
      {url && !failed
        ? <img src={url} alt={name} onError={()=>setFailed(true)} style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',boxShadow:ring,background:'var(--bg-card-2)',display:'block'}} loading="lazy"/>
        : <div style={{width:size,height:size,borderRadius:'50%',boxShadow:ring,overflow:'hidden'}}><DefaultAvatar seed={name||color} color={color} size={size}/></div>
      }
      {online&&<div style={{position:'absolute',bottom:1,right:1,width:size*0.27,height:size*0.27,borderRadius:'50%',background:'var(--repost)',border:'2px solid var(--bg-app)'}}/>}
    </div>
  )
}
