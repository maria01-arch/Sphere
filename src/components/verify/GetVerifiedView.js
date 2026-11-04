'use client'
import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronLeft, RefreshCw } from 'lucide-react'
import { AnimatedBadge } from '@/components/verify/AnimatedBadge'
import { authJsonHeaders } from '@/lib/api'

const PLANS = {
  basic: {
    name: 'Flitters Basic', color: '#1877F2',
    blurb: 'The blue seal next to your name, so people know your account is real.',
    perks: ['Blue authentic seal on your profile, posts and comments', 'Seal shows in reels, search and chats', 'Stands out from look-alike accounts'],
  },
  premium: {
    name: 'Flitters Premium', color: '#F5B301',
    blurb: 'Everything in Basic, with the gold seal that only Premium members get.',
    perks: ['Gold animated-style seal on every appearance', 'Everything in Flitters Basic', 'The top badge on the platform'],
  },
}

const fmt = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' } }

// Subscriptions are bought with Google Play in the Android app, so on the web this page
// shows the plans, the current status, and a refresh button that re-checks with Google.
export function GetVerifiedView({ currentUser, supabase, onBack, onManual }) {
  const [tab, setTab] = useState('basic')
  const [status, setStatus] = useState({ plan: null, until: null, loading: true })
  const [refreshing, setRefreshing] = useState(false)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('verified_plan,verified_until,is_authentic').eq('id', currentUser.id).maybeSingle()
    setStatus({ plan: data?.verified_plan || null, until: data?.verified_until || null, authentic: !!data?.is_authentic, loading: false })
  }, [supabase, currentUser.id])
  useEffect(() => { load() }, [load])

  const refresh = async () => {
    setRefreshing(true); setNote('')
    try {
      const res = await fetch('/api/billing/refresh', { method: 'POST', headers: await authJsonHeaders() })
      if (!res.ok) setNote(res.status === 503 ? 'Subscriptions are not switched on yet.' : 'Could not check right now. Try again in a minute.')
      else setNote('Up to date.')
      await load()
    } catch { setNote('No connection. Try again.') }
    setRefreshing(false)
  }

  const active = status.plan && (!status.until || new Date(status.until) > new Date())
  const ended = status.plan && !active
  const plan = PLANS[tab]
  const hasThis = active && status.plan === tab
  const includedInPremium = active && status.plan === 'premium' && tab === 'basic'

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-header)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border-color)', padding: 'calc(12px + env(safe-area-inset-top)) 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} aria-label="Back" style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex' }}><ChevronLeft size={26} /></button>
        <span style={{ fontWeight: 700, fontSize: 17, flex: 1 }}>Get Verified</span>
        <button onClick={refresh} disabled={refreshing} aria-label="Refresh status" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', opacity: refreshing ? 0.5 : 1 }}><RefreshCw size={19} /></button>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px 16px 40px' }}>
        <div style={{ display: 'flex', background: 'var(--bg-card-4)', borderRadius: 14, padding: 4, marginBottom: 8 }}>
          {Object.entries(PLANS).map(([id, p]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, border: 'none', cursor: 'pointer', borderRadius: 11, padding: '10px 0', fontWeight: 700, fontSize: 14, background: tab === id ? 'var(--bg-app)' : 'transparent', color: tab === id ? p.color : 'var(--text-tertiary)' }}>{id === 'basic' ? 'Basic' : 'Premium'}</button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 0' }}>
          <AnimatedBadge plan={tab} size={150} />
        </div>

        <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 800, margin: '4px 0 6px', color: plan.color }}>{plan.name}</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5, margin: '0 8px 18px' }}>{plan.blurb}</p>

        <div style={{ background: 'var(--bg-card-4)', borderRadius: 16, padding: '6px 16px', marginBottom: 18 }}>
          {plan.perks.map(t => (
            <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)', fontSize: 14 }}>
              <span style={{ width: 22, height: 22, borderRadius: 11, background: plan.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check size={14} color="#fff" strokeWidth={3} /></span>
              <span>{t}</span>
            </div>
          ))}
        </div>

        {status.loading ? null : hasThis ? (
          <div style={{ textAlign: 'center', padding: 14, borderRadius: 14, border: '1px solid ' + plan.color, color: plan.color, fontWeight: 700, fontSize: 14 }}>
            You have {plan.name}{status.until ? ' · renews or ends ' + fmt(status.until) : ''}
          </div>
        ) : includedInPremium ? (
          <div style={{ textAlign: 'center', padding: 14, borderRadius: 14, background: 'var(--bg-card-4)', color: 'var(--text-secondary)', fontSize: 14 }}>Included in your Premium plan.</div>
        ) : (
          <div style={{ padding: 16, borderRadius: 14, background: 'var(--bg-card-4)', textAlign: 'center' }}>
            {ended && <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Your {PLANS[status.plan]?.name || 'plan'} ended{status.until ? ' on ' + fmt(status.until) : ''}.</div>}
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Subscribe in the Flitters Android app</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>Payment is handled by Google Play. Open the Flitters app on your Android phone, go to Get Verified and pick {plan.name}. Come back here and tap refresh and your seal will show on the web too.</div>
          </div>
        )}

        {active && (
          <a href="https://play.google.com/store/account/subscriptions" target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', marginTop: 12, color: 'var(--primary)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Manage subscription in Google Play</a>
        )}
        {note && <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12, marginTop: 10 }}>{note}</div>}

        {onManual && (
          <button onClick={onManual} style={{ display: 'block', width: '100%', marginTop: 26, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}>Prefer to pay by crypto? Apply manually</button>
        )}
      </div>
    </div>
  )
}
