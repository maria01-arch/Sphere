'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import FlittersApp from '@/components/SphereApp'

export default function Home() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const [failedToLoad, setFailedToLoad] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth'; return }

      // The profile row is created by a database trigger right after signup —
      // there can be a brief race where it hasn't landed yet. Retry a few times
      // before giving up, instead of rendering the app with a null profile.
      let data = null
      for (let attempt = 0; attempt < 6; attempt++) {
        const { data: row } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
        if (row) { data = row; break }
        await new Promise(r => setTimeout(r, 500))
      }

      if (!data) {
        setFailedToLoad(true)
        setLoading(false)
        return
      }

      setProfile(data)
      // fade out loading screen smoothly
      setFadeOut(true)
      setTimeout(() => setLoading(false), 600)
    }
    init()
  }, [])

  if (failedToLoad) return (
    <div style={{ minHeight: '100dvh', background: '#090B10', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
      <img src="/flitters-mark.png" alt="Flitters" width="70" height="70" style={{ objectFit: 'contain' }} />
      <p style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>Setting up your account</p>
      <p style={{ color: '#888', fontSize: 14, maxWidth: 320 }}>This is taking longer than expected. Please try again in a moment.</p>
      <button onClick={() => window.location.reload()} style={{ marginTop: 8, background: 'linear-gradient(135deg,#A855F7,#06B6D4)', border: 'none', borderRadius: 14, padding: '12px 28px', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Try Again</button>
    </div>
  )

  if (loading) return (
    <div style={{
      minHeight: '100dvh', background: '#090B10',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
      opacity: fadeOut ? 0 : 1,
      transition: 'opacity 0.6s ease',
    }}>
      {/* Flitters Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ animation: 'xspin 2.2s ease-in-out infinite' }}>
          <img src="/flitters-mark.png" alt="Flitters" width="110" height="110" style={{ objectFit: 'contain' }} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontWeight: 900, fontSize: 28, letterSpacing: 6, margin: 0,
            background: 'linear-gradient(135deg,#A855F7,#06B6D4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>FLITTERS</h1>
          <p style={{ color: '#333', fontSize: 10, letterSpacing: 3, marginTop: 2 }}>SOCIAL MEDIA PLATFORM</p>
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

      <div style={{ color: '#333', fontSize: 11, letterSpacing: 2 }}>CONNECT. SHARE. FLIT.</div>

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

  return <FlittersApp currentUser={profile} />
}

