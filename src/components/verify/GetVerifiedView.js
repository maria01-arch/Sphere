'use client'
import { useEffect, useState } from 'react'
import { Check, ChevronLeft, Copy } from 'lucide-react'
import { AnimatedBadge } from '@/components/verify/AnimatedBadge'
import { VerifyForm } from '@/components/settings/VerifyForm'
import { authJsonHeaders } from '@/lib/api'
import { CRYPTO_USD, CURRENCY_CHOICES, PLAN_PRICING, fmtMoney, priceNGN } from '@/lib/pricing'

// Crypto wallets people can pay to. Card / bank payments go through Paystack (see /api/paystack).
const PAY_METHODS = [
  { id: 'usdt', kind: 'address', name: 'USDT (TRC-20)', address: 'TABFK9Z3yC4kKtVzqEwqoyAfwSySkzJcHL' },
  { id: 'btc', kind: 'address', name: 'Bitcoin (BTC)', address: 'bc1ql7qzefrh2czl29krzzsnwkr6dvnp2few2h80s7' },
]

// Prices live in lib/pricing.js (set in Naira). Pay by card / bank transfer with Paystack, or crypto.
const PLANS = {
  basic: { name: 'Flitters Basic', color: '#1877F2', tagline: 'Get the blue badge and the essentials.',
    perks: ['Blue verified badge', 'Videos up to 1 minute', 'Up to 8 co-owners on a post', 'Custom chat wallpapers and bubble colours'] },
  premium: { name: 'Flitters Premium', color: '#F5B301', tagline: 'The gold badge and everything we build next.',
    perks: ['Everything in Basic', 'Gold verified badge', 'More Premium features coming soon'] },
}
const fmt = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' } }

export function GetVerifiedView({ currentUser, supabase, onBack }) {
  const [tab, setTab] = useState('basic')
  const [billing, setBilling] = useState('monthly')
  const [copied, setCopied] = useState('')
  const [applied, setApplied] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', ok: true })
  const [cur, setCur] = useState({ plan: null, until: null })
  const [method, setMethod] = useState('paystack')
  const [geo, setGeo] = useState({ currency: 'NGN', rate: 1 })
  const [payBusy, setPayBusy] = useState(false)
  const [payErr, setPayErr] = useState('')

  // Which currency to show: the saved choice, otherwise the visitor's country.
  const loadGeo = async (choice) => {
    try {
      const res = await fetch('/api/pricing/geo' + (choice ? '?currency=' + choice : ''))
      const j = await res.json()
      if (j?.currency) setGeo({ currency: j.currency, rate: j.rate || null })
    } catch {}
  }
  useEffect(() => {
    let saved = ''
    try { saved = localStorage.getItem('flitters_currency') || '' } catch {}
    loadGeo(saved)
  }, [])
  const pickCurrency = (c) => {
    try { localStorage.setItem('flitters_currency', c) } catch {}
    loadGeo(c)
  }
  // "N3,500" for Nigerians, an estimate like "about $2.58" for everyone else.
  const local = (ngn) => geo.currency === 'NGN' ? fmtMoney(ngn, 'NGN') : (geo.rate ? '≈ ' + fmtMoney(ngn * geo.rate, geo.currency) : fmtMoney(ngn, 'NGN'))

  const payWithPaystack = async () => {
    setPayBusy(true); setPayErr('')
    try {
      const res = await fetch('/api/paystack/initialize', { method: 'POST', headers: await authJsonHeaders(), body: JSON.stringify({ plan: tab, billing }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.url) { setPayErr(j.error || 'Could not start the payment. Try again.'); setPayBusy(false); return }
      window.location.href = j.url
    } catch { setPayErr('No connection. Try again.'); setPayBusy(false) }
  }

  useEffect(() => {
    let dead = false
    ;(async () => {
      const { data: p } = await supabase.from('profiles').select('verified_plan,verified_until').eq('id', currentUser.id).maybeSingle()
      if (!dead && p) { setCur({ plan: p.verified_plan || null, until: p.verified_until || null }); if (p.verified_plan === 'premium') setTab('premium') }
      const { data: a } = await supabase.from('verification_applications').select('created_at').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(1)
      if (!dead && a?.length) setApplied(a[0].created_at)
    })()
    return () => { dead = true }
  }, [supabase, currentUser.id])

  const plan = PLANS[tab]
  const color = plan.color
  const ngn = priceNGN(tab, billing)
  const usd = CRYPTO_USD[tab][billing === 'annual' ? 'annual' : 'monthly']
  const active = cur.plan && (!cur.until || new Date(cur.until) > new Date())
  const ended = cur.plan && !active
  const hasThis = active && cur.plan === tab
  const includedInPremium = active && cur.plan === 'premium' && tab === 'basic'
  const planNote = `Plan: ${plan.name} · ${billing === 'annual' ? 'Yearly' : 'Monthly'} · $${usd} (crypto)`

  const showMsg = (text, ok = true) => {
    setMsg({ text, ok }); setTimeout(() => setMsg({ text: '', ok: true }), 4000)
    if (ok && /submitted/i.test(text)) setApplied(new Date().toISOString())
  }
  const inp = { width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-color-2)', borderRadius: 12, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 15, outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box', marginBottom: 12 }
  const copy = async (id, text) => {
    try { await navigator.clipboard.writeText(text) } catch {}
    setCopied(id); setTimeout(() => setCopied(c => (c === id ? '' : c)), 1800)
  }
  const step = (n, title) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '26px 0 12px' }}>
      <span style={{ width: 26, height: 26, borderRadius: 13, background: color, color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
      <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-header)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border-color)', padding: 'calc(12px + env(safe-area-inset-top)) 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} aria-label="Back" style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex' }}><ChevronLeft size={26} /></button>
        <span style={{ fontWeight: 700, fontSize: 17 }}>Get Verified</span>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '12px 16px 48px' }}>
        <div style={{ display: 'flex', background: 'var(--bg-card-4)', borderRadius: 14, padding: 4, marginBottom: 6 }}>
          {Object.entries(PLANS).map(([id, p]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, border: 'none', cursor: 'pointer', borderRadius: 11, padding: '10px 0', fontWeight: 700, fontSize: 14, background: tab === id ? 'var(--bg-app)' : 'transparent', color: tab === id ? p.color : 'var(--text-tertiary)' }}>{id === 'basic' ? 'Basic' : 'Premium'}</button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}><AnimatedBadge plan={tab} size={150} /></div>
        <h2 style={{ textAlign: 'center', fontSize: 23, fontWeight: 800, margin: '4px 0 4px', color }}>{plan.name}</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 16px' }}>{plan.tagline}</p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
          <span>Prices in</span>
          <select value={geo.currency} onChange={e => pickCurrency(e.target.value)} style={{ background: 'var(--bg-card-4)', color: 'var(--text-primary)', border: '1px solid var(--border-color-2)', borderRadius: 8, padding: '4px 6px', fontSize: 12 }}>
            {[...new Set([geo.currency, ...CURRENCY_CHOICES])].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {['monthly', 'annual'].map(b => {
            const on = billing === b
            const yr = b === 'annual'
            const n = priceNGN(tab, b)
            return (
              <button key={b} onClick={() => setBilling(b)} style={{ flex: 1, cursor: 'pointer', textAlign: 'center', padding: '12px 8px', borderRadius: 14, border: on ? '2px solid ' + color : '1px solid var(--border-color-2)', background: on ? 'var(--bg-card-4)' : 'transparent', color: 'var(--text-primary)' }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{local(n)}<span style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-tertiary)' }}> / {yr ? 'year' : 'month'}</span></div>
                {geo.currency !== 'NGN' && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{fmtMoney(n, 'NGN')} in Naira</div>}
                <div style={{ fontSize: 12, color: yr ? color : 'var(--text-tertiary)', fontWeight: yr ? 700 : 400, marginTop: 2 }}>{yr ? 'Save ' + Math.round(PLAN_PRICING[tab].annualDiscount * 100) + '%' : 'Billed monthly'}</div>
              </button>
            )
          })}
        </div>

        <div style={{ background: 'var(--bg-card-4)', borderRadius: 16, padding: '4px 16px' }}>
          {plan.perks.map(t => (
            <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)', fontSize: 14 }}>
              <span style={{ width: 22, height: 22, borderRadius: 11, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check size={14} color="#fff" strokeWidth={3} /></span>
              <span>{t}</span>
            </div>
          ))}
        </div>

        {ended && <div style={{ marginTop: 14, textAlign: 'center', color: 'var(--danger)', fontWeight: 600, fontSize: 13 }}>Your {PLANS[cur.plan]?.name || 'plan'} ended{cur.until ? ' on ' + fmt(cur.until) : ''}. Renew below to get your badge back.</div>}
        {hasThis && <div style={{ marginTop: 14, textAlign: 'center', padding: 14, borderRadius: 14, border: '1px solid ' + color, color, fontWeight: 700, fontSize: 14 }}>You have {plan.name}{cur.until ? ' · active until ' + fmt(cur.until) : ''}. Pay again before it ends to renew.</div>}
        {includedInPremium && <div style={{ marginTop: 14, textAlign: 'center', padding: 14, borderRadius: 14, background: 'var(--bg-card-4)', color: 'var(--text-secondary)', fontSize: 14 }}>Included in your Premium plan.</div>}

        {!includedInPremium && (<>
          {step(1, 'Choose how to pay')}
          <div style={{ display: 'flex', background: 'var(--bg-card-4)', borderRadius: 12, padding: 4, marginBottom: 14 }}>
            {[['paystack', 'Card / Bank'], ['crypto', 'Crypto']].map(([id, label]) => (
              <button key={id} onClick={() => setMethod(id)} style={{ flex: 1, border: 'none', cursor: 'pointer', borderRadius: 9, padding: '10px 0', fontWeight: 700, fontSize: 14, background: method === id ? 'var(--bg-app)' : 'transparent', color: method === id ? color : 'var(--text-tertiary)' }}>{label}</button>
            ))}
          </div>

          {method === 'paystack' ? (<>
            <button onClick={payWithPaystack} disabled={payBusy} style={{ width: '100%', border: 'none', cursor: 'pointer', borderRadius: 14, padding: '15px 0', fontWeight: 800, fontSize: 16, background: color, color: tab === 'premium' ? '#1a1300' : '#fff', opacity: payBusy ? 0.6 : 1 }}>
              {payBusy ? 'Opening Paystack…' : 'Pay ' + fmtMoney(ngn, 'NGN') + (billing === 'annual' ? ' for the year' : ' for this month')}
            </button>
            {payErr && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{payErr}</p>}
            <p style={{ color: 'var(--text-quaternary)', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
              Secure card, bank transfer or USSD payment by Paystack. You are charged in Naira{geo.currency !== 'NGN' ? ' (' + local(ngn) + '); your bank converts it if your card is in another currency' : ''}. Your badge switches on as soon as the payment is confirmed. Pay again before it ends to keep it; days left are added on.
            </p>
          </>) : (<>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Send ${usd} USD {billing === 'annual' ? 'for the year' : 'for this month'}</p>
            {PAY_METHODS.map(m => (
              <div key={m.id} style={{ background: 'var(--bg-card-4)', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <p style={{ fontWeight: 700, marginBottom: 6 }}>{m.name}</p>
                <p style={{ color: 'var(--text-tertiary)', fontSize: 12, wordBreak: 'break-all', fontFamily: 'monospace', marginBottom: 10 }}>{m.address}</p>
                <button onClick={() => copy(m.id, m.address)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-app)', border: '1px solid var(--border-color-2)', borderRadius: 10, padding: '8px 14px', color: copied === m.id ? 'var(--repost)' : 'var(--text-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {copied === m.id ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy address</>}
                </button>
              </div>
            ))}
            <p style={{ color: 'var(--text-quaternary)', fontSize: 12, lineHeight: 1.5 }}>Send the exact network shown (TRC-20 for USDT) and keep the transaction hash for step 2.</p>

            {step(2, 'Submit your application')}
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card-4)', fontSize: 13, marginBottom: 12, color }}>{planNote}</div>
            {applied && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card-4)', color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12 }}>Last application: {fmt(applied)}. We review within 48 hours.</div>}
            {msg.text && <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 13, background: msg.ok ? 'rgba(var(--repost-rgb),0.1)' : 'rgba(var(--danger-rgb),0.1)', color: msg.ok ? 'var(--repost)' : 'var(--danger)' }}>{msg.text}</div>}
            <VerifyForm currentUser={currentUser} supabase={supabase} showMsg={showMsg} saving={saving} setSaving={setSaving} inp={inp} planNote={planNote} />
          </>)}
          {geo.currency !== 'NGN' && <p style={{ color: 'var(--text-quaternary)', fontSize: 11, marginTop: 18, textAlign: 'center' }}>Currency estimates by <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>Exchange Rate API</a>.</p>}
        </>)}
      </div>
    </div>
  )
}
