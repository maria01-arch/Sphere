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
          <svg width="40" height="40" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="xga" cx="38%" cy="32%" r="60%"><stop offset="0%" stopColor="#555"/><stop offset="40%" stopColor="#1a1a1a"/><stop offset="100%" stopColor="#000"/></radialGradient>
              <radialGradient id="sha" cx="35%" cy="28%" r="45%"><stop offset="0%" stopColor="rgba(255,255,255,0.35)"/><stop offset="100%" stopColor="rgba(255,255,255,0)"/></radialGradient>
              <linearGradient id="xla" x1="20" y1="20" x2="60" y2="60" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#ffffff"/><stop offset="50%" stopColor="#cccccc"/><stop offset="100%" stopColor="#888"/></linearGradient>
            </defs>
            <circle cx="40" cy="40" r="38" fill="url(#xga)"/>
            <circle cx="40" cy="40" r="38" fill="url(#sha)"/>
            <line x1="22" y1="22" x2="58" y2="58" stroke="url(#xla)" strokeWidth="9" strokeLinecap="round"/>
            <line x1="58" y1="22" x2="22" y2="58" stroke="url(#xla)" strokeWidth="9" strokeLinecap="round"/>
            <circle cx="40" cy="40" r="38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
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
