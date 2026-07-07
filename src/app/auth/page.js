'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const COUNTRIES = [
  'Nigeria','United States','United Kingdom','Canada','Ghana','South Africa','Kenya','Egypt',
  'India','Pakistan','Bangladesh','Germany','France','Spain','Italy','Netherlands','Sweden',
  'Brazil','Mexico','Argentina','Colombia','Australia','New Zealand','Japan','South Korea',
  'China','Philippines','Indonesia','Malaysia','Singapore','UAE','Saudi Arabia','Turkey',
  'Morocco','Ethiopia','Uganda','Tanzania','Rwanda','Cameroon','Ivory Coast','Senegal','Other'
]

const XLogo = ({ size = 52 }) => (
  <img src="/xchord-logo-white.svg" alt="Xchord" width={size} height={size} style={{ objectFit: 'contain' }} />
)

const isEmail = (v) => v.includes('@')

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [step, setStep] = useState(1) // signup wizard step 1-6

  // step 1
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  // step 2
  const [dob, setDob] = useState('')
  const [country, setCountry] = useState('')
  // step 3 — single field, email or phone
  const [contact, setContact] = useState('')
  // step 4
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  // step 5 — profile picture
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const fileRef = useRef(null)
  // step 6 — policy
  const [acceptedPolicy, setAcceptedPolicy] = useState(false)

  // login / forgot
  const [loginContact, setLoginContact] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const supabase = createClient()

  const totalSteps = 6

  const goToLogin = () => { setMode('login'); setError(''); setSuccess('') }
  const goToSignup = () => { setMode('signup'); setStep(1); setError(''); setSuccess('') }
  const goToForgot = () => { setMode('forgot'); setError(''); setSuccess('') }

  const handleAvatarPick = (file) => {
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const validateStep = () => {
    setError('')
    if (step === 1) {
      if (!displayName.trim()) return 'Please enter your full name'
      if (!username.trim() || username.trim().length < 3) return 'Username must be at least 3 characters'
      return ''
    }
    if (step === 2) {
      if (!dob) return 'Please enter your date of birth'
      const age = (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      if (age < 13) return 'You must be at least 13 years old to join Xchord'
      if (!country) return 'Please select your country'
      return ''
    }
    if (step === 3) {
      if (!contact.trim()) return 'Please enter your email or phone number'
      const isPhoneLike = /^[0-9+()\-\s]{7,}$/.test(contact.trim())
      if (!isEmail(contact) && !isPhoneLike) return 'Enter a valid email address or phone number'
      return ''
    }
    if (step === 4) {
      if (!password || password.length < 6) return 'Password must be at least 6 characters'
      if (password !== confirmPassword) return 'Passwords do not match'
      return ''
    }
    // step 5 (avatar) has no required validation — skippable
    return ''
  }

  const handleNext = () => {
    const err = validateStep()
    if (err) { setError(err); return }
    setError('')
    setStep(s => s + 1)
  }

  const handleBack = () => {
    setError('')
    if (step === 1) { goToLogin(); return }
    setStep(s => s - 1)
  }

  const handleCreateAccount = async () => {
    if (!acceptedPolicy) { setError('Please accept the Privacy Policy to continue'); return }
    setError(''); setLoading(true)
    try {
      const trimmedContact = contact.trim()
      const usingEmail = isEmail(trimmedContact)
      const signupEmail = usingEmail ? trimmedContact : `${trimmedContact.replace(/[^0-9]/g, '')}@phone.xchord.placeholder`

      const { error: signUpError } = await supabase.auth.signUp({
        email: signupEmail,
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            username: username.toLowerCase().replace(/\s/g, ''),
            date_of_birth: dob,
            location: country,
            phone: usingEmail ? null : trimmedContact,
          }
        }
      })
      if (signUpError) throw signUpError

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email: signupEmail, password })
      if (signInError) throw signInError

      // Optional profile picture upload — skip silently on any failure, don't block account creation
      if (avatarFile && signInData?.user?.id) {
        try {
          const ext = avatarFile.name.split('.').pop()
          const path = `avatars/${signInData.user.id}.${ext}`
          const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
          if (!upErr) {
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
            await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', signInData.user.id)
          }
        } catch { /* non-fatal — account already created */ }
      }

      window.location.href = '/'
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleLogin = async () => {
    setError(''); setLoading(true)
    try {
      const trimmed = loginContact.trim()
      const usingEmail = isEmail(trimmed)
      const loginEmailValue = usingEmail ? trimmed : `${trimmed.replace(/[^0-9]/g, '')}@phone.xchord.placeholder`
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmailValue, password: loginPassword })
      if (error) throw error
      window.location.href = '/'
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const handleForgot = async () => {
    setError(''); setSuccess(''); setLoading(true)
    try {
      const trimmed = loginContact.trim()
      const usingEmail = isEmail(trimmed)
      if (!usingEmail) { setError('Password reset requires an email address. Please enter the email on your account.'); setLoading(false); return }
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: window.location.origin + '/auth/reset'
      })
      if (error) throw error
      setSuccess('Password reset link sent! Check your email inbox.')
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const handleDiscordSignIn = async () => {
    setError(''); setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo: window.location.origin + '/auth/callback' }
      })
      if (error) throw error
    } catch (e) { setError(e.message); setLoading(false) }
  }

  const inp = { width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '13px 16px', color: '#fff', fontSize: 15, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }
  const label = { color: '#888', fontSize: 12, display: 'block', marginBottom: 6, marginTop: 2 }
  const primaryBtn = { width: '100%', padding: '14px', background: 'linear-gradient(135deg,#A855F7,#06B6D4)', border: 'none', borderRadius: 14, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 4 }
  const secondaryBtn = { width: '100%', padding: '14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginTop: 10 }
  const skipBtn = { width: '100%', padding: '12px', background: 'none', border: 'none', color: '#666', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginTop: 6 }
  const discordBtn = { width: '100%', padding: '13px', background: '#5865F2', border: 'none', borderRadius: 14, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }

  const DiscordIcon = () => (
    <svg width="20" height="20" viewBox="0 0 245 240" fill="#fff">
      <path d="M104.4 103.9c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.2-5 10.2-11.1.1-6.1-4.5-11.1-10.2-11.1zM140.9 103.9c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.2-5 10.2-11.1s-4.5-11.1-10.2-11.1z"/>
      <path d="M189.5 20h-134C44.3 20 35 29.3 35 40.8v159.8c0 11.5 9.3 20.8 20.5 20.8h113.4l-5.3-18.5 12.8 11.9 12.1 11.2 21.5 19V40.8c0-11.5-9.3-20.8-20.5-20.8zm-38.6 130.6s-3.6-4.3-6.6-8.1c13.1-3.7 18.1-11.9 18.1-11.9-4.1 2.7-8 4.6-11.5 5.9-5 2.1-9.8 3.5-14.5 4.3-9.6 1.8-18.4 1.3-25.9-.1-5.7-1.1-10.6-2.7-14.7-4.3-2.3-.9-4.8-2-7.3-3.4-.3-.2-.6-.3-.9-.5-.2-.1-.3-.2-.4-.3-1.8-1-2.8-1.7-2.8-1.7s4.8 8 17.5 11.8c-3 3.8-6.7 8.3-6.7 8.3-22.1-.7-30.5-15.2-30.5-15.2 0-32.2 14.4-58.3 14.4-58.3 14.4-10.8 28.1-10.5 28.1-10.5l1 1.2c-18 5.2-26.3 13.1-26.3 13.1s2.2-1.2 5.9-2.9c10.7-4.7 19.2-6 22.7-6.3.6-.1 1.1-.2 1.7-.2 6.1-.8 13-1 20.2-.2 9.5 1.1 19.7 3.9 30.1 9.6 0 0-7.9-7.5-24.9-12.7l1.4-1.6s13.7-.3 28.1 10.5c0 0 14.4 26.1 14.4 58.3 0 0-8.5 14.5-30.6 15.2z"/>
    </svg>
  )

  const stepTitles = {
    1: 'Your name',
    2: 'Date of birth & country',
    3: 'Email or phone number',
    4: 'Create a password',
    5: 'Add a profile picture',
    6: 'Almost done',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090B10', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '40px 36px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <XLogo size={52} />
          <div>
            <div style={{ fontWeight: 900, fontSize: 26, background: 'linear-gradient(135deg,#A855F7,#06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>Xchord</div>
            <div style={{ fontSize: 10, color: '#444', marginTop: -2 }}>formerly known as Sphere</div>
          </div>
        </div>

        {/* ---------- LOGIN ---------- */}
        {mode === 'login' && <>
          <h1 style={{ fontWeight: 700, fontSize: 22, marginBottom: 6, color: '#fff' }}>Welcome back</h1>
          <p style={{ color: '#555', fontSize: 14, marginBottom: 24 }}>Sign in to your account</p>

          <button onClick={handleDiscordSignIn} disabled={loading} style={discordBtn}>
            <DiscordIcon /> Continue with Discord
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ color: '#444', fontSize: 12 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <input style={inp} type="text" placeholder="Email or phone number" value={loginContact} onChange={e => setLoginContact(e.target.value)} />
          <input style={inp} type="password" placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />

          {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,71,87,0.1)', color: '#FF4757', fontSize: 13, marginBottom: 14 }}>{error}</div>}

          <button onClick={handleLogin} disabled={loading} style={primaryBtn}>
            {loading ? 'Please wait...' : 'Sign In'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 14, marginBottom: 0 }}>
            <span onClick={goToForgot} style={{ color: '#888', fontSize: 13, cursor: 'pointer' }}>Forgot password?</span>
          </p>
          <p style={{ textAlign: 'center', marginTop: 16, color: '#555', fontSize: 14 }}>
            {"Don't have an account? "}<span onClick={goToSignup} style={{ color: '#A855F7', cursor: 'pointer', fontWeight: 600 }}>Sign up</span>
          </p>
        </>}

        {/* ---------- FORGOT ---------- */}
        {mode === 'forgot' && <>
          <h1 style={{ fontWeight: 700, fontSize: 22, marginBottom: 6, color: '#fff' }}>Reset Password</h1>
          <p style={{ color: '#555', fontSize: 14, marginBottom: 24 }}>Enter your account email to receive a reset link</p>

          <input style={inp} type="text" placeholder="Email address" value={loginContact} onChange={e => setLoginContact(e.target.value)} />

          {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,71,87,0.1)', color: '#FF4757', fontSize: 13, marginBottom: 14 }}>{error}</div>}
          {success && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(0,201,167,0.1)', color: '#00C9A7', fontSize: 13, marginBottom: 14 }}>{success}</div>}

          <button onClick={handleForgot} disabled={loading} style={primaryBtn}>
            {loading ? 'Please wait...' : 'Send Reset Link'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 16, color: '#555', fontSize: 14 }}>
            <span onClick={goToLogin} style={{ color: '#A855F7', cursor: 'pointer', fontWeight: 600 }}>Back to Sign In</span>
          </p>
        </>}

        {/* ---------- SIGNUP WIZARD ---------- */}
        {mode === 'signup' && <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map(n => (
              <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= step ? 'linear-gradient(135deg,#A855F7,#06B6D4)' : 'rgba(255,255,255,0.08)' }} />
            ))}
          </div>

          <h1 style={{ fontWeight: 700, fontSize: 22, marginBottom: 6, color: '#fff' }}>{stepTitles[step]}</h1>
          <p style={{ color: '#555', fontSize: 14, marginBottom: 24 }}>Step {step} of {totalSteps}</p>

          {step === 1 && <>
            <label style={label}>Full name</label>
            <input style={inp} placeholder="e.g. Ada Lovelace" value={displayName} onChange={e => setDisplayName(e.target.value)} />
            <label style={label}>Username</label>
            <input style={inp} placeholder="e.g. adalovelace" value={username} onChange={e => setUsername(e.target.value.replace(/\s/g, ''))} />
          </>}

          {step === 2 && <>
            <label style={label}>Date of birth</label>
            <input style={inp} type="date" value={dob} onChange={e => setDob(e.target.value)} max={new Date().toISOString().split('T')[0]} />
            <label style={label}>Country</label>
            <select style={{ ...inp, appearance: 'auto' }} value={country} onChange={e => setCountry(e.target.value)}>
              <option value="" style={{ color: '#000' }}>Select your country</option>
              {COUNTRIES.map(c => <option key={c} value={c} style={{ color: '#000' }}>{c}</option>)}
            </select>
            <p style={{ color: '#444', fontSize: 12, marginTop: -6 }}>This becomes your Location — editable anytime in Settings.</p>
          </>}

          {step === 3 && <>
            <label style={label}>Email or phone number</label>
            <input style={inp} type="text" placeholder="you@example.com or +234 801 234 5678" value={contact} onChange={e => setContact(e.target.value)} />
          </>}

          {step === 4 && <>
            <label style={label}>Password</label>
            <input style={inp} type="password" placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} />
            <label style={label}>Confirm password</label>
            <input style={inp} type="password" placeholder="Re-enter your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleNext()} />
          </>}

          {step === 5 && <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '8px 0 4px' }}>
              <div onClick={() => fileRef.current?.click()} style={{
                width: 96, height: 96, borderRadius: '50%', cursor: 'pointer',
                background: avatarPreview ? `url(${avatarPreview}) center/cover` : 'rgba(255,255,255,0.06)',
                border: '2px dashed rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, color: '#555'
              }}>
                {!avatarPreview && '📷'}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleAvatarPick(e.target.files?.[0])} />
              <span onClick={() => fileRef.current?.click()} style={{ color: '#A855F7', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {avatarPreview ? 'Change photo' : 'Upload a photo'}
              </span>
            </div>
          </>}

          {step === 6 && <>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, marginBottom: 18, fontSize: 13, color: '#aaa', lineHeight: 1.7, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: avatarPreview ? `url(${avatarPreview}) center/cover` : 'linear-gradient(135deg,#A855F7,#06B6D4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700
              }}>
                {!avatarPreview && displayName.trim().charAt(0).toUpperCase()}
              </div>
              <div>
                <div><strong style={{ color: '#fff' }}>{displayName}</strong> · @{username}</div>
                <div>{country} · {dob}</div>
                <div>{contact}</div>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={acceptedPolicy} onChange={e => setAcceptedPolicy(e.target.checked)} style={{ marginTop: 3 }} />
              <span style={{ color: '#aaa', fontSize: 13, lineHeight: 1.5 }}>
                I agree to Xchord's <a href="/privacy" target="_blank" style={{ color: '#A855F7', textDecoration: 'underline' }}>Privacy Policy</a> and Terms of Service.
              </span>
            </label>
          </>}

          {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,71,87,0.1)', color: '#FF4757', fontSize: 13, marginTop: 10, marginBottom: 4 }}>{error}</div>}

          {step < totalSteps
            ? <button onClick={handleNext} style={primaryBtn}>Next</button>
            : <button onClick={handleCreateAccount} disabled={loading || !acceptedPolicy} style={{ ...primaryBtn, opacity: (loading || !acceptedPolicy) ? 0.6 : 1 }}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>}

          {step === 5 && <button onClick={() => setStep(s => s + 1)} style={skipBtn}>Skip for now</button>}

          <button onClick={handleBack} style={secondaryBtn}>Back</button>

          {step === 1 && <p style={{ textAlign: 'center', marginTop: 16, color: '#555', fontSize: 14 }}>
            {"Already on Xchord? "}<span onClick={goToLogin} style={{ color: '#A855F7', cursor: 'pointer', fontWeight: 600 }}>Sign in</span>
          </p>}
        </>}

      </div>
    </div>
  )
}
