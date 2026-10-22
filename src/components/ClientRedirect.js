'use client'
import { useEffect } from 'react'

// A normal redirect() answers the link-preview robot with "go somewhere else",
// so it never sees the page's own preview tags. This page answers 200 (with the
// preview tags) and sends real people on with JavaScript instead.
export default function ClientRedirect({ to }) {
  useEffect(() => {
    window.location.replace(to)
  }, [to])
  return (
    <div style={{ minHeight: '100vh', background: '#090B10', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <a href={to} style={{ color: '#5B9CF6', fontSize: 16 }}>Continue to Flitters</a>
    </div>
  )
}
