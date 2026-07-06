'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import XchordApp from '@/components/SphereApp'

export default function Home() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth'; return }
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(data)
      // fade out loading screen smoothly
      setFadeOut(true)
      setTimeout(() => setLoading(false), 600)
    }
    init()
  }, [])

  if (loading) return (
    <div style={{
      minHeight:'100vh', background:'#090B10',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', gap:24,
      opacity: fadeOut ? 0 : 1,
      transition: 'opacity 0.6s ease',
    }}>
      {/* Xchord Logo */}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
        <svg width="110" height="90" viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="LGLD" x1="0" y1="0" x2="160" y2="130" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#A855F7"/>
      <stop offset="100%" stopColor="#06B6D4"/>
    </linearGradient>
    <clipPath id="BEHINDLD">
      <rect x="0" y="0" width="80" height="130"/>
    </clipPath>
    <clipPath id="FRONTLD">
      <rect x="80" y="0" width="80" height="130"/>
    </clipPath>
  </defs>

  <!-- BACK half of ring (left side, behind planet) -->
  <ellipse cx="83" cy="78" rx="70" ry="18"
    stroke="url(#LGLD)" strokeWidth="9" fill="none" strokeLinecap="round"
    transform="rotate(-18 83 78)"
    clip-path="url(#BEHINDLD)" opacity="0.55"/>

  <!-- Planet filled circle -->
  <circle cx="80" cy="62" r="46" fill="url(#LGLD)"/>

  <!-- X inside planet - BLACK bold strokes -->
  <line x1="52" y1="36" x2="108" y2="88" stroke="#090B10" strokeWidth="16" strokeLinecap="round"/>
  <line x1="108" y1="36" x2="52" y2="88" stroke="#090B10" strokeWidth="16" strokeLinecap="round"/>

  <!-- FRONTLD half of ring (right side, in front of planet) -->
  <ellipse cx="83" cy="78" rx="70" ry="18"
    stroke="url(#LGLD)" strokeWidth="9" fill="none" strokeLinecap="round"
    transform="rotate(-18 83 78)"
    clip-path="url(#FRONTLD)"/>
</svg>

        <div style={{textAlign:'center'}}>
          <div style={{
            fontWeight:900, fontSize:28, letterSpacing:6,
            background:'linear-gradient(135deg,#A855F7,#06B6D4)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'
          }}>XCHORD</div>
          <div style={{color:'#333',fontSize:10,letterSpacing:3,marginTop:2}}>SOCIAL MEDIA PLATFORM</div>
        </div>
      </div>

      {/* Animated loading bar */}
      <div style={{width:120,height:2,background:'rgba(255,255,255,0.05)',borderRadius:2,overflow:'hidden'}}>
        <div style={{
          height:'100%',
          background:'linear-gradient(90deg,#A855F7,#06B6D4)',
          borderRadius:2,
          animation:'xload 1.4s ease-in-out infinite',
        }}/>
      </div>

      <div style={{color:'#333',fontSize:11,letterSpacing:2}}>CONNECT. SHARE. AMPLIFY.</div>

      <style>{`
        @keyframes xload {
          0% { width:0%; margin-left:0%; }
          50% { width:70%; margin-left:15%; }
          100% { width:0%; margin-left:100%; }
        }
      `}</style>
    </div>
  )

  return <XchordApp currentUser={profile}/>
}
