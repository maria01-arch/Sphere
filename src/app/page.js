'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FLITTERS_MARK } from '@/lib/flitters-mark'
import FlittersApp from '@/components/SphereApp'
import LandingPage from '@/components/LandingPage'
import { Search, Settings } from 'lucide-react'

export default function Home() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failedToLoad, setFailedToLoad] = useState(false)
  const [showLanding, setShowLanding] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setShowLanding(true); setLoading(false); return }

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
      setLoading(false)
    }
    init()
  }, [])

  if (showLanding) return <LandingPage />

  if (failedToLoad) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-app)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
      <img src={FLITTERS_MARK} alt="Flitters" width="70" height="70" style={{ objectFit: 'contain' }} />
      <p style={{ fontSize: 16, fontWeight: 700 }}>Setting up your account</p>
      <p style={{ color: 'var(--text-tertiary)', fontSize: 14, maxWidth: 320 }}>This is taking longer than expected. Please try again in a moment.</p>
      <button onClick={() => window.location.reload()} style={{ marginTop: 8, background: 'linear-gradient(135deg,#A855F7,#06B6D4)', border: 'none', borderRadius: 14, padding: '12px 28px', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Try Again</button>
    </div>
  )

  // Uses the same CSS theme variables as the real app (var(--bg-app) etc.)
  // instead of hardcoded dark colors — the old hardcoded version was always
  // dark regardless of the person's actual saved theme, which is what
  // caused a visible dark-then-light flash for anyone using light mode.
  //
  // The header here mirrors the real one almost exactly (same icon, same
  // search/settings icons, real — not placeholder — since none of that
  // needs user data to render) rather than disappearing into a full-screen
  // skeleton. Only the avatar (which needs the profile that's still
  // loading) and the feed rows below are actual skeleton placeholders.
  if (loading) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'calc(10px + env(safe-area-inset-top)) 16px 10px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{width:36,height:36,borderRadius:'50%',background:'var(--bg-card-3)',animation:'skeletonPulse 1.4s ease-in-out infinite'}}/>
        <div style={{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',display:'flex'}}>
          <img src={FLITTERS_MARK} alt="Flitters" width="36" height="36" style={{objectFit:'contain'}}/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <Search size={22} color="var(--text-muted)"/>
          <Settings size={22} color="var(--text-muted)"/>
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, flexShrink: 0, background: 'var(--bg-card-3)', animation: 'skeletonPulse 1.4s ease-in-out infinite' }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: 120, height: 13, borderRadius: 6, marginBottom: 8, background: 'var(--bg-card-3)', animation: 'skeletonPulse 1.4s ease-in-out infinite' }} />
            <div style={{ width: '90%', height: 13, borderRadius: 6, marginBottom: 6, background: 'var(--bg-card-3)', animation: 'skeletonPulse 1.4s ease-in-out infinite' }} />
            <div style={{ width: '60%', height: 13, borderRadius: 6, background: 'var(--bg-card-3)', animation: 'skeletonPulse 1.4s ease-in-out infinite' }} />
          </div>
        </div>
      ))}
      <style>{`@keyframes skeletonPulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
    </div>
  )

  return <FlittersApp currentUser={profile} />
}
