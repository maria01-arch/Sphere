'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)
  const [stuckDebug, setStuckDebug] = useState(null) // set only if nothing resolves in time
  const supabase = createClient()

  useEffect(() => {
    let unsub = null
    let settled = false
    const search = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))

    // Supabase puts error/error_description directly in the URL for an
    // expired or already-used link — this was previously ignored entirely,
    // which is its own way to get stuck on "Checking link..." forever.
    const linkError = search.get('error_description') || hash.get('error_description') || search.get('error') || hash.get('error')
    if (linkError) { settled = true; setStuckDebug({ reason: 'link_error', detail: decodeURIComponent(linkError) }); return }

    const check = async () => {
      const code = search.get('code')
      if (code) {
        const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
        if (!exchangeErr) { settled = true; setReady(true); return }
        // A failed exchange here usually means the code_verifier isn't in
        // this browser's storage — e.g. the reset was requested in a
        // different browser/app than the one the link was opened in, which
        // PKCE flow can't recover from. Surface that plainly instead of
        // falling through to an infinite hash-listener wait.
        settled = true
        setStuckDebug({ reason: 'exchange_failed', detail: exchangeErr.message })
        return
      }
      // Fallback: some link formats use the older hash-based flow instead.
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') { settled = true; setReady(true) }
      })
      unsub = data?.subscription
    }
    check()

    // If nothing above resolved within 6s, show exactly what's in the URL
    // (keys only, values truncated) so this can actually be diagnosed
    // instead of guessed at again.
    const timer = setTimeout(() => {
      if (!settled) {
        setStuckDebug({
          reason: 'timeout',
          detail: JSON.stringify({
            searchKeys: [...search.keys()],
            hashKeys: [...hash.keys()],
            hasCode: search.has('code'),
            hasAccessToken: hash.has('access_token'),
            type: search.get('type') || hash.get('type') || null,
          })
        })
      }
    }, 6000)

    return () => { unsub?.unsubscribe(); clearTimeout(timer) }
  }, [])

  const handleReset = async () => {
    setError('')
    if (!password || password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else setSuccess(true)
    setLoading(false)
  }

  const inp = { width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '13px 16px', color: '#fff', fontSize: 15, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090B10', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '40px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <img src="/flitters-mark.png" alt="Flitters" width="40" height="40" style={{ objectFit: 'contain' }} />
          <span style={{ fontWeight: 900, fontSize: 24, background: 'linear-gradient(135deg,#A855F7,#06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>Flitters</span>
        </div>

        {success ? <>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontWeight: 700, fontSize: 20, color: '#fff', marginBottom: 8 }}>Password Updated!</h2>
            <p style={{ color: '#555', fontSize: 14, marginBottom: 24 }}>Your password has been successfully changed.</p>
            <button onClick={() => window.location.href = '/'} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#A855F7,#06B6D4)', border: 'none', borderRadius: 14, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Go to Flitters
            </button>
          </div>
        </> : !ready ? <>
          {stuckDebug ? <>
            <h1 style={{ fontWeight: 700, fontSize: 22, marginBottom: 8, color: '#fff' }}>This link isn't working</h1>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>
              {stuckDebug.reason === 'link_error' ? 'Supabase says: ' + stuckDebug.detail
                : stuckDebug.reason === 'exchange_failed' ? 'Could not verify this link: ' + stuckDebug.detail
                : 'Nothing in the link matched what was expected.'}
            </p>
            <p style={{ color: '#555', fontSize: 14, marginBottom: 8 }}><span onClick={() => window.location.href = '/auth'} style={{ color: '#A855F7', cursor: 'pointer' }}>Request a new reset link</span> — make sure to open it in the same browser/app you requested it from.</p>
            {stuckDebug.reason === 'timeout' && <p style={{ color: '#444', fontSize: 11, marginTop: 16, wordBreak: 'break-all' }}>Debug: {stuckDebug.detail}</p>}
          </> : <>
            <h1 style={{ fontWeight: 700, fontSize: 22, marginBottom: 8, color: '#fff' }}>Checking link...</h1>
            <p style={{ color: '#555', fontSize: 14 }}>If this takes too long, your reset link may have expired. <span onClick={() => window.location.href = '/auth'} style={{ color: '#A855F7', cursor: 'pointer' }}>Request a new one</span>.</p>
          </>}
        </> : <>
          <h1 style={{ fontWeight: 700, fontSize: 22, marginBottom: 6, color: '#fff' }}>Set New Password</h1>
          <p style={{ color: '#555', fontSize: 14, marginBottom: 24 }}>Choose a strong password for your account</p>
          <input style={inp} type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} />
          <input style={inp} type="password" placeholder="Confirm new password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleReset()} />
          {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,71,87,0.1)', color: '#FF4757', fontSize: 13, marginBottom: 14 }}>{error}</div>}
          <button onClick={handleReset} disabled={loading} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#A855F7,#06B6D4)', border: 'none', borderRadius: 14, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </>}
      </div>
    </div>
  )
}
