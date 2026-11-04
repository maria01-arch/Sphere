'use client'
import { useVideoPrefs } from '@/lib/videoPrefs'

export function AutoplayToggleRow() {
  const { autoplay, setAutoplay } = useVideoPrefs()
  return (
    <button onClick={() => setAutoplay(!autoplay)} role="switch" aria-checked={autoplay}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: 'none', border: 'none', width: '100%', cursor: 'pointer', color: 'var(--text-primary)', borderBottom: '1px solid var(--bg-card-4)', textAlign: 'left', fontSize: 15 }}>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontWeight: 500 }}>Autoplay videos</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{autoplay ? 'Videos play by themselves as you scroll' : 'Videos wait until you tap play'}</span>
      </span>
      <span style={{ width: 46, height: 28, borderRadius: 14, background: autoplay ? 'var(--primary)' : 'var(--border-color-2)', position: 'relative', flexShrink: 0, transition: 'background .2s' }}>
        <span style={{ position: 'absolute', top: 3, left: autoplay ? 21 : 3, width: 22, height: 22, borderRadius: 11, background: '#fff', transition: 'left .2s' }} />
      </span>
    </button>
  )
}
