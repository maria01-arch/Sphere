'use client'
import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { authJsonHeaders } from '@/lib/api'
import { FLITTERS_MARK } from '@/lib/flitters-mark'
import { Loader2, Coins, CheckCircle2, ArrowLeft } from 'lucide-react'

// Buy Flit coins with Paystack. Coins land in the same wallet the app uses.
const fmtUsd = (c) => '$' + (c / 100).toFixed(2)

function CoinsInner() {
  const supabase = createClient()
  const [session, setSession] = useState(undefined)
  const [packs, setPacks] = useState([])
  const [balance, setBalance] = useState(null)
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState(null)

  const loadBalance = async (uid) => {
    const { data } = await supabase.from('wallets').select('balance').eq('user_id', uid).maybeSingle()
    setBalance(Number(data?.balance ?? 0))
  }

  useEffect(() => {
    (async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      setSession(s || null)
      if (!s) return
      const { data } = await supabase.from('coin_packs').select('sku,coins,label,price_usd_cents').eq('active', true).order('sort')
      setPacks((data || []).filter((p) => p.price_usd_cents))
      loadBalance(s.user.id)
      // Back from Paystack: confirm the payment (a few tries, the money can take a moment to be confirmed).
      const ref = new URLSearchParams(window.location.search).get('ref')
      if (ref) {
        setMsg({ kind: 'wait', text: 'Confirming your payment…' })
        for (let i = 0; i < 8; i++) {
          const res = await fetch('/api/coins/verify?reference=' + encodeURIComponent(ref), { headers: await authJsonHeaders() })
          const j = await res.json().catch(() => ({}))
          if (j.status === 'paid') { setMsg({ kind: 'ok', text: (j.coins ? Number(j.coins).toLocaleString() + ' coins' : 'Your coins') + ' added to your wallet.' }); loadBalance(s.user.id); break }
          if (j.status === 'failed' || j.status === 'abandoned') { setMsg({ kind: 'err', text: 'The payment did not go through. You were not charged.' }); break }
          if (j.status === 'mismatch' || j.status === 'error') { setMsg({ kind: 'err', text: 'We could not confirm this payment automatically. Contact support@xchord.space with your payment reference: ' + ref }); break }
          if (i === 7) setMsg({ kind: 'wait', text: 'Still confirming. If you paid, your coins will appear shortly. Refresh in a minute.' })
          await new Promise((r) => setTimeout(r, 2500))
        }
        window.history.replaceState({}, '', '/coins')
      }
    })()
  }, [])

  const buy = async (pack) => {
    if (busy) return
    setBusy(pack.sku); setMsg(null)
    try {
      const res = await fetch('/api/coins/checkout', { method: 'POST', headers: await authJsonHeaders(), body: JSON.stringify({ sku: pack.sku }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.url) throw new Error(j.error || 'Could not start the payment')
      window.location.href = j.url
    } catch (e) {
      setMsg({ kind: 'err', text: e.message }); setBusy(null)
    }
  }

  const card = { background: 'var(--bg-card, #11151f)', border: '1px solid var(--border-color, #232a3a)', borderRadius: 16, padding: 16 }
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-app, #090B10)', color: 'var(--text-primary, #fff)', padding: '20px 16px 60px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary, #9AA3B2)', textDecoration: 'none', fontSize: 14 }}><ArrowLeft size={16} /> Back to Flitters</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 6px' }}>
          <img src={FLITTERS_MARK} alt="" width="38" height="38" style={{ objectFit: 'contain' }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Flit coins</h1>
        </div>
        <p style={{ color: 'var(--text-tertiary, #9AA3B2)', fontSize: 14, margin: '0 0 18px' }}>Coins are for sending gifts to creators and friends on Flitters. They show up in your wallet in the app right after you pay.</p>

        {session === undefined && <div style={{ textAlign: 'center', padding: 40 }}><Loader2 className="spin" size={26} /></div>}

        {session === null && (
          <div style={{ ...card, textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px', fontWeight: 700 }}>Sign in to buy coins</p>
            <a href="/auth?next=/coins" style={{ display: 'inline-block', background: 'var(--primary, #3DA9FF)', color: '#fff', borderRadius: 12, padding: '12px 26px', fontWeight: 700, textDecoration: 'none' }}>Sign in</a>
          </div>
        )}

        {session && (
          <>
            <div style={{ ...card, background: 'var(--primary, #3DA9FF)', border: 'none', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}>Your balance</div>
              <div style={{ fontSize: 36, fontWeight: 900, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}><Coins size={30} /> {balance == null ? '—' : balance.toLocaleString()}</div>
            </div>

            {msg && (
              <div style={{ ...card, marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center', borderColor: msg.kind === 'err' ? '#EF4444' : msg.kind === 'ok' ? '#16A34A' : undefined }}>
                {msg.kind === 'ok' ? <CheckCircle2 size={20} color="#16A34A" /> : msg.kind === 'wait' ? <Loader2 size={18} className="spin" /> : null}
                <span style={{ fontSize: 14 }}>{msg.text}</span>
              </div>
            )}

            {packs.map((p) => (
              <button key={p.sku} onClick={() => buy(p)} disabled={!!busy} style={{ ...card, width: '100%', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, cursor: busy ? 'default' : 'pointer', textAlign: 'left', color: 'inherit', font: 'inherit' }}>
                <Coins size={26} color="#F5B301" />
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 800, fontSize: 16 }}>{p.coins.toLocaleString()} coins</span>
                  {p.label ? <span style={{ display: 'block', color: 'var(--primary, #3DA9FF)', fontWeight: 700, fontSize: 12 }}>{p.label}</span> : null}
                </span>
                <span style={{ background: 'var(--primary, #3DA9FF)', color: '#fff', borderRadius: 12, padding: '8px 14px', fontWeight: 800, fontSize: 14, minWidth: 72, textAlign: 'center' }}>
                  {busy === p.sku ? <Loader2 size={16} className="spin" /> : fmtUsd(p.price_usd_cents)}
                </span>
              </button>
            ))}
            <p style={{ color: 'var(--text-tertiary, #9AA3B2)', fontSize: 12, lineHeight: 1.5 }}>You pay securely through Paystack, in your local currency where available. Coins have no cash value when bought and can only be used on Flitters.</p>
          </>
        )}
      </div>
      <style>{`.spin{animation:coinspin 1s linear infinite}@keyframes coinspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function CoinsPage() {
  return <Suspense fallback={null}><CoinsInner /></Suspense>
}
