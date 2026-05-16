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
  const supabase = createClient()

  const handleSubmit = async () => {
    setError(''); setLoading(true)
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
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = '/'
      }
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const inp = {width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'13px 16px',color:'#fff',fontSize:15,outline:'none',marginBottom:12}

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#090B10',padding:24}}>
      <div style={{width:'100%',maxWidth:420,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:24,padding:'40px 36px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:32}}>
          <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,#5B9CF6,#845EF7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🌐</div>
          <span style={{fontWeight:800,fontSize:24,background:'linear-gradient(135deg,#5B9CF6,#845EF7)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>sphere</span>
        </div>
        <h1 style={{fontWeight:700,fontSize:22,marginBottom:6}}>{mode==='login'?'Welcome back':'Join Sphere'}</h1>
        <p style={{color:'#555',fontSize:14,marginBottom:24}}>{mode==='login'?'Sign in to your account':'Connect with the world'}</p>
        {mode==='signup'&&<>
          <input style={inp} placeholder="Display name" value={displayName} onChange={e=>setDisplayName(e.target.value)}/>
          <input style={inp} placeholder="Username" value={username} onChange={e=>setUsername(e.target.value.replace(/\s/g,''))}/>
        </>}
        <input style={inp} type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}/>
        <input style={inp} type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSubmit()}/>
        {error&&<div style={{padding:'10px 14px',borderRadius:10,background:'rgba(255,71,87,0.1)',color:'#FF4757',fontSize:13,marginBottom:14}}>{error}</div>}
        <button onClick={handleSubmit} disabled={loading} style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:14,color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',marginTop:4}}>
          {loading?'Please wait...':mode==='login'?'Sign In':'Create Account'}
        </button>
        <p style={{textAlign:'center',marginTop:20,color:'#555',fontSize:14}}>
          {mode==='login'?"Don't have an account? ":"Already on Sphere? "}
          <span onClick={()=>{setMode(mode==='login'?'signup':'login');setError('')}} style={{color:'#5B9CF6',cursor:'pointer',fontWeight:600}}>
            {mode==='login'?'Sign up':'Sign in'}
          </span>
        </p>
      </div>
    </div>
  )
}
