'use client'
import { useEffect, useState } from 'react'

// Shown to people who are NOT signed in on the website (this includes the
// WhatsApp/Telegram preview robot, which only reads the page's preview tags).
// A normal redirect() would send the robot away before it sees them, so this
// page answers 200 and sends real people on with JavaScript.
//
// On an Android phone the person is sent straight to the Flitters page on
// Google Play to install the app (once per visit — if they come back with the
// back button they see the buttons below instead, so nobody is trapped).
// People who already have the app normally never get here, because Android
// opens the link in the app itself.
const PACKAGE = 'com.xchordlabs.flitters'
const PLAY = 'https://play.google.com/store/apps/details?id=' + PACKAGE

export default function ClientRedirect({ to }) {
  const [android, setAndroid] = useState(false)

  useEffect(() => {
    const isAndroid = /Android/i.test(navigator.userAgent)
    const params = new URLSearchParams(window.location.search)
    if (isAndroid && params.get('web') !== '1') {
      setAndroid(true)
      let seen = false
      try { seen = sessionStorage.getItem('flitters_store_seen') === '1' } catch {}
      if (!seen) {
        try { sessionStorage.setItem('flitters_store_seen', '1') } catch {}
        // The referrer text travels with the install, so the app can open the
        // exact post/profile afterwards (optional, needs a small app change).
        window.location.replace(PLAY + '&referrer=' + encodeURIComponent('flitters_open=' + window.location.pathname))
      }
      return
    }
    window.location.replace(to)
  }, [to])

  const wrap = { minHeight: '100vh', background: '#090B10', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, fontFamily: 'sans-serif', padding: 24, textAlign: 'center' }
  const btn = { display: 'block', width: 260, padding: '13px 0', borderRadius: 14, fontSize: 16, fontWeight: 700, textDecoration: 'none' }

  if (!android) {
    return (
      <div style={wrap}>
        <a href={to} style={{ color: '#5B9CF6', fontSize: 16 }}>Continue to Flitters</a>
      </div>
    )
  }

  let open = '#'
  if (typeof window !== 'undefined') {
    open = 'intent://' + window.location.host + window.location.pathname + '#Intent;scheme=https;package=' + PACKAGE + ';S.browser_fallback_url=' + encodeURIComponent(PLAY) + ';end'
  }
  return (
    <div style={wrap}>
      <p style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Get Flitters</p>
      <p style={{ color: '#9AA3B2', margin: 0, maxWidth: 300 }}>Open this in the Flitters app.</p>
      <a href={PLAY} style={{ ...btn, background: '#3DA9FF', color: '#fff' }}>Get it on Google Play</a>
      <a href={open} style={{ ...btn, background: '#1A2030', color: '#fff' }}>Open in app</a>
      <a href={to} style={{ color: '#5B9CF6', fontSize: 15 }}>Continue on the web</a>
    </div>
  )
}
