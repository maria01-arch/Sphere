'use client'
import { useEffect, useState } from 'react'

// A small, optional banner for people on an Android phone's browser. The website works fully;
// the banner only offers the app:
//   - Has the Flitters app  -> "Open" opens it (on the exact page).
//   - Does not have it      -> "Get the app" goes to Google Play.
// (One link does both: Android's "intent" link opens the app if it is installed, and
// falls back to Google Play if it is not.) The X hides it for 7 days.
// Sign-in return pages, the API and the admin area never show it.
const PACKAGE = 'com.xchordlabs.flitters'
const PLAY = 'https://play.google.com/store/apps/details?id=' + PACKAGE
const SKIP = ['/paystack', '/auth/callback', '/auth/confirm', '/reset', '/api', '/admin', '/_next']
const KEY = 'flitters_banner_hidden_until'

export default function AndroidGate() {
  const [open, setOpen] = useState(null)

  useEffect(() => {
    const ua = navigator.userAgent || ''
    if (!/Android/i.test(ua)) return
    // The Flitters app's own web view must not show a banner inside itself.
    if (/FlittersApp|; wv\)/i.test(ua)) return
    const { pathname, search, host } = window.location
    if (SKIP.some((p) => pathname.startsWith(p))) return
    try { if (Number(localStorage.getItem(KEY) || 0) > Date.now()) return } catch {}
    const ref = encodeURIComponent('flitters_open=' + pathname)
    setOpen('intent://' + host + pathname + (search || '') + '#Intent;scheme=https;package=' + PACKAGE + ';S.browser_fallback_url=' + encodeURIComponent(PLAY + '&referrer=' + ref) + ';end')
  }, [])

  if (!open) return null
  const hide = () => { try { localStorage.setItem(KEY, String(Date.now() + 7 * 864e5)) } catch {}; setOpen(null) }
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 2147483000, background: '#0F1420', color: '#fff', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', fontFamily: 'sans-serif', borderBottom: '1px solid #232a3a' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>Flitters is better in the app</div>
        <div style={{ color: '#9AA3B2', fontSize: 12 }}>Faster, with calls and notifications.</div>
      </div>
      <a href={open} style={{ background: '#3DA9FF', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13, borderRadius: 10, padding: '9px 14px', whiteSpace: 'nowrap' }}>Open app</a>
      <button onClick={hide} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: '#9AA3B2', fontSize: 22, lineHeight: 1, padding: '2px 4px', cursor: 'pointer' }}>×</button>
    </div>
  )
}
