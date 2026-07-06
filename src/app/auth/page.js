'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const supabase = createClient()

  const handleSubmit = async () => {
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: displayName, username: username.toLowerCase().replace(/\s/g,'') } }
        })
        if (error) throw error
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password })
        if (e2) throw e2
        window.location.href = '/'
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = '/'
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/auth/reset'
        })
        if (error) throw error
        setSuccess('Password reset link sent! Check your email inbox.')
      }
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const inp = {width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'13px 16px',color:'#fff',fontSize:15,outline:'none',marginBottom:12,boxSizing:'border-box'}

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#090B10',padding:24}}>
      <div style={{width:'100%',maxWidth:420,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:24,padding:'40px 36px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:32}}>
            <img src="/xchord-logo.svg" alt="Xchord" width="52" height="52" style={{objectFit:'contain'}}/>rt { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const supabase = createClient()

  const handleSubmit = async () => {
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: displayName, username: username.toLowerCase().replace(/\s/g,'') } }
        })
        if (error) throw error
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password })
        if (e2) throw e2
        window.location.href = '/'
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = '/'
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/auth/reset'
        })
        if (error) throw error
        setSuccess('Password reset link sent! Check your email inbox.')
      }
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const inp = {width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'13px 16px',color:'#fff',fontSize:15,outline:'none',marginBottom:12,boxSizing:'border-box'}

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#090B10',padding:24}}>
      <div style={{width:'100%',maxWidth:420,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:24,padding:'40px 36px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:32}}>
            <svg width="60" height="50" viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="LGAU" x1="0" y1="0" x2="160" y2="130" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#A855F7"/>
      <stop offset="100%" stopColor="#06B6D4"/>
    </linearGradient>
    <clipPath id="BEHINDAU">
      <rect x="0" y="0" width="80" height="130"/>
    </clipPath>
    <clipPath id="FRONTAU">
      <rect x="80" y="0" width="80" height="130"/>
    </clipPath>
  </defs>

  <!-- BACK half of ring (left side, behind planet) -->
  <ellipse cx="83" cy="78" rx="70" ry="18"
    stroke="url(#LGAU)" strokeWidth="9" fill="none" strokeLinecap="round"
    transform="rotate(-18 83 78)"
    clip-path="url(#BEHINDAU)" opacity="0.55"/>

  <!-- Planet filled circle -->
  <circle cx="80" cy="62" r="46" fill="url(#LGAU)"/>

  <!-- X inside planet - BLACK bold strokes -->
  <line x1="52" y1="36" x2="108" y2="88" stroke="#090B10" strokeWidth="16" strokeLinecap="round"/>
  <line x1="108" y1="36" x2="52" y2="88" stroke="#090B10" strokeWidth="16" strokeLinecap="round"/>

  <!-- FRONTAU half of ring (right side, in front of planet) -->
  <ellipse cx="83" cy="78" rx="70" ry="18"
    stroke="url(#LGAU)" strokeWidth="9" fill="none" strokeLinecap="round"
    transform="rotate(-18 83 78)"
    clip-path="url(#FRONTAU)"/>
</svg>
          <div>
            <div style={{fontWeight:900,fontSize:26,background:'linear-gradient(135deg,#A855F7,#06B6D4)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',letterSpacing:'-0.5px'}}>xchord</div>
            <div style={{fontSize:10,color:'#444',marginTop:-2}}>formerly known as Sphere</div>
          </div>
        </div>

        <h1 style={{fontWeight:700,fontSize:22,marginBottom:6,color:'#fff'}}>
          {mode==='login'?'Welcome back':mode==='signup'?'Join Xchord':'Reset Password'}
        </h1>
        <p style={{color:'#555',fontSize:14,marginBottom:24}}>
          {mode==='login'?'Sign in to your account':mode==='signup'?'Connect with the world':'Enter your email to receive a reset link'}
        </p>

        {mode==='signup'&&<>
          <input style={inp} placeholder="Display name" value={displayName} onChange={e=>setDisplayName(e.target.value)}/>
          <input style={inp} placeholder="Username" value={username} onChange={e=>setUsername(e.target.value.replace(/\s/g,''))}/>
        </>}

        <input style={inp} type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}/>
        {mode!=='forgot'&&<input style={inp} type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSubmit()}/>}

        {error&&<div style={{padding:'10px 14px',borderRadius:10,background:'rgba(255,71,87,0.1)',color:'#FF4757',fontSize:13,marginBottom:14}}>{error}</div>}
        {success&&<div style={{padding:'10px 14px',borderRadius:10,background:'rgba(0,201,167,0.1)',color:'#00C9A7',fontSize:13,marginBottom:14}}>{success}</div>}

        <button onClick={handleSubmit} disabled={loading} style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,#A855F7,#06B6D4)',border:'none',borderRadius:14,color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',marginTop:4}}>
          {loading?'Please wait...':mode==='login'?'Sign In':mode==='signup'?'Create Account':'Send Reset Link'}
        </button>

        {mode==='login'&&<p style={{textAlign:'center',marginTop:14,marginBottom:0}}>
          <span onClick={()=>{setMode('forgot');setError('');setSuccess('')}} style={{color:'#888',fontSize:13,cursor:'pointer'}}>Forgot password?</span>
        </p>}

        <p style={{textAlign:'center',marginTop:16,color:'#555',fontSize:14}}>
          {mode==='forgot'
            ?<span onClick={()=>{setMode('login');setError('');setSuccess('')}} style={{color:'#A855F7',cursor:'pointer',fontWeight:600}}>Back to Sign In</span>
            :mode==='login'
            ?<>{"Don't have an account? "}<span onClick={()=>{setMode('signup');setError('');setSuccess('')}} style={{color:'#A855F7',cursor:'pointer',fontWeight:600}}>Sign up</span></>
            :<>{"Already on Xchord? "}<span onClick={()=>{setMode('login');setError('');setSuccess('')}} style={{color:'#A855F7',cursor:'pointer',fontWeight:600}}>Sign in</span></>}
        </p>
        <p style={{textAlign:'center',marginTop:12,color:'#333',fontSize:11}}>
          By continuing you agree to our <a href="/privacy" style={{color:'#444',textDecoration:'underline'}}>Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
