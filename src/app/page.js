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
      minHeight: '100vh', background: '#090B10',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
      opacity: fadeOut ? 0 : 1,
      transition: 'opacity 0.6s ease',
    }}>
      {/* Xchord Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ animation: 'xspin 2.2s ease-in-out infinite' }}>
          <img src="/xchord-logo-white.svg" alt="Xchord" width="110" height="110" style={{ objectFit: 'contain' }} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontWeight: 900, fontSize: 28, letterSpacing: 6,
            background: 'linear-gradient(135deg,#A855F7,#06B6D4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>XCHORD</div>
          <div style={{ color: '#333', fontSize: 10, letterSpacing: 3, marginTop: 2 }}>SOCIAL MEDIA PLATFORM</div>
        </div>
      </div>

      {/* Animated loading bar */}
      <div style={{ width: 120, height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg,#A855F7,#06B6D4)',
          borderRadius: 2,
          animation: 'xload 1.4s ease-in-out infinite',
        }} />
      </div>

      <div style={{ color: '#333', fontSize: 11, letterSpacing: 2 }}>CONNECT. SHARE. AMPLIFY.</div>

      <style>{`
        @keyframes xload {
          0% { width:0%; margin-left:0%; }
          50% { width:70%; margin-left:15%; }
          100% { width:0%; margin-left:100%; }
        }
        @keyframes xspin {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.06) rotate(6deg); }
        }
      `}</style>
    </div>
  )

  return <XchordApp currentUser={profile} />
}
