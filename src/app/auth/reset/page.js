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
  const supabase = createClient()

  useEffect(() => {
    // Supabase puts the session in the URL hash on redirect
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
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
          <h1 style={{ fontWeight: 700, fontSize: 22, marginBottom: 8, color: '#fff' }}>Checking link...</h1>
          <p style={{ color: '#555', fontSize: 14 }}>If this takes too long, your reset link may have expired. <span onClick={() => window.location.href = '/auth'} style={{ color: '#A855F7', cursor: 'pointer' }}>Request a new one</span>.</p>
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
