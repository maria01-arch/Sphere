'use client'

// Hero image lives at /public/landing-hero.jpg — swap the file directly to
// change it, no code change needed. The slow pan/zoom below is pure CSS
// (no video), so there's no autoplay risk and it loads instantly.
export default function LandingPage() {
  return (
    <div style={{ position: 'relative', minHeight: '100dvh', overflow: 'hidden', background: '#0a0e1a' }}>
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'url(/landing-hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'heroKenBurns 24s ease-in-out infinite alternate',
        }}
      />

      {/* Gradient over the art so the logo/text/button stay readable
          regardless of what's busy underneath — same approach Bluesky's own
          landing page uses over a similarly detailed illustration. */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(180deg, rgba(10,14,26,0.55) 0%, rgba(10,14,26,0.15) 35%, rgba(10,14,26,0.55) 65%, rgba(10,14,26,0.92) 100%)'
      }} />

      <div style={{
        position: 'relative', zIndex: 2, minHeight: '100dvh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
        padding: 'calc(32px + env(safe-area-inset-top)) 24px calc(40px + env(safe-area-inset-bottom))',
        textAlign: 'center', boxSizing: 'border-box',
      }}>
        <img src="/flitters-mark.png" alt="Flitters" width={44} height={44} style={{ objectFit: 'contain' }} />

        <div>
          <h1 style={{ color: '#fff', fontSize: 34, fontWeight: 800, lineHeight: 1.15, margin: 0, textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
            Connect. Share. Flit.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, lineHeight: 1.5, maxWidth: 340, margin: '14px auto 0', textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
            Join Flitters and start sharing moments, stories, and conversations with people who get you.
          </p>
        </div>

        <div style={{ width: '100%', maxWidth: 340 }}>
          <a href="/auth" style={{
            display: 'block', width: '100%', boxSizing: 'border-box',
            background: 'linear-gradient(135deg,#5B9CF6,#845EF7)', color: '#fff',
            border: 'none', borderRadius: 16, padding: '16px', fontWeight: 700, fontSize: 16,
            textDecoration: 'none', cursor: 'pointer',
          }}>
            Start Messaging
          </a>
        </div>
      </div>

      <style>{`
        @keyframes heroKenBurns {
          from { transform: scale(1) translate(0, 0); }
          to   { transform: scale(1.12) translate(-1.5%, -1.5%); }
        }
      `}</style>
    </div>
  )
}

