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
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="sphere_grad" cx="38%" cy="32%" r="60%">
              <stop offset="0%" stopColor="#555"/>
              <stop offset="40%" stopColor="#1a1a1a"/>
              <stop offset="100%" stopColor="#000"/>
            </radialGradient>
            <radialGradient id="shine" cx="35%" cy="28%" r="45%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.35)"/>
              <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
            </radialGradient>
            <linearGradient id="x_grad" x1="20" y1="20" x2="60" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff"/>
              <stop offset="50%" stopColor="#cccccc"/>
              <stop offset="100%" stopColor="#888888"/>
            </linearGradient>
          </defs>
          {/* Sphere body */}
          <circle cx="40" cy="40" r="38" fill="url(#sphere_grad)"/>
          {/* Shine */}
          <circle cx="40" cy="40" r="38" fill="url(#shine)"/>
          {/* X mark - chrome style */}
          <line x1="22" y1="22" x2="58" y2="58" stroke="url(#x_grad)" strokeWidth="9" strokeLinecap="round"/>
          <line x1="58" y1="22" x2="22" y2="58" stroke="url(#x_grad)" strokeWidth="9" strokeLinecap="round"/>
          {/* Sphere border */}
          <circle cx="40" cy="40" r="38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
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
