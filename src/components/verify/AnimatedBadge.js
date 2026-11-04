'use client'
import { useId } from 'react'
import { SEAL_PATH } from '@/components/common/VerifiedBadge'

// Big animated badge for the Get Verified page: the seal turns around its
// vertical axis, floats, glows, and keeps releasing little stars.
// Blue = Flitters Basic, gold = Flitters Premium. Pure CSS animation.
const STAR = 'M12 0 L14.2 9.8 L24 12 L14.2 14.2 L12 24 L9.8 14.2 L0 12 L9.8 9.8 Z'
const THEME = {
  basic:   { a: '#5AA9FF', b: '#1877F2', c: '#0B4BB5', star: '#7DB8FF', glow: '#1877F2' },
  premium: { a: '#FFE27A', b: '#F5B301', c: '#B37A00', star: '#FFD84D', glow: '#F5B301' },
}
const COUNT = 10

export function AnimatedBadge({ plan = 'basic', size = 150 }) {
  const th = THEME[plan] || THEME.basic
  const uid = useId().replace(/:/g, '')
  const box = size * 2.1
  const stars = Array.from({ length: COUNT }, (_, i) => {
    const angle = i * (360 / COUNT) + (i % 2 ? 12 : -8)
    const r = size * (i % 2 ? 0.78 : 0.95)
    const rad = angle * Math.PI / 180
    return { dx: Math.cos(rad) * r, dy: Math.sin(rad) * r, sz: i % 3 === 0 ? 20 : 13, delay: i * 0.22 }
  })
  return (
    <div className="fb-wrap" style={{width:box,height:box,position:'relative',display:'flex',alignItems:'center',justifyContent:'center',maxWidth:'100%'}}>
      <style>{`
        @keyframes fbSpin{from{transform:rotateY(0deg)}to{transform:rotateY(360deg)}}
        @keyframes fbFloat{0%,100%{transform:translateY(-7px)}50%{transform:translateY(7px)}}
        @keyframes fbGlow{0%,100%{opacity:.35;transform:scale(.9)}50%{opacity:.75;transform:scale(1.1)}}
        @keyframes fbStar{0%{opacity:0;transform:translate(calc(var(--dx)*.45),calc(var(--dy)*.45)) scale(.2) rotate(0)}15%{opacity:1}70%{opacity:.8}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.4) rotate(120deg)}}
        @media (prefers-reduced-motion: reduce){.fb-anim,.fb-anim *{animation:none !important}}
      `}</style>
      <div className="fb-anim" style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none',animation:'fbGlow 3s ease-in-out infinite'}}>
        <svg width={size*1.9} height={size*1.9} viewBox="0 0 100 100">
          <defs><radialGradient id={uid+'g'} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={th.glow} stopOpacity="0.55"/><stop offset="100%" stopColor={th.glow} stopOpacity="0"/></radialGradient></defs>
          <circle cx="50" cy="50" r="50" fill={`url(#${uid}g)`}/>
        </svg>
      </div>
      {stars.map((s, i) => (
        <div key={i} className="fb-anim" style={{position:'absolute',left:'50%',top:'50%',marginLeft:-s.sz/2,marginTop:-s.sz/2,pointerEvents:'none',opacity:0,'--dx':s.dx+'px','--dy':s.dy+'px',animation:`fbStar 2.2s ${s.delay}s ease-out infinite`}}>
          <svg width={s.sz} height={s.sz} viewBox="0 0 24 24"><path d={STAR} fill={th.star}/></svg>
        </div>
      ))}
      <div className="fb-anim" style={{perspective:900,animation:'fbFloat 3.6s ease-in-out infinite'}}>
        <div className="fb-anim" style={{animation:'fbSpin 4.2s cubic-bezier(.65,0,.35,1) infinite',transformStyle:'preserve-3d'}}>
          <svg width={size} height={size} viewBox="0 0 24 24" style={{display:'block'}}>
            <defs><linearGradient id={uid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={th.a}/><stop offset="0.55" stopColor={th.b}/><stop offset="1" stopColor={th.c}/></linearGradient></defs>
            <path d={SEAL_PATH} fill={`url(#${uid})`}/>
            <polyline points="8,12.5 10.5,15 16,9" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  )
}
