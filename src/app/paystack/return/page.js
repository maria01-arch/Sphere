'use client'
import { useEffect, useState } from 'react'
import { authJsonHeaders } from '@/lib/api'

// Paystack sends people back here after paying. We ask the server to confirm the payment and
// switch the badge on, then send them back to the app.
export default function PaystackReturn() {
  const [state, setState] = useState('checking') // checking | done | pending | failed | signin
  const [plan, setPlan] = useState('')

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const reference = q.get('reference') || q.get('trxref')
    if (!reference) { setState('failed'); return }
    let dead = false
    ;(async () => {
      for (let i = 0; i < 6 && !dead; i++) {
        try {
          const res = await fetch('/api/paystack/verify', { method: 'POST', headers: await authJsonHeaders(), body: JSON.stringify({ reference }) })
          if (res.status === 401) { setState('signin'); return }
          const j = await res.json().catch(() => ({}))
          if (j.ok) { setPlan(j.plan || ''); setState('done'); return }
          if (j.status === 'failed' || j.status === 'abandoned' || j.reason === 'amount mismatch') { setState('failed'); return }
        } catch {}
        await new Promise(r => setTimeout(r, 2500))
      }
      if (!dead) setState('pending')
    })()
    return () => { dead = true }
  }, [])

  const text = {
    checking: ['Confirming your payment…', 'This takes a few seconds. Please do not close this page.'],
    done: ['Payment received', 'Your ' + (plan === 'premium' ? 'gold' : 'blue') + ' badge is now active. Thank you for supporting Flitters!'],
    pending: ['Still confirming', 'Your payment has not reached us yet. If you were charged, your badge will switch on automatically within a few minutes. If it does not, email support@xchord.space with your payment reference.'],
    failed: ['Payment not completed', 'No money was taken, or the payment was cancelled. You can try again from Get Verified.'],
    signin: ['Please sign in', 'Sign in to Flitters again and your payment will be confirmed.'],
  }[state]

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-app)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 28, textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{text[0]}</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, maxWidth: 360, margin: 0 }}>{text[1]}</p>
      {state !== 'checking' && <a href="/" style={{ marginTop: 10, background: 'var(--primary)', color: '#fff', textDecoration: 'none', fontWeight: 700, padding: '12px 28px', borderRadius: 14 }}>Back to Flitters</a>}
    </div>
  )
}
