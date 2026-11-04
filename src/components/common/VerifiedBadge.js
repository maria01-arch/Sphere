'use client'

// The two badges, in one place so every screen shows them the same way:
//  - verified      -> gold ring with the Flitters mark (manual verification)
//  - isAuthentic   -> seal with a check: blue (Flitters Basic) or gold (Premium)
export const SEAL_PATH = 'M12 2L14.4 4.8L18 4L18.8 7.6L22 9.2L20.4 12.6L22 16L18.8 17.6L18 21.2L14.4 20.4L12 23.2L9.6 20.4L6 21.2L5.2 17.6L2 16L3.6 12.6L2 9.2L5.2 7.6L6 4L9.6 4.8Z'

export function VerifiedBadge({ verified, isAuthentic, plan, size = 18 }) {
  if (!verified && !isAuthentic) return null
  const premium = plan === 'premium'
  return (
    <>
      {verified && (
        <span title="Flitters Verified Member" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:size,height:size,borderRadius:'50%',background:'linear-gradient(135deg,#1a1a2e,#16213e)',border:`${size>=18?2:1.5}px solid #C9A84C`,boxShadow:size>=18?'0 0 6px rgba(201,168,76,0.6)':'none',flexShrink:0,cursor:'default'}}>
          <img src="/flitters-logo-white.svg" alt="Verified" width={Math.round(size*0.6)} height={Math.round(size*0.6)} style={{objectFit:'contain',display:'block'}}/>
        </span>
      )}
      {isAuthentic && (
        <span title={premium ? 'Flitters Premium' : 'Authentic — Real & Verified Person'} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:size,height:size,flexShrink:0,cursor:'default'}}>
          <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24">
            <path d={SEAL_PATH} fill={premium ? '#F5B301' : '#1877F2'}/>
            <polyline points="8,12.5 10.5,15 16,9" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      )}
    </>
  )
}
