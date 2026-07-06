'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const COUNTRIES = [
  'Nigeria','United States','United Kingdom','Canada','Ghana','South Africa','Kenya','Egypt',
  'India','Pakistan','Bangladesh','Germany','France','Spain','Italy','Netherlands','Sweden',
  'Brazil','Mexico','Argentina','Colombia','Australia','New Zealand','Japan','South Korea',
  'China','Philippines','Indonesia','Malaysia','Singapore','UAE','Saudi Arabia','Turkey',
  'Morocco','Ethiopia','Uganda','Tanzania','Rwanda','Cameroon','Ivory Coast','Senegal','Other'
]

const XLogo = ({ size = 52 }) => (
  <img src="/xchord-logo.svg" alt="Xchord" width={size} height={size} style={{ objectFit: 'contain' }} />
)

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [step, setStep] = useState(1) // signup wizard step 1-5

  // step 1
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  // step 2
  const [dob, setDob] = useState('')
  const [country, setCountry] = useState('')
  // step 3
  const [contactMethod, setContactMethod] = useState('email') // 'email' | 'phone'
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  // step 4
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  // step 5
  const [acceptedPolicy, setAcceptedPolicy] = useState(false)

  // login / forgot
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const supabase = createClient()

  const resetSignupWizard = () => {
    setStep(1); setError(''); setSuccess('')
  }

  const goToLogin = () => { setMode('login'); setError(''); setSuccess('') }
  const goToSignup = () => { setMode('signup'); resetSignupWizard() }
  const goToForgot = () => { setMode('forgot'); setError(''); setSuccess('') }

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
      if (contactMethod === 'email') {
        if (!email.trim() || !email.includes('@')) return 'Please enter a valid email address'
      } else {
        if (!phone.trim() || phone.trim().length < 7) return 'Please enter a valid phone number'
      }
      return ''
    }
    if (step === 4) {
      if (!password || password.length < 6) return 'Password must be at least 6 characters'
      if (password !== confirmPassword) return 'Passwords do not match'
      return ''
    }
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
      const signupEmail = contactMethod === 'email' ? email.trim() : `${phone.replace(/[^0-9]/g, '')}@phone.xchord.placeholder`

      const { error: signUpError } = await supabase.auth.signUp({
        email: signupEmail,
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            username: username.toLowerCase().replace(/\s/g, ''),
            date_of_birth: dob,
            location: country,
            phone: contactMethod === 'phone' ? phone.trim() : null,
          }
        }
      })
      if (signUpError) throw signUpError

      const { error: signInError } = await supabase.auth.signInWithPassword({ email: signupEmail, password })
      if (signInError) throw signInError

      window.location.href = '/'
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleLogin = async () => {
    setError(''); setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
      if (error) throw error
      window.location.href = '/'
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const handleForgot = async () => {
    setError(''); setSuccess(''); setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
        redirectTo: window.location.origin + '/auth/reset'
      })
      if (error) throw error
      setSuccess('Password reset link sent! Check your email inbox.')
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setError(''); setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/auth/callback' }
      })
      if (error) throw error
    } catch (e) { setError(e.message); setLoading(false) }
  }

  const inp = { width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '13px 16px', color: '#fff', fontSize: 15, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }
  const label = { color: '#888', fontSize: 12, display: 'block', marginBottom: 6, marginTop: 2 }
  const primaryBtn = { width: '100%', padding: '14px', background: 'linear-gradient(135deg,#A855F7,#06B6D4)', border: 'none', borderRadius: 14, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 4 }
  const secondaryBtn = { width: '100%', padding: '14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginTop: 10 }
  const googleBtn = { width: '100%', padding: '13px', background: '#fff', border: 'none', borderRadius: 14, color: '#1f1f1f', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }

  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3l6-6C34.9 5.1 29.7 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.1 8 3l6-6C34.9 5.1 29.7 3 24 3 15.9 3 8.9 7.6 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 45c5.6 0 10.7-2.1 14.5-5.7l-6.7-5.5C29.7 35.6 27 36.5 24 36.5c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9 41.4 15.9 45 24 45z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.7 5.5C40.9 36.9 45 30.9 45 24c0-1.4-.1-2.7-.4-3.5z"/>
    </svg>
  )

  const stepTitles = {
    1: 'Your name',
    2: 'Date of birth & country',
    3: 'Email or phone',
    4: 'Create a password',
    5: 'Almost done',
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

          <button onClick={handleGoogleSignIn} disabled={loading} style={googleBtn}>
            <GoogleIcon /> Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ color: '#444', fontSize: 12 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <input style={inp} type="email" placeholder="Email address" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
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
          <p style={{ color: '#555', fontSize: 14, marginBottom: 24 }}>Enter your email to receive a reset link</p>

          <input style={inp} type="email" placeholder="Email address" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />

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
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= step ? 'linear-gradient(135deg,#A855F7,#06B6D4)' : 'rgba(255,255,255,0.08)' }} />
            ))}
          </div>

          <h1 style={{ fontWeight: 700, fontSize: 22, marginBottom: 6, color: '#fff' }}>{stepTitles[step]}</h1>
          <p style={{ color: '#555', fontSize: 14, marginBottom: 24 }}>Step {step} of 5</p>

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
            <p style={{ color: '#444', fontSize: 12, marginTop: -6 }}>You can change this anytime in Settings → Location.</p>
          </>}

          {step === 3 && <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => setContactMethod('email')} style={{ flex: 1, padding: '10px', borderRadius: 10, border: contactMethod === 'email' ? '1px solid #A855F7' : '1px solid rgba(255,255,255,0.1)', background: contactMethod === 'email' ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Email</button>
              <button onClick={() => setContactMethod('phone')} style={{ flex: 1, padding: '10px', borderRadius: 10, border: contactMethod === 'phone' ? '1px solid #A855F7' : '1px solid rgba(255,255,255,0.1)', background: contactMethod === 'phone' ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Phone Number</button>
            </div>
            {contactMethod === 'email'
              ? <input style={inp} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
              : <input style={inp} type="tel" placeholder="e.g. +234 801 234 5678" value={phone} onChange={e => setPhone(e.target.value)} />}
          </>}

          {step === 4 && <>
            <label style={label}>Password</label>
            <input style={inp} type="password" placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} />
            <label style={label}>Confirm password</label>
            <input style={inp} type="password" placeholder="Re-enter your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleNext()} />
          </>}

          {step === 5 && <>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, marginBottom: 18, fontSize: 13, color: '#aaa', lineHeight: 1.7 }}>
              <div><strong style={{ color: '#fff' }}>{displayName}</strong> · @{username}</div>
              <div>{country} · {dob}</div>
              <div>{contactMethod === 'email' ? email : phone}</div>
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={acceptedPolicy} onChange={e => setAcceptedPolicy(e.target.checked)} style={{ marginTop: 3 }} />
              <span style={{ color: '#aaa', fontSize: 13, lineHeight: 1.5 }}>
                I agree to Xchord's <a href="/privacy" target="_blank" style={{ color: '#A855F7', textDecoration: 'underline' }}>Privacy Policy</a> and Terms of Service.
              </span>
            </label>
          </>}

          {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,71,87,0.1)', color: '#FF4757', fontSize: 13, marginTop: 10, marginBottom: 4 }}>{error}</div>}

          {step < 5
            ? <button onClick={handleNext} style={primaryBtn}>Next</button>
            : <button onClick={handleCreateAccount} disabled={loading || !acceptedPolicy} style={{ ...primaryBtn, opacity: (loading || !acceptedPolicy) ? 0.6 : 1 }}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>}

          <button onClick={handleBack} style={secondaryBtn}>Back</button>

          {step === 1 && <p style={{ textAlign: 'center', marginTop: 16, color: '#555', fontSize: 14 }}>
            {"Already on Xchord? "}<span onClick={goToLogin} style={{ color: '#A855F7', cursor: 'pointer', fontWeight: 600 }}>Sign in</span>
          </p>}
        </>}

      </div>
    </div>
  )
}
