'use client'
import { useEffect, useState } from 'react'

// Covers the whole website for anyone on an Android phone's browser.
//   - Has the Flitters app  -> "Open in app" opens it (on the exact page).
//   - Does not have it      -> the same button goes to Google Play to install.
// (One button does both: Android's own "intent" link opens the app if it is
// installed, and falls back to Google Play if it is not.)
// Add ?web=1 to any address to look at the website anyway (remembered for the visit).
// Sign-in return pages, the API and the admin area are never covered, so email
// links (password reset, confirm email) and the admin console keep working.
const PACKAGE = 'com.xchordlabs.flitters'
const PLAY = 'https://play.google.com/store/apps/details?id=' + PACKAGE
const SKIP = ['/auth/callback', '/auth/confirm', '/reset', '/api', '/admin', '/_next']

export default function AndroidGate() {
  const [show, setShow] = useState(false)
  const [links, setLinks] = useState({ open: '#', play: PLAY })

  useEffect(() => {
    const ua = navigator.userAgent || ''
    if (!/Android/i.test(ua)) return
    const { pathname, search, host } = window.location
    if (SKIP.some((p) => pathname.startsWith(p))) return
    const params = new URLSearchParams(search)
    try {
      if (params.get('web') === '1') sessionStorage.setItem('flitters_web_ok', '1')
      if (sessionStorage.getItem('flitters_web_ok') === '1') return
    } catch {}
    const open = 'intent://' + host + pathname + (search || '') + '#Intent;scheme=https;package=' + PACKAGE + ';S.browser_fallback_url=' + encodeURIComponent(PLAY + '&referrer=' + encodeURIComponent('flitters_open=' + pathname)) + ';end'
    setLinks({ open, play: PLAY + '&referrer=' + encodeURIComponent('flitters_open=' + pathname) })
    setShow(true)
    // Try it straight away. Some browsers only allow this after a tap, which is
    // why the big buttons are there.
    try { window.location.href = open } catch {}
  }, [])

  if (!show) return null
  const btn = { display: 'block', width: 270, padding: '14px 0', borderRadius: 14, fontSize: 16, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2147483647, background: '#090B10', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, fontFamily: 'sans-serif', padding: 24, textAlign: 'center' }}>
      <p style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Flitters is better in the app</p>
      <p style={{ color: '#9AA3B2', margin: 0, maxWidth: 300 }}>Open it in the Flitters app, or install it from Google Play.</p>
      <a href={links.open} style={{ ...btn, background: '#3DA9FF', color: '#fff' }}>Open in app</a>
      <a href={links.play} style={{ ...btn, background: '#1A2030', color: '#fff' }}>Get it on Google Play</a>
    </div>
  )
}
