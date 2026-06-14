'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

class ErrorBoundary extends (require('react').Component) {
  constructor(props) { super(props); this.state = {error:null} }
  static getDerivedStateFromError(e) { return {error:e} }
  render() {
    if(this.state.error) return (
      <div style={{minHeight:'100vh',background:'#090B10',color:'#fff',padding:20,fontFamily:'sans-serif'}}>
        <h2 style={{color:'#FF4757'}}>App Error</h2>
        <p style={{color:'#aaa',fontSize:14,wordBreak:'break-word'}}>{this.state.error?.message}</p>
        <pre style={{color:'#666',fontSize:11,overflow:'auto'}}>{this.state.error?.stack?.slice(0,500)}</pre>
        <button onClick={()=>window.location.reload()} style={{marginTop:16,background:'#5B9CF6',border:'none',borderRadius:12,padding:'12px 24px',color:'#fff',cursor:'pointer'}}>Reload</button>
      </div>
    )
    return this.props.children
  }
}

const COLORS = ['#FF6B35','#00C9A7','#845EF7','#F7B731','#FF4757','#5B9CF6','#A29BFE','#FD79A8']
const getColor = (id) => COLORS[(id?.charCodeAt(0)||0) % COLORS.length]

function timeAgo(ts) {
  if (!ts) return ''
  const d = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (d < 60) return 'now'
  if (d < 3600) return `${Math.floor(d/60)}m`
  if (d < 86400) return `${Math.floor(d/3600)}h`
  return `${Math.floor(d/86400)}d`
}

function Avatar({ url, name='', color='#5B9CF6', size=42, online=false }) {
  const i = (name||'?').trim().split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'??'
  return (
    <div style={{position:'relative',flexShrink:0,display:'inline-block'}}>
      {url
        ? <img src={url} alt={name} style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',boxShadow:`0 0 0 2px #090B10`}}/>
        : <div style={{width:size,height:size,borderRadius:'50%',background:`linear-gradient(135deg,${color}88,${color})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.36,fontWeight:800,color:'#fff',boxShadow:`0 0 0 2px #090B10`}}>{i}</div>
      }
      {online&&<div style={{position:'absolute',bottom:1,right:1,width:size*0.27,height:size*0.27,borderRadius:'50%',background:'#00C9A7',border:'2px solid #090B10'}}/>}
    </div>
  )
}

// ── USER PROFILE ───────────────────────────────────────────────────────────
function UserProfileView({ user, currentUser, supabase, onBack, onMessage }) {
  const [posts, setPosts] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [showBigAvatar, setShowBigAvatar] = useState(false)
  const [followerCount, setFollowerCount] = useState(user?.followers_count||0)
  const [loading, setLoading] = useState(true)
  const color = user?.avatar_color || getColor(user?.id)

  useEffect(() => {
    if (!user) return
    supabase.from('posts').select('*,likes(user_id),reposts(user_id),comments(id)').eq('user_id',user.id).order('created_at',{ascending:false})
      .then(({data}) => { setPosts((data||[]).map(p=>({...p,likes_count:p.likes?.length||0,reposts_count:p.reposts?.length||0,comments_count:p.comments?.length||0,user_liked:p.likes?.some(l=>l.user_id===currentUser.id)}))); setLoading(false) })
    supabase.from('follows').select('id').eq('follower_id',currentUser.id).eq('following_id',user.id).maybeSingle()
      .then(({data}) => setIsFollowing(!!data))
  }, [user])

  const toggleFollow = async () => {
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id',currentUser.id).eq('following_id',user.id)
      setFollowerCount(c=>c-1)
    } else {
      await supabase.from('follows').insert({follower_id:currentUser.id,following_id:user.id})
      setFollowerCount(c=>c+1)
    }
    setIsFollowing(!isFollowing)
  }

  return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'#fff',cursor:'pointer',fontSize:24,padding:0}}>‹</button>
        <span style={{fontWeight:700,fontSize:17}}>{user?.display_name}</span>
      </div>
      <div style={{height:120,background:`linear-gradient(135deg,${color}44,#845EF733)`}}/>
      {showBigAvatar&&user?.avatar_url&&<div onClick={()=>setShowBigAvatar(false)} style={{position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,0.9)',display:'flex',alignItems:'center',justifyContent:'center'}}><img src={user.avatar_url} style={{width:'90vw',height:'90vw',maxWidth:400,maxHeight:400,borderRadius:'50%',objectFit:'cover'}} alt=""/></div>}
      <div style={{padding:'0 16px',marginTop:-36,marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
        <div onClick={()=>setShowBigAvatar(true)} style={{cursor:'pointer'}}>
          <Avatar url={user?.avatar_url} name={user?.display_name} color={color} size={72}/>
        </div>
        <div style={{display:'flex',gap:8}}>
          {user.id !== currentUser.id && <>
            <div onClick={()=>onMessage(user)} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:20,padding:'8px 16px',color:'#fff',cursor:'pointer',fontWeight:600,fontSize:13,WebkitTapHighlightColor:'rgba(255,255,255,0.2)',userSelect:'none'}}>💬 Message</div>
            <button onClick={toggleFollow} style={{background:isFollowing?'rgba(255,255,255,0.07)':'linear-gradient(135deg,#5B9CF6,#845EF7)',border:isFollowing?'1px solid rgba(255,255,255,0.15)':'none',borderRadius:20,padding:'8px 16px',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:13}}>
              {isFollowing?'Following':'Follow'}
            </button>
          </>}
        </div>
      </div>
      <div style={{padding:'0 16px 16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><h2 style={{fontWeight:800,fontSize:20,margin:0}}>{user?.display_name}</h2>{user?.verified&&<span title='Sphere Verified Member' style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:20,height:20,borderRadius:'50%',background:'linear-gradient(135deg,#1a1a2e,#16213e)',border:'2px solid #C9A84C',boxShadow:'0 0 6px rgba(201,168,76,0.6)',flexShrink:0,cursor:'default'}}><span style={{fontFamily:'serif',fontWeight:900,fontSize:9,background:'linear-gradient(135deg,#FFD700,#C9A84C)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',letterSpacing:'-0.5px',lineHeight:1}}>SV</span></span>}</div>

      </div>
        <p style={{color:'#555',fontSize:14,marginBottom:8}}>@{user?.username}</p>
        {user?.bio&&<p style={{color:'#aaa',fontSize:14,lineHeight:1.6,marginBottom:10}}>{user.bio}</p>}
        {user?.location&&<p style={{color:'#555',fontSize:13,marginBottom:8}}>📍 {user.location}</p>}
        <div style={{display:'flex',gap:20}}>
          <span style={{fontSize:14}}><strong>{user?.following_count||0}</strong> <span style={{color:'#555'}}>Following</span></span>
          <span style={{fontSize:14}}><strong>{followerCount}</strong> <span style={{color:'#555'}}>Followers</span></span>
        </div>
      </div>
      <div style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
        <p style={{padding:'14px 16px',fontWeight:700,fontSize:15}}>Posts</p>
        {loading&&<p style={{padding:'20px',textAlign:'center',color:'#444'}}>Loading...</p>}
        {!loading&&posts.length===0&&<p style={{padding:'20px',textAlign:'center',color:'#444'}}>No posts yet</p>}
        {posts.map(post=>(
          <div key={post.id} style={{padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            <p style={{color:'#ddd',fontSize:15,lineHeight:1.6,marginBottom:10}}>{post.content}</p>
            <div style={{display:'flex',gap:16,color:'#555',fontSize:13}}>
              <span>💬 {post.comments_count}</span>
              <span>{post.user_liked?'❤️':'🤍'} {post.likes_count}</span>
              <span>🔁 {post.reposts_count}</span>
              <span style={{marginLeft:'auto'}}>{timeAgo(post.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── SETTINGS ───────────────────────────────────────────────────────────────
function VerifyForm({ currentUser, supabase, showMsg, saving, setSaving, inp }) {
  const [form, setForm] = useState({name:"",reason:"",idtype:"",txhash:"",paymethod:""})
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const submit = async() => {
    if(!form.name||!form.reason||!form.idtype||!form.txhash||!form.paymethod){showMsg("Please fill all fields",false);return}
    setSaving(true)
    const {error} = await supabase.from("verification_applications").insert({user_id:currentUser.id,full_name:form.name,reason:form.reason,id_type:form.idtype,tx_hash:form.txhash,payment_method:form.paymethod})
    if(error) showMsg(error.message,false)
    else showMsg("Application submitted! We will review within 48 hours. ✓")
    setSaving(false)
  }
  return(<div>
    <label style={{color:"#888",fontSize:13,display:"block",marginBottom:6}}>Full Name</label>
    <input value={form.name} onChange={e=>set("name",e.target.value)} style={{...inp}} placeholder="Your legal name"/>
    <label style={{color:"#888",fontSize:13,display:"block",marginBottom:6}}>ID Type</label>
    <select value={form.idtype} onChange={e=>set("idtype",e.target.value)} style={{...inp,background:"rgba(255,255,255,0.07)"}}>
      <option value="">Select ID type</option>
      <option>National ID</option><option>Passport</option><option>Driver License</option>
    </select>
    <label style={{color:"#888",fontSize:13,display:"block",marginBottom:6}}>Why do you want verification?</label>
    <textarea value={form.reason} onChange={e=>set("reason",e.target.value)} rows={3} style={{...inp,resize:"none"}} placeholder="Describe yourself and why you deserve verification"/>
    <label style={{color:"#888",fontSize:13,display:"block",marginBottom:6}}>Transaction Hash (TX ID)</label>
    <input value={form.txhash} onChange={e=>set("txhash",e.target.value)} style={{...inp}} placeholder="Paste your payment transaction hash"/>
    <label style={{color:"#888",fontSize:13,display:"block",marginBottom:6}}>Payment Method Used</label>
    <select value={form.paymethod} onChange={e=>set("paymethod",e.target.value)} style={{...inp,background:"rgba(255,255,255,0.07)"}}>
      <option value="">Select payment method</option>
      <option>USDT TRC-20</option><option>Bitcoin BTC</option>
    </select>
    <button onClick={submit} style={{width:"100%",background:"linear-gradient(135deg,#FFD700,#FFA500)",border:"none",borderRadius:12,padding:"14px",color:"#000",fontWeight:800,fontSize:15,cursor:"pointer",marginTop:8}}>{saving?"Submitting...":"Submit Application 🏅"}</button>
  </div>)
}

function SettingsView({ currentUser, supabase, onBack, onSignOut, onAvatarUpdate }) {
  const [section, setSection] = useState('main')
  const [displayName, setDisplayName] = useState(currentUser?.display_name||'')
  const [bio, setBio] = useState(currentUser?.bio||'')
  const [location, setLocation] = useState(currentUser?.location||'')
  const [language, setLanguage] = useState('English')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({text:'',ok:true})
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const showMsg = (text, ok=true) => { setMsg({text,ok}); setTimeout(()=>setMsg({text:'',ok:true}),3000) }
  const inp = {width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',fontFamily:'sans-serif',boxSizing:'border-box',marginBottom:12}
  const LANGUAGES = ['English','French','Spanish','Arabic','Portuguese','Swahili','Hindi','Chinese','German','Japanese','Russian','Italian']

  const uploadAvatar = async (file) => {
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${currentUser.id}.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {upsert:true})
    if (upErr) { showMsg('Upload failed: '+upErr.message, false); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = urlData.publicUrl
    await supabase.from('profiles').update({avatar_url:url}).eq('id',currentUser.id)
    currentUser.avatar_url = url
    onAvatarUpdate(url)
    showMsg('Profile picture updated!')
    setUploading(false)
  }

  const saveProfile = async () => {
    setSaving(true)
    const hasEmoji = /\p{Emoji}/u.test(displayName);if(hasEmoji){showMsg('Emojis are not allowed in display names',false);setSaving(false);return}
    const {error} = await supabase.from('profiles').update({display_name:displayName,bio,location}).eq('id',currentUser.id)
    if (error) showMsg(error.message, false)
    else { currentUser.display_name=displayName; currentUser.bio=bio; currentUser.location=location; showMsg('Profile saved!') }
    setSaving(false)
  }

  const changePassword = async () => {
    if (newPass!==confirmPass) { showMsg('Passwords do not match',false); return }
    if (newPass.length<6) { showMsg('Minimum 6 characters',false); return }
    setSaving(true)
    const {error} = await supabase.auth.updateUser({password:newPass})
    if (error) showMsg(error.message,false)
    else { showMsg('Password changed!'); setNewPass(''); setConfirmPass('') }
    setSaving(false)
  }

  const MsgBox = () => msg.text ? <div style={{padding:'10px 14px',borderRadius:10,background:msg.ok?'rgba(0,201,167,0.1)':'rgba(255,71,87,0.1)',border:`1px solid ${msg.ok?'rgba(0,201,167,0.2)':'rgba(255,71,87,0.2)'}`,color:msg.ok?'#00C9A7':'#FF4757',fontSize:13,marginBottom:16}}>{msg.text}</div> : null

  const Header = ({title}) => (
    <div style={{position:'sticky',top:0,zIndex:10,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
      <button onClick={()=>setSection('main')} style={{background:'none',border:'none',color:'#fff',cursor:'pointer',fontSize:24}}>‹</button>
      <span style={{fontWeight:700,fontSize:17}}>{title}</span>
    </div>
  )

  if (section==='avatar') return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff'}}>
      <Header title="Profile Picture"/>
      <div style={{padding:'30px 20px',display:'flex',flexDirection:'column',alignItems:'center',gap:20}}>
        <MsgBox/>
        <Avatar url={currentUser?.avatar_url} name={currentUser?.display_name} color={currentUser?.avatar_color||'#5B9CF6'} size={100}/>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>uploadAvatar(e.target.files[0])}/>
        <button onClick={()=>fileRef.current?.click()} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:12,padding:'14px 32px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',width:'100%'}}>
          {uploading?'Uploading...':'Choose Photo'}
        </button>
        <p style={{color:'#555',fontSize:13,textAlign:'center'}}>Tap to select a photo from your device</p>
      </div>
    </div>
  )

  if (section==='profile') return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff'}}>
      <Header title="Edit Profile"/>
      <div style={{padding:'20px 16px'}}>
        <MsgBox/>
        <label style={{color:'#888',fontSize:13,display:'block',marginBottom:6}}>Display Name</label>
        <input value={displayName} onChange={e=>setDisplayName(e.target.value)} style={{...inp}} placeholder="Your name"/>
        <label style={{color:'#888',fontSize:13,display:'block',marginBottom:6}}>Bio</label>
        <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={3} style={{...inp,resize:'none'}} placeholder="Tell the world about yourself"/>
        <button onClick={saveProfile} style={{width:'100%',background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:12,padding:'14px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer'}}>
          {saving?'Saving...':'Save Changes'}
        </button>
      </div>
    </div>
  )

  if (section==='password') return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff'}}>
      <Header title="Change Password"/>
      <div style={{padding:'20px 16px'}}>
        <MsgBox/>
        <label style={{color:'#888',fontSize:13,display:'block',marginBottom:6}}>New Password</label>
        <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} style={{...inp}} placeholder="New password"/>
        <label style={{color:'#888',fontSize:13,display:'block',marginBottom:6}}>Confirm Password</label>
        <input type="password" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} style={{...inp}} placeholder="Confirm new password"/>
        <button onClick={changePassword} style={{width:'100%',background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:12,padding:'14px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer'}}>
          {saving?'Saving...':'Update Password'}
        </button>
      </div>
    </div>
  )

  if (section==='location') return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff'}}>
      <Header title="Location"/>
      <div style={{padding:'20px 16px'}}>
        <MsgBox/>
        <label style={{color:'#888',fontSize:13,display:'block',marginBottom:6}}>Your Country / City</label>
        <input value={location} onChange={e=>setLocation(e.target.value)} style={{...inp}} placeholder="e.g. Lagos, Nigeria"/>
        <button onClick={async()=>{setSaving(true);const {error}=await supabase.from('profiles').update({location}).eq('id',currentUser.id);if(error)showMsg(error.message,false);else{currentUser.location=location;showMsg('Saved!')};setSaving(false)}} style={{width:'100%',background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:12,padding:'14px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer'}}>
          {saving?'Saving...':'Save Location'}
        </button>
      </div>
    </div>
  )

  if (section==='language') return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff'}}>
      <Header title="Language"/>
      <div style={{padding:'8px 0'}}>
        {LANGUAGES.map(lang=>(
          <div key={lang} onClick={()=>setLanguage(lang)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.05)',background:language===lang?'rgba(91,156,246,0.08)':'transparent'}}>
            <span style={{fontSize:15}}>{lang}</span>
            {language===lang&&<span style={{color:'#5B9CF6',fontSize:18}}>✓</span>}
          </div>
        ))}
      </div>
    </div>
  )


  if(section==='verify') return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff'}}>
      <Header title="Get Verified ✓"/>
      <div style={{padding:'20px 16px'}}>
        <MsgBox/>
        <div style={{background:'linear-gradient(135deg,rgba(255,215,0,0.08),rgba(255,165,0,0.08))',border:'1px solid rgba(255,215,0,0.25)',borderRadius:16,padding:'20px',marginBottom:24,textAlign:'center'}}>
          <div style={{fontSize:48,marginBottom:8}}>🏅</div>
          <h2 style={{fontWeight:800,fontSize:20,color:'#FFD700',marginBottom:8}}>Sphere Verified Badge</h2>
          <p style={{color:'#aaa',fontSize:14,lineHeight:1.6}}>Get a gold badge on your profile and all your posts.</p>
          <p style={{color:'#FFD700',fontWeight:700,fontSize:18,marginTop:12}}>One-time fee: $5 USD</p>
        </div>
        <h3 style={{fontWeight:700,fontSize:15,marginBottom:12}}>Pay to one of these:</h3>
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,padding:'14px',marginBottom:10}}>
          <p style={{fontWeight:700,marginBottom:6}}>USDT TRC-20</p>
          <p style={{color:'#888',fontSize:11,wordBreak:'break-all',fontFamily:'monospace'}}>TABFK9Z3yC4kKtVzqEwqoyAfwSySkzJcHL</p>
        </div>
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,padding:'14px',marginBottom:20}}>
          <p style={{fontWeight:700,marginBottom:6}}>Bitcoin BTC</p>
          <p style={{color:'#888',fontSize:11,wordBreak:'break-all',fontFamily:'monospace'}}>bc1ql7qzefrh2czl29krzzsnwkr6dvnp2few2h80s7</p>
        </div>
        <h3 style={{fontWeight:700,fontSize:15,marginBottom:12}}>Application Form</h3>
        <VerifyForm currentUser={currentUser} supabase={supabase} showMsg={showMsg} saving={saving} setSaving={setSaving} inp={inp}/>
      </div>
    </div>
  )
  return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'#fff',cursor:'pointer',fontSize:24}}>‹</button>
        <span style={{fontWeight:700,fontSize:17}}>Settings</span>
      </div>
      <div style={{padding:'12px 0'}}>
        {[{icon:'🖼️',label:'Profile Picture',id:'avatar'},{icon:'👤',label:'Edit Profile',id:'profile'},{icon:'🔒',label:'Change Password',id:'password'},{icon:'📍',label:'Location',id:'location'},{icon:'🌐',label:'Language',id:'language'},{icon:'🏅',label:'Get Verified Badge',id:'verify'}].map(s=>(
          <button key={s.id} onClick={()=>setSection(s.id)} style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',background:'none',border:'none',width:'100%',cursor:'pointer',color:'#fff',borderBottom:'1px solid rgba(255,255,255,0.05)',textAlign:'left',fontSize:15}}>
            <span style={{fontSize:22}}>{s.icon}</span><span style={{flex:1,fontWeight:500}}>{s.label}</span><span style={{color:'#444'}}>›</span>
          </button>
        ))}
        <button onClick={onSignOut} style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',background:'none',border:'none',width:'100%',cursor:'pointer',color:'#FF4757',borderTop:'1px solid rgba(255,255,255,0.07)',marginTop:8,fontSize:15}}>
          <span style={{fontSize:22}}>🚪</span><span style={{fontWeight:600}}>Sign Out</span>
        </button>
      </div>
    </div>
  )
}

// ── MY PROFILE ─────────────────────────────────────────────────────────────
function MyProfileView({ currentUser, supabase, onSettings, onBack, avatarUrl }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const color = currentUser?.avatar_color||'#5B9CF6'

  useEffect(() => {
    supabase.from('posts').select('*,likes(user_id),reposts(user_id),comments(id)').eq('user_id',currentUser.id).order('created_at',{ascending:false})
      .then(({data})=>{
        setPosts((data||[]).map(p=>({...p,likes_count:p.likes?.length||0,reposts_count:p.reposts?.length||0,comments_count:p.comments?.length||0})))
        setLoading(false)
      })
  },[])

  const deletePost = async (postId) => {
    await supabase.from('posts').delete().eq('id',postId).eq('user_id',currentUser.id)
    setPosts(prev=>prev.filter(p=>p.id!==postId))
  }

  return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'#fff',cursor:'pointer',fontSize:24}}>‹</button>
        <span style={{fontWeight:700,fontSize:17}}>My Profile</span>
        <button onClick={onSettings} style={{background:'none',border:'none',color:'#aaa',cursor:'pointer',fontSize:22}}>⚙️</button>
      </div>
      <div style={{height:110,background:`linear-gradient(135deg,${color}44,#845EF733)`}}/>
      <div style={{padding:'0 16px',marginTop:-36,marginBottom:16}}>
        <Avatar url={avatarUrl||currentUser?.avatar_url} name={currentUser?.display_name} color={color} size={72}/>
      </div>
      <div style={{padding:'0 16px 20px'}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><h2 style={{fontWeight:800,fontSize:22,margin:0}}>{currentUser?.display_name}</h2>{currentUser?.verified&&<span title='Sphere Verified Member' style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:20,height:20,borderRadius:'50%',background:'linear-gradient(135deg,#1a1a2e,#16213e)',border:'2px solid #C9A84C',boxShadow:'0 0 6px rgba(201,168,76,0.6)',flexShrink:0,cursor:'default'}}><span style={{fontFamily:'serif',fontWeight:900,fontSize:9,background:'linear-gradient(135deg,#FFD700,#C9A84C)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',letterSpacing:'-0.5px',lineHeight:1}}>SV</span></span>}</div>
        <p style={{color:'#555',fontSize:14,marginBottom:8}}>@{currentUser?.username}</p>
        {currentUser?.bio&&<p style={{color:'#aaa',fontSize:14,lineHeight:1.6,marginBottom:10}}>{currentUser.bio}</p>}
        {currentUser?.location&&<p style={{color:'#555',fontSize:13,marginBottom:10}}>📍 {currentUser.location}</p>}
        <div style={{display:'flex',gap:20,marginBottom:16}}>
          <span style={{fontSize:14}}><strong>{currentUser?.following_count||0}</strong> <span style={{color:'#555'}}>Following</span></span>
          <span style={{fontSize:14}}><strong>{currentUser?.followers_count||0}</strong> <span style={{color:'#555'}}>Followers</span></span>
        </div>
      </div>
      <div style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
        <p style={{padding:'14px 16px',fontWeight:700,fontSize:15,borderBottom:'1px solid rgba(255,255,255,0.07)'}}>My Posts</p>
        {loading&&<p style={{padding:'20px',textAlign:'center',color:'#444'}}>Loading...</p>}
        {!loading&&posts.length===0&&<div style={{padding:'40px 20px',textAlign:'center'}}><p style={{fontSize:40}}>📝</p><p style={{color:'#555',marginTop:8}}>No posts yet</p></div>}
        {posts.map(post=>(
          <div key={post.id} style={{padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            <p style={{color:'#ddd',fontSize:15,lineHeight:1.6,marginBottom:10}}>{post.content}</p>
            <div style={{display:'flex',gap:16,color:'#555',fontSize:13,alignItems:'center'}}>
              <span>💬 {post.comments_count}</span>
              <span>❤️ {post.likes_count}</span>
              <span>🔁 {post.reposts_count}</span>
              <span style={{marginLeft:'auto'}}>{timeAgo(post.created_at)}</span>
              <button onClick={()=>{ if(confirm('Delete this post?')) deletePost(post.id) }} style={{background:'rgba(255,71,87,0.1)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:8,padding:'4px 10px',color:'#FF4757',cursor:'pointer',fontSize:12,fontWeight:600}}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── POST CARD ──────────────────────────────────────────────────────────────
function PostCard({ post, currentUser, supabase, onUserClick, onDelete }) {
  const [liked, setLiked] = useState(post.user_liked||false)
  const [reposted, setReposted] = useState(post.user_reposted||false)
  const [likes, setLikes] = useState(post.likes_count||0)
  const [reposts, setReposts] = useState(post.reposts_count||0)
  const [comments, setComments] = useState(post.comments_count||0)
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [commentsList, setCommentsList] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)

  const loadComments = async() => {
    if(showComments){setShowComments(false);return}
    setLoadingComments(true)
    const {data} = await supabase.from('comments').select('*,author:profiles(id,display_name,username,avatar_color,avatar_url)').eq('post_id',post.id).order('created_at',{ascending:true})
    setCommentsList(data||[])
    setLoadingComments(false)
    setShowComments(true)
  }
  const a = post.author||{}
  const color = a.avatar_color||getColor(a.id)
  const isOwn = a.id === currentUser.id

  const toggleLike = async () => {
    const next = !liked
    setLiked(next); setLikes(l=>next?l+1:l-1)
    if (next) {
      const {error} = await supabase.from('likes').insert({post_id:post.id,user_id:currentUser.id})
      if (error) { setLiked(!next); setLikes(l=>next?l-1:l+1) }
      else if (post.user_id !== currentUser.id) {
        await supabase.from('notifications').insert({user_id:post.user_id,actor_id:currentUser.id,type:'like',post_id:post.id})
        sendPush(post.user_id, '❤️ New Like', (currentUser.display_name||'Someone')+' liked your post')
      }
    } else {
      await supabase.from('likes').delete().eq('post_id',post.id).eq('user_id',currentUser.id)
    }
  }

  const toggleRepost = async () => {
    const next = !reposted
    setReposted(next); setReposts(r=>next?r+1:r-1)
    if (next) {
      const {error} = await supabase.from('reposts').insert({post_id:post.id,user_id:currentUser.id})
      if (error) { setReposted(!next); setReposts(r=>next?r-1:r+1) }
      else if (post.user_id !== currentUser.id) await supabase.from('notifications').insert({user_id:post.user_id,actor_id:currentUser.id,type:'repost',post_id:post.id})
    } else {
      await supabase.from('reposts').delete().eq('post_id',post.id).eq('user_id',currentUser.id)
    }
  }

  const submitReply = async () => {
    if (!replyText.trim()) return
    const {error} = await supabase.from('comments').insert({post_id:post.id,user_id:currentUser.id,content:replyText.trim()})
    if (!error) {
      setComments(c=>c+1)
      setReplyText('')
      setShowReply(false)
      if (post.user_id !== currentUser.id) {
        await supabase.from('notifications').insert({user_id:post.user_id,actor_id:currentUser.id,type:'comment',post_id:post.id})
        sendPush(post.user_id, '💬 New Comment', (currentUser.display_name||'Someone')+' commented on your post')
      }
    }
  }

  return (
    <div style={{padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
      <div style={{display:'flex',gap:12}}>
        <button onClick={()=>onUserClick(a)} style={{background:'none',border:'none',padding:0,cursor:'pointer',flexShrink:0}}>
          <Avatar url={a.avatar_url} name={a.display_name} color={color} size={44}/>
        </button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:6,justifyContent:'space-between'}}>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <button onClick={()=>onUserClick(a)} style={{background:'none',border:'none',padding:0,cursor:'pointer',color:'#fff',fontWeight:700,fontSize:15}}>{a.display_name}</button>
              {a.verified&&<span title='Sphere Verified Member' style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:20,height:20,borderRadius:'50%',background:'linear-gradient(135deg,#1a1a2e,#16213e)',border:'2px solid #C9A84C',boxShadow:'0 0 6px rgba(201,168,76,0.6)',flexShrink:0,cursor:'default'}}><span style={{fontFamily:'serif',fontWeight:900,fontSize:9,background:'linear-gradient(135deg,#FFD700,#C9A84C)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',letterSpacing:'-0.5px',lineHeight:1}}>SV</span></span>}
              <span style={{color:'#555',fontSize:13}}>@{a.username}</span>
              <span style={{color:'#333'}}>·</span>
              <span style={{color:'#444',fontSize:12}}>{timeAgo(post.created_at)}</span>
            </div>
            {isOwn&&<button onClick={()=>{if(window.confirm('Delete this post?'))onDelete(post.id)}} style={{background:'none',border:'none',color:'#555',cursor:'pointer',fontSize:13,padding:'2px 6px'}}>🗑️</button>}
          </div>
          <p style={{color:'#ddd',fontSize:15,lineHeight:1.65,marginBottom:12,wordBreak:'break-word'}}>{post.content}</p>
          <div style={{display:'flex'}}>
            <button onClick={loadComments} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,background:'none',border:'none',cursor:'pointer',color:showComments?'#5B9CF6':'#555',fontSize:13,padding:'6px 0'}}>
              <span style={{fontSize:16}}>💬</span><span>{comments}</span>
            </button>
            <button onClick={toggleRepost} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,background:'none',border:'none',cursor:'pointer',color:reposted?'#00C9A7':'#555',fontSize:13,padding:'6px 0'}}>
              <span style={{fontSize:16}}>🔁</span><span>{reposts}</span>
            </button>
            <button onClick={toggleLike} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,background:'none',border:'none',cursor:'pointer',color:liked?'#FF4757':'#555',fontSize:13,padding:'6px 0'}}>
              <span style={{fontSize:16}}>{liked?'❤️':'🤍'}</span><span>{likes}</span>
            </button>
            <button style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,background:'none',border:'none',cursor:'pointer',color:'#555',fontSize:13,padding:'6px 0'}}>
              <span style={{fontSize:16}}>📤</span>
            </button>
          </div>
          {showComments&&(
            <div style={{marginTop:12,borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <span style={{color:'#888',fontSize:13}}>{comments} {comments===1?'comment':'comments'}</span>
                <button onClick={()=>setShowReply(!showReply)} style={{background:'rgba(91,156,246,0.1)',border:'1px solid rgba(91,156,246,0.2)',borderRadius:16,padding:'5px 12px',color:'#5B9CF6',cursor:'pointer',fontSize:13,fontWeight:600}}>+ Reply</button>
              </div>
              {loadingComments&&<p style={{color:'#444',fontSize:13,textAlign:'center'}}>Loading...</p>}
              {commentsList.map((cm,i)=>(
                <div key={cm.id} style={{display:'flex',gap:10,marginBottom:12,alignItems:'flex-start'}}>
                  <Avatar url={cm.author?.avatar_url} name={cm.author?.display_name} color={cm.author?.avatar_color||'#5B9CF6'} size={32}/>
                  <div style={{flex:1,background:'rgba(255,255,255,0.05)',borderRadius:12,padding:'8px 12px'}}>
                    <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
                      <span onClick={()=>onUserClick(cm.author)} style={{fontWeight:700,fontSize:13,color:'#fff',cursor:'pointer'}}>{cm.author?.display_name}</span>
                      <span style={{color:'#555',fontSize:11}}>{timeAgo(cm.created_at)}</span>
                    </div>
                    <p style={{color:'#ddd',fontSize:14,lineHeight:1.5,margin:0}}>{cm.content}</p>
                  </div>
                </div>
              ))}
              {!loadingComments&&commentsList.length===0&&<p style={{color:'#444',fontSize:13,textAlign:'center'}}>No comments yet</p>}
            </div>
          )}
          {showReply&&(
            <div style={{marginTop:10,display:'flex',gap:8,alignItems:'center'}}>
              <Avatar url={currentUser.avatar_url} name={currentUser.display_name} color={currentUser.avatar_color||'#5B9CF6'} size={28}/>
              <input value={replyText} onChange={e=>setReplyText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitReply()} placeholder="Write a reply..." autoFocus
                style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,padding:'8px 14px',color:'#fff',fontSize:14,outline:'none'}}/>
              <button onClick={submitReply} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:20,padding:'8px 14px',color:'#fff',cursor:'pointer',fontWeight:700}}>→</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── MAIN APP ───────────────────────────────────────────────────────────────

function NotificationsPanel({ currentUser, supabase, onUserClick }) {
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)
  const typeInfo = {
    like:{emoji:'❤️',text:'liked your post'},
    comment:{emoji:'💬',text:'commented on your post'},
    follow:{emoji:'👤',text:'started following you'},
    repost:{emoji:'🔁',text:'reposted your sphere'},
    welcome:{emoji:'🌐',text:'Welcome to Sphere!'},
    follow_request:{emoji:'👤',text:'sent you a follow request'},
    follow_accepted:{emoji:'✅',text:'accepted your follow request'},
  }
  useEffect(()=>{
    supabase.from('notifications').select('*,actor:profiles!actor_id(id,display_name,username,avatar_color,avatar_url)').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(40).then(({data})=>{setNotifs(data||[]);setLoading(false)})
    supabase.from('notifications').update({read:true}).eq('user_id',currentUser.id).eq('read',false).then(()=>{})
    const ch = supabase.channel('notifs:'+currentUser.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${currentUser.id}`},async(payload)=>{
      const {data} = await supabase.from('notifications').select('*,actor:profiles!actor_id(id,display_name,username,avatar_color,avatar_url)').eq('id',payload.new.id).single()
      if(data) setNotifs(prev=>[data,...prev])
    }).subscribe()
    return()=>supabase.removeChannel(ch)
  },[])
  return(
    <div>
      <div style={{padding:'16px 16px 12px',fontWeight:800,fontSize:20,color:'#fff'}}>Notifications 🔔</div>
      {loading&&<p style={{padding:'20px',textAlign:'center',color:'#444'}}>Loading...</p>}
      {!loading&&notifs.length===0&&<div style={{padding:'50px 20px',textAlign:'center'}}><p style={{fontSize:40}}>🔔</p><p style={{color:'#555',marginTop:8}}>No notifications yet</p></div>}
      {notifs.map((n,i)=>{
        const info = typeInfo[n.type]||{emoji:'🔔',text:''}
        const actor = n.actor
        return(<div key={n.id||i} onClick={()=>actor&&onUserClick(actor)} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)',cursor:actor?'pointer':'default',background:n.read?'transparent':'rgba(91,156,246,0.05)'}}>
          <div style={{width:44,height:44,borderRadius:'50%',background:'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0,overflow:'hidden'}}>
            {actor?.avatar_url?<img src={actor.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:<span>{info.emoji}</span>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <span style={{fontWeight:700,fontSize:14,color:'#fff'}}>{actor?.display_name||'Sphere'} </span>
            <span style={{color:'#888',fontSize:14}}>{n.message||info.text}</span>
          </div>
          <span style={{color:'#444',fontSize:12,flexShrink:0}}>{timeAgo(n.created_at)}</span>
        </div>)
      })}
    </div>
  )
}


function GroupChat({ group, currentUser, supabase, onBack, onUserClick }) {
  const [messages, setMessages] = useState([])
  const [members, setMembers] = useState([])
  const [msgText, setMsgText] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [showRequests, setShowRequests] = useState(false)
  const [joinRequests, setJoinRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMsg, setSelectedMsg] = useState(null)
  const [editingMsg, setEditingMsg] = useState(null)
  const [editText, setEditText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const longPressTimer = useRef(null)
  const [editName, setEditName] = useState(group.name)
  const [sendingImg, setSendingImg] = useState(false)
  const imgRef = useRef(null)
  const [editDesc, setEditDesc] = useState(group.description||'')
  const [editJoinMode, setEditJoinMode] = useState(group.join_mode||'open')
  const [editSaving, setEditSaving] = useState(false)
  const [groupAvatar, setGroupAvatar] = useState(group.avatar_url||null)
  const [groupData, setGroupData] = useState(group)
  const avatarRef = useRef(null)
  const bottomRef = useRef(null)
  const myRole = members.find(m=>m.user_id===currentUser.id)?.role||'member'
  const isAdmin = myRole==='admin'
  const isCreator = group.creator_id===currentUser.id

  useEffect(()=>{ loadAll() },[])
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])
  useEffect(()=>{
    const ch = supabase.channel('gc:'+group.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_messages',filter:'group_id=eq.'+group.id},async(payload)=>{
        const {data} = await supabase.from('group_messages').select('*,sender:profiles(id,display_name,avatar_url,avatar_color)').eq('id',payload.new.id).single()
        if(data) setMessages(prev=>[...prev.filter(m=>!m.id.toString().startsWith('temp_')),data])
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'group_messages',filter:'group_id=eq.'+group.id},(payload)=>{
        setMessages(prev=>prev.map(m=>m.id===payload.new.id?{...m,...payload.new}:m))
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'group_messages',filter:'group_id=eq.'+group.id},(payload)=>{
        setMessages(prev=>prev.filter(m=>m.id!==payload.old.id))
      })
      .subscribe()
    return()=>supabase.removeChannel(ch)
  },[])

  const loadAll = async () => {
    const [{data:msgs},{data:mems},{data:reqs}] = await Promise.all([
      supabase.from('group_messages').select('*,sender:profiles(id,display_name,avatar_url,avatar_color)').eq('group_id',group.id).order('created_at',{ascending:true}).limit(100),
      supabase.from('group_members').select('*,profile:profiles(id,display_name,username,avatar_url,avatar_color)').eq('group_id',group.id),
      supabase.from('group_join_requests').select('*,profile:profiles(id,display_name,username,avatar_url,avatar_color)').eq('group_id',group.id).eq('status','pending')
    ])
    setMessages(msgs||[])
    setMembers(mems||[])
    setJoinRequests(reqs||[])
    setLoading(false)
  }

  const sendMsg = async () => {
    if(!msgText.trim()) return
    const text=msgText.trim(); const reply=replyTo
    setMsgText(''); setReplyTo(null)
    const tempMsg = {id:'temp_'+Date.now(),group_id:group.id,sender_id:currentUser.id,content:text,reply_to:reply,created_at:new Date().toISOString(),sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}}
    setMessages(prev=>[...prev,tempMsg])
    await supabase.from('group_messages').insert({group_id:group.id,sender_id:currentUser.id,content:text,reply_to:reply})
  }

  const sendImage = async (file) => {
    if(!file) return
    setSendingImg(true)
    const ext = file.name.split('.').pop()
    const path = 'chats/gc_'+group.id+'_'+Date.now()+'.'+ext
    const {error} = await supabase.storage.from('avatars').upload(path,file,{upsert:false})
    if(error){alert('Image upload failed: '+error.message);setSendingImg(false);return}
    const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
    const url = urlData.publicUrl
    const tempMsg = {id:'temp_img_'+Date.now(),group_id:group.id,sender_id:currentUser.id,content:'📷 [image]',image_url:url,created_at:new Date().toISOString(),sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}}
    setMessages(prev=>[...prev,tempMsg])
    await supabase.from('group_messages').insert({group_id:group.id,sender_id:currentUser.id,content:'📷',image_url:url})
    setSendingImg(false)
  }

  const promoteToAdmin = async (member) => {
    await supabase.from('group_members').update({role:'admin'}).eq('group_id',group.id).eq('user_id',member.user_id)
    setMembers(prev=>prev.map(m=>m.user_id===member.user_id?{...m,role:'admin'}:m))
  }

  const demoteAdmin = async (member) => {
    await supabase.from('group_members').update({role:'member'}).eq('group_id',group.id).eq('user_id',member.user_id)
    setMembers(prev=>prev.map(m=>m.user_id===member.user_id?{...m,role:'member'}:m))
  }

  const removeMember = async (member) => {
    if(member.user_id===group.creator_id) return
    const {error} = await supabase.from('group_members').delete().eq('group_id',group.id).eq('user_id',member.user_id)
    if(!error) setMembers(prev=>prev.filter(m=>m.user_id!==member.user_id))
    else alert('Could not remove member. Check admin permissions.')
  }

  const acceptRequest = async (req) => {
    await supabase.from('group_join_requests').update({status:'accepted'}).eq('id',req.id)
    await supabase.from('group_members').insert({group_id:group.id,user_id:req.user_id})
    setJoinRequests(prev=>prev.filter(r=>r.id!==req.id))
    setMembers(prev=>[...prev,{user_id:req.user_id,role:'member',profile:req.profile}])
  }

  const rejectRequest = async (req) => {
    await supabase.from('group_join_requests').update({status:'rejected'}).eq('id',req.id)
    setJoinRequests(prev=>prev.filter(r=>r.id!==req.id))
  }

  const copyInviteLink = () => {
    const link = window.location.origin+'/join/'+group.tag
    navigator.clipboard.writeText(link).then(()=>alert('Invite link copied!\n'+link))
  }

  const handleLongPress = (msg) => { longPressTimer.current = setTimeout(()=>setSelectedMsg(msg),500) }
  const handlePressEnd = () => clearTimeout(longPressTimer.current)
  const deleteGCMsg = async(msg) => { setSelectedMsg(null); await supabase.from('group_messages').delete().eq('id',msg.id).eq('sender_id',currentUser.id); setMessages(prev=>prev.filter(m=>m.id!==msg.id)) }
  const startEditGCMsg = (msg) => { setSelectedMsg(null); setEditingMsg(msg.id); setEditText(msg.content) }
  const saveEditGCMsg = async() => { if(!editText.trim()) return; await supabase.from('group_messages').update({content:editText.trim()}).eq('id',editingMsg).eq('sender_id',currentUser.id); setMessages(prev=>prev.map(m=>m.id===editingMsg?{...m,content:editText.trim()}:m)); setEditingMsg(null); setEditText('') }

  const uploadGroupAvatar = async (file) => {
    if(!file) return
    const ext = file.name.split('.').pop()
    const path = 'groups/'+group.id+'.'+ext
    const {error} = await supabase.storage.from('avatars').upload(path,file,{upsert:true})
    if(error){alert('Upload failed: '+error.message);return}
    const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
    const url = urlData.publicUrl+'?t='+Date.now()
    const {data:updated,error:dbErr} = await supabase.from('groups').update({avatar_url:urlData.publicUrl}).eq('id',group.id).select().single()
    if(dbErr){alert('DB error: '+dbErr.message+' groupid:'+group.id);return}
    if(!updated){alert('No rows updated - group id mismatch?');return}
    group.avatar_url = urlData.publicUrl
    setGroupAvatar(url)
    alert('Done! url:'+url.slice(0,40))
  }

  const saveGroupSettings = async () => {
    if(!editName.trim()){alert('Group name cannot be empty');return}
    setEditSaving(true)
    await supabase.from('groups').update({name:editName.trim(),description:editDesc.trim(),join_mode:editJoinMode}).eq('id',group.id)
    group.name = editName.trim()
    group.description = editDesc.trim()
    group.join_mode = editJoinMode
    setEditSaving(false)
    alert('Group updated!')
  }

  const leaveGroup = async () => {
    if(isCreator){ alert('You cannot leave a group you created. Delete it instead.'); return }
    await supabase.from('group_members').delete().eq('group_id',group.id).eq('user_id',currentUser.id)
    onBack()
  }

  const deleteGroup = async () => {
    if(!isCreator) return
    await supabase.from('groups').delete().eq('id',group.id)
    onBack()
  }

  if(showRequests) return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setShowRequests(false)} style={{background:'none',border:'none',color:'#fff',fontSize:24,cursor:'pointer'}}>‹</button>
        <span style={{fontWeight:700,fontSize:17}}>Join Requests ({joinRequests.length})</span>
      </div>
      {joinRequests.length===0&&<div style={{padding:'50px 20px',textAlign:'center'}}><p style={{fontSize:40}}>📭</p><p style={{color:'#555',marginTop:8}}>No pending requests</p></div>}
      {joinRequests.map(req=>(
        <div key={req.id} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
          <Avatar url={req.profile?.avatar_url} name={req.profile?.display_name} color={req.profile?.avatar_color||'#5B9CF6'} size={46}/>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:15}}>{req.profile?.display_name}</div>
            <div style={{color:'#555',fontSize:13}}>@{req.profile?.username} · {timeAgo(req.created_at)}</div>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>acceptRequest(req)} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:10,padding:'8px 12px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>Accept</button>
            <button onClick={()=>rejectRequest(req)} style={{background:'rgba(255,71,87,0.1)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:10,padding:'8px 12px',color:'#FF4757',fontWeight:700,fontSize:13,cursor:'pointer'}}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  )

  if(showMembers) return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setShowMembers(false)} style={{background:'none',border:'none',color:'#fff',fontSize:24,cursor:'pointer'}}>‹</button>
        <span style={{fontWeight:700,fontSize:17}}>Members ({members.length})</span>
      </div>
      {members.map(m=>{
        const isThisCreator = m.user_id===group.creator_id
        const isThisAdmin = m.role==='admin'
        return(
          <div key={m.user_id} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
            <button onClick={()=>onUserClick(m.profile)} style={{background:'none',border:'none',padding:0,cursor:'pointer'}}>
              <Avatar url={m.profile?.avatar_url} name={m.profile?.display_name} color={m.profile?.avatar_color||'#5B9CF6'} size={46}/>
            </button>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontWeight:700,fontSize:15}}>{m.profile?.display_name}</span>
                {isThisCreator&&<span style={{background:'linear-gradient(135deg,#FFD700,#FFA500)',borderRadius:8,padding:'2px 7px',fontSize:10,fontWeight:800,color:'#000'}}>Creator</span>}
                {isThisAdmin&&!isThisCreator&&<span style={{background:'rgba(91,156,246,0.2)',border:'1px solid rgba(91,156,246,0.4)',borderRadius:8,padding:'2px 7px',fontSize:10,fontWeight:700,color:'#5B9CF6'}}>Admin</span>}
              </div>
              <div style={{color:'#555',fontSize:13}}>@{m.profile?.username}</div>
            </div>
            {(isAdmin||isCreator)&&m.user_id!==currentUser.id&&!isThisCreator&&(
              <div style={{display:'flex',gap:6}}>
                {!isThisAdmin&&<button onClick={()=>promoteToAdmin(m)} style={{background:'rgba(91,156,246,0.1)',border:'1px solid rgba(91,156,246,0.2)',borderRadius:10,padding:'6px 10px',color:'#5B9CF6',fontSize:12,fontWeight:700,cursor:'pointer'}}>Promote</button>}
                {isThisAdmin&&isCreator&&<button onClick={()=>demoteAdmin(m)} style={{background:'rgba(255,71,87,0.1)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:10,padding:'6px 10px',color:'#FF4757',fontSize:12,fontWeight:700,cursor:'pointer'}}>Demote</button>}
                {isCreator&&<button onClick={()=>removeMember(m)} style={{background:'rgba(255,71,87,0.1)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:10,padding:'6px 10px',color:'#FF4757',fontSize:12,fontWeight:700,cursor:'pointer'}}>Remove</button>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  if(showSettings) return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setShowSettings(false)} style={{background:'none',border:'none',color:'#fff',fontSize:24,cursor:'pointer'}}>‹</button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>Group Settings</span>
        {isCreator&&<button onClick={saveGroupSettings} disabled={editSaving} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:16,padding:'8px 16px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>{editSaving?'Saving...':'Save'}</button>}
      </div>
      <div style={{padding:20}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div onClick={()=>isCreator&&avatarRef.current?.click()} style={{width:88,height:88,borderRadius:24,background:group.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,fontWeight:800,color:'#fff',margin:'0 auto 8px',cursor:isCreator?'pointer':'default',overflow:'hidden',position:'relative'}}>
            {groupAvatar?<img src={groupAvatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:editName[0]||'G'}
            {isCreator&&<div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,0.5)',padding:'4px',textAlign:'center',fontSize:11,color:'#fff'}}>Edit</div>}
          </div>
          {isCreator&&<input ref={avatarRef} type="file" accept="image/*" onChange={e=>uploadGroupAvatar(e.target.files[0])} style={{display:'none'}}/>}
          <p style={{color:'#555',fontSize:13}}>{members.length} members · @{group.tag}</p>
        </div>
        {isCreator&&<>
          <input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Group name" style={{width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',boxSizing:'border-box',marginBottom:12}}/>
          <textarea value={editDesc} onChange={e=>setEditDesc(e.target.value)} placeholder="Description (optional)" rows={2} style={{width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',resize:'none',fontFamily:'sans-serif',boxSizing:'border-box',marginBottom:12}}/>
          <p style={{color:'#888',fontSize:13,marginBottom:8}}>Who can join?</p>
          <div style={{display:'flex',gap:8,marginBottom:20}}>
            <button onClick={()=>setEditJoinMode('open')} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid '+(editJoinMode==='open'?'#5B9CF6':'rgba(255,255,255,0.1)'),background:editJoinMode==='open'?'rgba(91,156,246,0.15)':'transparent',color:editJoinMode==='open'?'#5B9CF6':'#888',fontWeight:700,cursor:'pointer'}}>🌐 Anyone</button>
            <button onClick={()=>setEditJoinMode('request')} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid '+(editJoinMode==='request'?'#845EF7':'rgba(255,255,255,0.1)'),background:editJoinMode==='request'?'rgba(132,94,247,0.15)':'transparent',color:editJoinMode==='request'?'#845EF7':'#888',fontWeight:700,cursor:'pointer'}}>🔒 Request</button>
          </div>
        </>}
        <div style={{borderRadius:16,overflow:'hidden',border:'1px solid rgba(255,255,255,0.07)'}}>
          <button onClick={()=>{setShowSettings(false);setShowMembers(true)}} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'none',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'16px',color:'#fff',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between'}}>
            <span>👥 Members</span><span style={{color:'#555'}}>{members.length} ›</span>
          </button>
          <button onClick={copyInviteLink} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'none',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'16px',color:'#00C9A7',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between'}}>
            <span>🔗 Copy Invite Link</span><span style={{color:'#555',fontSize:13}}>@{group.tag}</span>
          </button>
          {(isAdmin||isCreator)&&<button onClick={()=>{setShowSettings(false);setShowRequests(true)}} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'none',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'16px',color:'#F7B731',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between'}}>
            <span>📬 Join Requests</span>{joinRequests.length>0&&<span style={{background:'#FF4757',borderRadius:10,padding:'2px 8px',fontSize:12,color:'#fff'}}>{joinRequests.length}</span>}
          </button>}
          <button onClick={leaveGroup} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'none',borderBottom:isCreator?'1px solid rgba(255,255,255,0.07)':'none',padding:'16px',color:'#FF4757',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left'}}>
            🚪 Leave Group
          </button>
          {isCreator&&<button onClick={()=>{if(window.confirm('Delete this group? This cannot be undone.'))deleteGroup()}} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'none',padding:'16px',color:'#FF4757',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left'}}>
            🗑️ Delete Group
          </button>}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff',display:'flex',flexDirection:'column'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'#fff',fontSize:24,cursor:'pointer'}}>‹</button>
        <div onClick={()=>setShowSettings(true)} style={{display:'flex',alignItems:'center',gap:10,flex:1,cursor:'pointer'}}>
          <div style={{width:38,height:38,borderRadius:12,background:group.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:18,color:'#fff',overflow:'hidden'}}>
            {groupAvatar?<img src={groupAvatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:group.name[0]}
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:16}}>{group.name}</div>
            <div style={{color:'#555',fontSize:12}}>{members.length} members</div>
          </div>
        </div>
        <button onClick={()=>setShowSettings(true)} style={{background:'none',border:'none',color:'#666',fontSize:22,cursor:'pointer'}}>⚙️</button>
      </div>

      <div style={{flex:1,padding:'16px 14px',display:'flex',flexDirection:'column',gap:8,paddingBottom:20,minHeight:'70vh'}}>
        {loading&&<p style={{textAlign:'center',color:'#444',marginTop:40}}>Loading...</p>}
        {!loading&&messages.length===0&&<div style={{textAlign:'center',marginTop:60}}>
          <p style={{fontSize:40}}>👋</p>
          <p style={{color:'#444',fontSize:14,marginTop:8}}>Say hello to the group!</p>
        </div>}
        {selectedMsg&&<div onClick={()=>setSelectedMsg(null)} style={{position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-end'}}>
          <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'#1a1d26',borderRadius:'20px 20px 0 0',padding:'16px 0 32px'}}>
            <div style={{width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.15)',margin:'0 auto 16px'}}/>
            <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:16,padding:'0 8px'}}>
              {['👍','❤️','😂','😮','😢','🔥','👏','💯'].map(e=>(
                <button key={e} onClick={async()=>{await supabase.from('group_messages').update({content:selectedMsg.content+' '+e}).eq('id',selectedMsg.id);setMessages(prev=>prev.map(m=>m.id===selectedMsg.id?{...m,content:m.content+' '+e}:m));setSelectedMsg(null)}} style={{background:'rgba(255,255,255,0.08)',border:'none',borderRadius:12,padding:'8px',fontSize:22,cursor:'pointer'}}>{e}</button>
              ))}
            </div>
            <button onClick={()=>{setReplyTo(selectedMsg.sender?.display_name+': '+selectedMsg.content?.slice(0,50));setSelectedMsg(null)}} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'#fff',fontSize:15,cursor:'pointer',textAlign:'left'}}>↩ Reply</button>
            {selectedMsg.sender_id===currentUser.id&&<>
              <button onClick={()=>startEditGCMsg(selectedMsg)} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'#5B9CF6',fontSize:15,cursor:'pointer',textAlign:'left'}}>✏️ Edit</button>
              <button onClick={()=>deleteGCMsg(selectedMsg)} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'#FF4757',fontSize:15,cursor:'pointer',textAlign:'left'}}>🗑️ Delete</button>
            </>}
          </div>
        </div>}
        {messages.map(msg=>{
          const own = msg.sender_id===currentUser.id
          return(
            <div key={msg.id}
              onTouchStart={()=>handleLongPress(msg)} onTouchEnd={handlePressEnd}
              onMouseDown={()=>handleLongPress(msg)} onMouseUp={handlePressEnd}
              style={{display:'flex',justifyContent:own?'flex-end':'flex-start',gap:8,alignItems:'flex-end'}}>
              {!own&&<Avatar url={msg.sender?.avatar_url} name={msg.sender?.display_name} color={msg.sender?.avatar_color||'#5B9CF6'} size={28}/>}
              <div style={{maxWidth:'75%'}}>
                {!own&&<div style={{color:'#5B9CF6',fontSize:11,fontWeight:700,marginBottom:3,paddingLeft:4}}>{msg.sender?.display_name}</div>}
                {msg.reply_to&&<div style={{background:'rgba(255,255,255,0.05)',borderLeft:'3px solid #5B9CF6',borderRadius:8,padding:'6px 10px',marginBottom:4,fontSize:12,color:'#888'}}>↩ {msg.reply_to}</div>}
                {editingMsg===msg.id?(
                  <div style={{display:'flex',gap:6}}>
                    <input value={editText} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveEditGCMsg()} style={{flex:1,background:'rgba(255,255,255,0.1)',border:'1px solid #5B9CF6',borderRadius:16,padding:'8px 12px',color:'#fff',fontSize:14,outline:'none'}}/>
                    <button onClick={saveEditGCMsg} style={{background:'#5B9CF6',border:'none',borderRadius:16,padding:'8px 12px',color:'#fff',cursor:'pointer'}}>✓</button>
                    <button onClick={()=>setEditingMsg(null)} style={{background:'rgba(255,255,255,0.1)',border:'none',borderRadius:16,padding:'8px 12px',color:'#fff',cursor:'pointer'}}>✕</button>
                  </div>
                ):(
                  <div style={{padding:msg.image_url?'6px':'11px 15px',borderRadius:own?'20px 20px 5px 20px':'20px 20px 20px 5px',background:own?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.09)',color:'#fff',fontSize:15,lineHeight:1.5,wordBreak:'break-word',overflow:'hidden'}}>
                    {msg.image_url?<img src={msg.image_url} style={{maxWidth:220,maxHeight:220,borderRadius:14,display:'block'}} alt="img"/>:msg.content}
                    <div style={{fontSize:10,color:own?'rgba(255,255,255,0.45)':'#444',marginTop:4,textAlign:'right',padding:msg.image_url?'0 8px 6px':'0'}}>{timeAgo(msg.created_at)}</div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef}/>
      </div>

      <div style={{position:'sticky',bottom:0,background:'#090B10',padding:'10px 14px 24px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,alignItems:'center'}}>
        {replyTo&&<div style={{padding:'8px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <span style={{color:'#888',fontSize:12}}>↩ <span style={{color:'#5B9CF6'}}>{replyTo}</span></span>
          <button onClick={()=>setReplyTo(null)} style={{background:'none',border:'none',color:'#555',cursor:'pointer',fontSize:18}}>✕</button>
        </div>}
        <input ref={imgRef} type="file" accept="image/*" onChange={e=>sendImage(e.target.files[0])} style={{display:'none'}}/>
        <button onClick={()=>imgRef.current?.click()} disabled={sendingImg} style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'none',cursor:'pointer',color:'#888',fontSize:18,flexShrink:0}}>{sendingImg?'⏳':'🖼️'}</button>
        <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Message group..." style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:26,padding:'12px 18px',color:'#fff',fontSize:15,outline:'none',fontFamily:'sans-serif'}}/>
        <button onClick={sendMsg} disabled={!msgText.trim()} style={{width:46,height:46,borderRadius:'50%',background:msgText.trim()?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.06)',border:'none',cursor:msgText.trim()?'pointer':'not-allowed',color:msgText.trim()?'#fff':'#333',fontSize:20,flexShrink:0}}>→</button>
      </div>
    </div>
  )
}

function ReelsView({ currentUser, supabase, onUserClick, onClose }) {
  const [reels, setReels] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [caption, setCaption] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [liked, setLiked] = useState({})
  const [likes, setLikes] = useState({})
  const [playing, setPlaying] = useState(true)
  const videoRef = useRef(null)
  const fileRef = useRef(null)
  const touchStart = useRef(null)

  useEffect(()=>{ loadReels() },[])
  useEffect(()=>{ if(videoRef.current){ videoRef.current.currentTime=0; playing?videoRef.current.play().catch(()=>{}):videoRef.current.pause() } },[currentIdx,playing])

  const loadReels = async() => {
    const {data} = await supabase.from('reels').select('*,author:profiles(id,display_name,username,avatar_url,avatar_color),reel_likes(user_id)').order('created_at',{ascending:false}).limit(20)
    if(!data) return
    setReels(data)
    const likedMap={}, likesMap={}
    data.forEach(r=>{ likedMap[r.id]=r.reel_likes?.some(l=>l.user_id===currentUser.id); likesMap[r.id]=r.reel_likes?.length||0 })
    setLiked(likedMap); setLikes(likesMap)
  }

  const toggleLike = async(reel) => {
    const isLiked = liked[reel.id]
    setLiked(p=>({...p,[reel.id]:!isLiked}))
    setLikes(p=>({...p,[reel.id]:(p[reel.id]||0)+(isLiked?-1:1)}))
    if(isLiked) await supabase.from('reel_likes').delete().eq('reel_id',reel.id).eq('user_id',currentUser.id)
    else await supabase.from('reel_likes').insert({reel_id:reel.id,user_id:currentUser.id})
  }

  const uploadReel = async() => {
    if(!videoFile) return
    setUploading(true)
    const ext = videoFile.name.split('.').pop()
    const path = 'reels/'+currentUser.id+'_'+Date.now()+'.'+ext
    const {error} = await supabase.storage.from('avatars').upload(path,videoFile,{upsert:false})
    if(error){alert('Upload failed: '+error.message);setUploading(false);return}
    const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
    const {data:reel} = await supabase.from('reels').insert({user_id:currentUser.id,video_url:urlData.publicUrl,caption:caption.trim()}).select('*,author:profiles(id,display_name,username,avatar_url,avatar_color)').single()
    if(reel){ setReels(prev=>[reel,...prev]); setLikes(p=>({...p,[reel.id]:0})); setLiked(p=>({...p,[reel.id]:false})) }
    setVideoFile(null); setCaption(''); setShowUpload(false); setUploading(false)
  }

  const deleteReel = async(reel) => {
    await supabase.from('reels').delete().eq('id',reel.id)
    const newReels = reels.filter(r=>r.id!==reel.id)
    setReels(newReels)
    if(currentIdx>=newReels.length) setCurrentIdx(Math.max(0,newReels.length-1))
  }

  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientY }
  const handleTouchEnd = (e) => {
    if(!touchStart.current) return
    const diff = touchStart.current - e.changedTouches[0].clientY
    if(Math.abs(diff)>50){ if(diff>0&&currentIdx<reels.length-1) setCurrentIdx(i=>i+1); else if(diff<0&&currentIdx>0) setCurrentIdx(i=>i-1) }
    touchStart.current = null
  }

  const reel = reels[currentIdx]

  if(showUpload) return (
    <div style={{position:'fixed',inset:0,zIndex:400,background:'#090B10',color:'#fff',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'16px',display:'flex',alignItems:'center',gap:12,borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        <button onClick={()=>setShowUpload(false)} style={{background:'none',border:'none',color:'#fff',fontSize:24,cursor:'pointer'}}>✕</button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>New Reel</span>
        <button onClick={uploadReel} disabled={!videoFile||uploading} style={{background:videoFile?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.1)',border:'none',borderRadius:20,padding:'8px 20px',color:'#fff',fontWeight:700,cursor:'pointer'}}>{uploading?'Uploading...':'Post'}</button>
      </div>
      <div style={{flex:1,padding:20,display:'flex',flexDirection:'column',gap:16}}>
        <div onClick={()=>fileRef.current?.click()} style={{height:200,background:'rgba(255,255,255,0.05)',border:'2px dashed rgba(255,255,255,0.15)',borderRadius:16,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',gap:8}}>
          {videoFile?<><span style={{fontSize:40}}>🎬</span><span style={{color:'#00C9A7',fontSize:14}}>{videoFile.name}</span></>:<><span style={{fontSize:40}}>📹</span><span style={{color:'#555',fontSize:14}}>Tap to select video</span></>}
        </div>
        <input ref={fileRef} type="file" accept="video/*" onChange={e=>setVideoFile(e.target.files[0])} style={{display:'none'}}/>
        <textarea value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Write a caption..." rows={3} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',resize:'none',fontFamily:'sans-serif'}}/>
      </div>
    </div>
  )

  return (
    <div style={{position:'fixed',inset:0,zIndex:400,background:'#000'}}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <button onClick={onClose} style={{position:'absolute',top:16,left:16,zIndex:10,background:'rgba(0,0,0,0.5)',border:'none',borderRadius:'50%',width:36,height:36,color:'#fff',fontSize:20,cursor:'pointer'}}>✕</button>
      <button onClick={()=>setShowUpload(true)} style={{position:'absolute',top:16,right:16,zIndex:10,background:'rgba(0,0,0,0.5)',border:'none',borderRadius:20,padding:'8px 14px',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>+ Reel</button>

      {reels.length===0&&<div style={{height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,color:'#fff'}}>
        <p style={{fontSize:48}}>🎬</p>
        <p style={{fontSize:18,fontWeight:700}}>No reels yet</p>
        <button onClick={()=>setShowUpload(true)} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:24,padding:'12px 28px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer'}}>Post First Reel</button>
      </div>}

      {reel&&<>
        <video ref={videoRef} src={reel.video_url} style={{width:'100%',height:'100%',objectFit:'cover'}} loop playsInline onClick={()=>setPlaying(p=>!p)} autoPlay muted={false}/>
        {!playing&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}><div style={{width:72,height:72,borderRadius:'50%',background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>▶️</div></div>}

        <div style={{position:'absolute',bottom:100,left:16,right:80,color:'#fff'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,cursor:'pointer'}} onClick={()=>onUserClick(reel.author)}>
            <Avatar url={reel.author?.avatar_url} name={reel.author?.display_name} color={reel.author?.avatar_color||'#5B9CF6'} size={36}/>
            <div>
              <div style={{fontWeight:700,fontSize:15,textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>{reel.author?.display_name}</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.7)'}}>@{reel.author?.username}</div>
            </div>
          </div>
          {reel.caption&&<p style={{fontSize:14,lineHeight:1.5,textShadow:'0 1px 4px rgba(0,0,0,0.8)',margin:0}}>{reel.caption}</p>}
        </div>

        <div style={{position:'absolute',bottom:120,right:12,display:'flex',flexDirection:'column',alignItems:'center',gap:20}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer'}} onClick={()=>toggleLike(reel)}>
            <span style={{fontSize:30}}>{liked[reel.id]?'❤️':'🤍'}</span>
            <span style={{color:'#fff',fontSize:13,fontWeight:700,textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>{likes[reel.id]||0}</span>
          </div>
          {reel.user_id===currentUser.id&&<div style={{cursor:'pointer'}} onClick={()=>deleteReel(reel)}>
            <span style={{fontSize:28}}>🗑️</span>
          </div>}
        </div>

        <div style={{position:'absolute',bottom:40,left:'50%',transform:'translateX(-50%)',display:'flex',gap:6}}>
          {reels.map((_,i)=><div key={i} style={{width:i===currentIdx?20:6,height:6,borderRadius:3,background:i===currentIdx?'#fff':'rgba(255,255,255,0.4)',transition:'width 0.2s'}}/>)}
        </div>
      </>}
    </div>
  )
}

function PulseTab({ currentUser, supabase, onUserClick, autoOpenGroup, onAutoOpenDone, onHideNav }) {
  const [groups, setGroups] = useState([])
  const [pulses, setPulses] = useState([])
  const [myPulse, setMyPulse] = useState([])
  const [viewingPulse, setViewingPulse] = useState(null)
  const [viewingGroup, setViewingGroup] = useState(null)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showCreatePulse, setShowCreatePulse] = useState(false)
  const [showReels, setShowReels] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [groupTag, setGroupTag] = useState('')
  const [joinMode, setJoinMode] = useState('open')
  const [groupSearch, setGroupSearch] = useState('')
  const [searchedGroups, setSearchedGroups] = useState([])
  const [pulseText, setPulseText] = useState('')
  const [pulseBg, setPulseBg] = useState('#5B9CF6')
  const [saving, setSaving] = useState(false)
  const COLORS = ['#5B9CF6','#845EF7','#FF6B35','#00C9A7','#FF4757','#F7B731','#FD79A8','#A29BFE']

  useEffect(()=>{ loadAll() },[])
  useEffect(()=>{
    if(autoOpenGroup){setViewingGroup(autoOpenGroup);if(onAutoOpenDone)onAutoOpenDone()}
  },[autoOpenGroup])
  useEffect(()=>{
    onHideNav&&onHideNav(!!(viewingGroup||viewingPulse||showCreatePulse||showCreateGroup))
  },[viewingGroup,viewingPulse,showCreatePulse,showCreateGroup])

  const loadAll = async () => {
    const [{data:g},{data:p},{data:mp}] = await Promise.all([
      supabase.from('groups').select('*,group_members(user_id)').order('created_at',{ascending:false}),
      supabase.from('pulses').select('*,author:profiles(id,display_name,username,avatar_url,avatar_color)').order('created_at',{ascending:false}),
      supabase.from('pulses').select('*,author:profiles(id,display_name,username,avatar_url,avatar_color)').eq('user_id',currentUser.id).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false})
    ])
    setGroups(g||[])
    setPulses((p||[]).filter(x=>x.user_id!==currentUser.id))
    setMyPulse(mp||[])
  }

  const searchGroups = async (q) => {
    setGroupSearch(q)
    if(!q.trim()){setSearchedGroups([]);return}
    const {data} = await supabase.from('groups').select('*,group_members(user_id)').ilike('tag',q.trim().toLowerCase()+'%').limit(10)
    setSearchedGroups(data||[])
  }

  const joinGroupByTag = async (group) => {
    const isMember = group.group_members?.some(m=>m.user_id===currentUser.id)
    if(isMember){setViewingGroup(group);return}
    if(group.join_mode==='open'){
      await supabase.from('group_members').insert({group_id:group.id,user_id:currentUser.id})
      setViewingGroup({...group,group_members:[...(group.group_members||[]),{user_id:currentUser.id}]})
    } else {
      const {error} = await supabase.from('group_join_requests').insert({group_id:group.id,user_id:currentUser.id})
      if(!error) alert('Join request sent! Waiting for admin approval.')
      else alert('Request already sent or you are already a member.')
    }
    loadAll()
  }

  const createGroup = async () => {
    if(!groupName.trim()) return
    setSaving(true)
    const tag = groupTag.trim().toLowerCase().replace(/[^a-z0-9_]/g,'')
    if(!tag){setSaving(false);alert('Please enter a valid group tag');return}
    const {data} = await supabase.from('groups').insert({name:groupName.trim(),description:groupDesc.trim(),creator_id:currentUser.id,cover_color:pulseBg,tag,join_mode:joinMode}).select().single()
    if(data) {
      await supabase.from('group_members').insert({group_id:data.id,user_id:currentUser.id})
      setGroups(g=>[{...data,group_members:[{user_id:currentUser.id}]},...g])
      setGroupName(''); setGroupDesc(''); setGroupTag(''); setJoinMode('open'); setShowCreateGroup(false)
    }
    setSaving(false)
  }

  const createPulse = async () => {
    if(!pulseText.trim()) return
    setSaving(true)
    const {data} = await supabase.from('pulses').insert({user_id:currentUser.id,content:pulseText.trim(),bg_color:pulseBg}).select('*,author:profiles(id,display_name,username,avatar_url,avatar_color)').single()
    if(data) { setMyPulse(prev=>[data,...(Array.isArray(prev)?prev:[])].filter(Boolean)); setPulseText(''); setShowCreatePulse(false) }
    setSaving(false)
  }

  const joinGroup = async (group) => {
    const isMember = group.group_members?.some(m=>m.user_id===currentUser.id)
    if(isMember) { setViewingGroup(group); return }
    await supabase.from('group_members').insert({group_id:group.id,user_id:currentUser.id})
    setGroups(g=>g.map(x=>x.id===group.id?{...x,group_members:[...(x.group_members||[]),{user_id:currentUser.id}]}:x))
    setViewingGroup({...group,group_members:[...(group.group_members||[]),{user_id:currentUser.id}]})
  }

  if(showReels) return <ReelsView currentUser={currentUser} supabase={supabase} onUserClick={onUserClick} onClose={()=>{setShowReels(false);onHideNav&&onHideNav(false)}}/>

  if(viewingPulse) {
    const allPulses=[...(Array.isArray(myPulse)?myPulse:[]),...pulses]
    const currentIdx=allPulses.findIndex(p=>p.id===viewingPulse.id)
    const goNext=()=>{ if(currentIdx<allPulses.length-1)setViewingPulse(allPulses[currentIdx+1]); else{setViewingPulse(null);onHideNav&&onHideNav(false)} }
    const goPrev=()=>{ if(currentIdx>0)setViewingPulse(allPulses[currentIdx-1]) }
  return (
    <div style={{position:'fixed',inset:0,zIndex:300,background:viewingPulse.bg_color||'#090B10',display:'flex',flexDirection:'column'}}>
    <style>{'@keyframes shrink{from{width:100%}to{width:0%}}'}</style>
      <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',gap:2,padding:'4px 8px',zIndex:10}}>
        {allPulses.map((p,i)=>(
          <div key={p.id} style={{flex:1,height:3,borderRadius:2,background:'rgba(255,255,255,0.2)',overflow:'hidden'}}>
            <div style={{height:'100%',background:'#fff',borderRadius:2,animation:i===currentIdx?'shrink 5s linear forwards':'none',width:i<currentIdx?'100%':'0%'}} onAnimationEnd={goNext}/>
          </div>
        ))}
      </div>
      <style>{'@keyframes progress{from{width:0}to{width:100%}}'}</style>
      <div style={{padding:'20px 16px 8px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>{setViewingPulse(null);onHideNav&&onHideNav(false)}} style={{background:'none',border:'none',color:'#fff',fontSize:24,cursor:'pointer'}}>✕</button>
        <Avatar url={viewingPulse.author?.avatar_url} name={viewingPulse.author?.display_name} color={viewingPulse.author?.avatar_color||'#5B9CF6'} size={38}/>
        <div>
          <div style={{color:'#fff',fontWeight:700,fontSize:15}}>{viewingPulse.author?.display_name}</div>
          <div style={{color:'rgba(255,255,255,0.6)',fontSize:12}}>{timeAgo(viewingPulse.created_at)}</div>
        </div>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
        <p style={{color:'#fff',fontSize:24,fontWeight:700,textAlign:'center',lineHeight:1.5}}>{viewingPulse.content}</p>
      </div>
      <div style={{position:'absolute',top:60,left:0,bottom:80,width:'40%'}} onClick={goPrev}/>
      <div style={{position:'absolute',top:60,right:0,bottom:80,width:'40%'}} onClick={goNext}/>
      <div style={{padding:'0 16px 40px',display:'flex',gap:10}}>
        <button onClick={()=>onUserClick(viewingPulse.author)} style={{flex:1,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:24,padding:'12px',color:'#fff',fontWeight:700,cursor:'pointer'}}>View Profile</button>
      </div>
    </div>
  )}

  if(viewingGroup) return <GroupChat group={viewingGroup} currentUser={currentUser} supabase={supabase} onBack={()=>{setViewingGroup(null);onHideNav&&onHideNav(false)}} onUserClick={onUserClick}/>

  if(showCreatePulse) return (
    <div style={{minHeight:'100vh',background:pulseBg,color:'#fff',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setShowCreatePulse(false)} style={{background:'none',border:'none',color:'#fff',fontSize:24,cursor:'pointer'}}>✕</button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>New Pulse</span>
        <button onClick={createPulse} disabled={saving||!pulseText.trim()} style={{background:'rgba(255,255,255,0.2)',border:'1px solid rgba(255,255,255,0.4)',borderRadius:20,padding:'8px 20px',color:'#fff',fontWeight:700,cursor:'pointer'}}>{saving?'Posting...':'Share'}</button>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
        <textarea value={pulseText} onChange={e=>setPulseText(e.target.value)} placeholder="What's your pulse?" autoFocus style={{background:'transparent',border:'none',color:'#fff',fontSize:24,fontWeight:700,textAlign:'center',outline:'none',resize:'none',width:'100%',lineHeight:1.5,fontFamily:'sans-serif'}} rows={4}/>
      </div>
      <div style={{padding:'16px',display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
        {COLORS.map(c=><div key={c} onClick={()=>setPulseBg(c)} style={{width:32,height:32,borderRadius:'50%',background:c,border:pulseBg===c?'3px solid #fff':'3px solid transparent',cursor:'pointer'}}/>)}
      </div>
    </div>
  )

  if(showCreateGroup) return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setShowCreateGroup(false)} style={{background:'none',border:'none',color:'#fff',fontSize:24,cursor:'pointer'}}>✕</button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>Create Group</span>
        <button onClick={createGroup} disabled={saving||!groupName.trim()} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:20,padding:'8px 20px',color:'#fff',fontWeight:700,cursor:'pointer'}}>{saving?'Creating...':'Create'}</button>
      </div>
      <div style={{padding:16}}>
        <div style={{width:72,height:72,borderRadius:20,background:pulseBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,fontWeight:800,color:'#fff',margin:'16px auto 24px'}}>{groupName[0]||'G'}</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center',marginBottom:24}}>
          {COLORS.map(c=><div key={c} onClick={()=>setPulseBg(c)} style={{width:28,height:28,borderRadius:'50%',background:c,border:pulseBg===c?'3px solid #fff':'3px solid transparent',cursor:'pointer'}}/>)}
        </div>
        <input value={groupName} onChange={e=>setGroupName(e.target.value)} placeholder="Group name" style={{width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',boxSizing:'border-box',marginBottom:12}}/>
        <div style={{position:'relative',marginBottom:12}}>
          <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'#555',fontSize:15}}>@</span>
          <input value={groupTag} onChange={e=>setGroupTag(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} placeholder="group_tag (unique)" style={{width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px 12px 28px',color:'#fff',fontSize:15,outline:'none',boxSizing:'border-box'}}/>
        </div>
        <textarea value={groupDesc} onChange={e=>setGroupDesc(e.target.value)} placeholder="Description (optional)" rows={2} style={{width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',resize:'none',fontFamily:'sans-serif',boxSizing:'border-box',marginBottom:12}}/>
        <div style={{marginBottom:8}}>
          <p style={{color:'#888',fontSize:13,marginBottom:8}}>Who can join?</p>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setJoinMode('open')} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid '+(joinMode==='open'?'#5B9CF6':'rgba(255,255,255,0.1)'),background:joinMode==='open'?'rgba(91,156,246,0.15)':'transparent',color:joinMode==='open'?'#5B9CF6':'#888',fontWeight:700,cursor:'pointer'}}>🌐 Anyone</button>
            <button onClick={()=>setJoinMode('request')} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid '+(joinMode==='request'?'#845EF7':'rgba(255,255,255,0.1)'),background:joinMode==='request'?'rgba(132,94,247,0.15)':'transparent',color:joinMode==='request'?'#845EF7':'#888',fontWeight:700,cursor:'pointer'}}>🔒 Request</button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{paddingBottom:20}}>
      <div style={{padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontWeight:800,fontSize:18}}>Pulse ⚡</span>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>{setShowReels(true);onHideNav&&onHideNav(true)}} style={{background:'rgba(255,71,87,0.1)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:12,padding:'6px 14px',color:'#FF4757',cursor:'pointer',fontWeight:700,fontSize:13}}>🎬 Reels</button>
          <button onClick={()=>setShowCreateGroup(true)} style={{background:'rgba(91,156,246,0.1)',border:'1px solid rgba(91,156,246,0.2)',borderRadius:12,padding:'6px 14px',color:'#5B9CF6',cursor:'pointer',fontWeight:700,fontSize:13}}>+ Group</button>
        </div>
      </div>
      <div style={{padding:'0 16px 12px'}}>
        <input value={groupSearch} onChange={e=>searchGroups(e.target.value)} placeholder="🔍 Search group by @tag..." style={{width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:24,padding:'10px 16px',color:'#fff',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
        {searchedGroups.length>0&&<div style={{marginTop:8,borderRadius:12,overflow:'hidden',border:'1px solid rgba(255,255,255,0.08)'}}>
          {searchedGroups.map(g=>{
            const isMember = g.group_members?.some(m=>m.user_id===currentUser.id)
            return(
              <div key={g.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,0.05)',background:'rgba(255,255,255,0.03)'}}>
                <div style={{width:42,height:42,borderRadius:12,background:g.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:'#fff',flexShrink:0}}>{g.name[0]}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:15,color:'#fff'}}>{g.name}</div>
                  <div style={{color:'#555',fontSize:12}}>@{g.tag} · {g.group_members?.length||0} members · {g.join_mode==='open'?'🌐 Open':'🔒 Request'}</div>
                </div>
                <button onClick={()=>joinGroupByTag(g)} style={{background:isMember?'rgba(255,255,255,0.07)':'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:16,padding:'8px 14px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>{isMember?'Open':'Join'}</button>
              </div>
            )
          })}
        </div>}
        {groupSearch&&searchedGroups.length===0&&<p style={{color:'#444',fontSize:13,padding:'8px 4px'}}>No groups found for "@{groupSearch}"</p>}
      </div>

      {groups.length>0&&<>
        <p style={{padding:'0 16px 8px',color:'#555',fontSize:13,fontWeight:600}}>GROUPS</p>
        <div style={{display:'flex',gap:12,padding:'0 16px 16px',overflowX:'auto',scrollbarWidth:'none'}}>
          {groups.map(g=>(
            <div key={g.id} onClick={()=>joinGroup(g)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,cursor:'pointer',flexShrink:0}}>
              <div style={{width:60,height:60,borderRadius:18,background:g.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:800,color:'#fff',border:g.group_members?.some(m=>m.user_id===currentUser.id)?'2px solid #5B9CF6':'2px solid transparent',overflow:'hidden'}}>
              {g.avatar_url?<img src={g.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:g.name[0]}
            </div>
              <span style={{color:'#ccc',fontSize:11,maxWidth:60,textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.name}</span>
            </div>
          ))}
        </div>
      </>}

      <p style={{padding:'0 16px 8px',color:'#555',fontSize:13,fontWeight:600}}>PULSES</p>
      <div style={{display:'flex',gap:12,padding:'0 16px 20px',overflowX:'auto',scrollbarWidth:'none'}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flexShrink:0}}>
          <div onClick={()=>setShowCreatePulse(true)} style={{width:64,height:64,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'2px dashed #5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,color:'#5B9CF6',cursor:'pointer'}}>＋</div>
          <span style={{color:'#ccc',fontSize:11}}>Add Pulse</span>
        </div>
        {(Array.isArray(myPulse)?myPulse:[]).map(mp=>(
          <div key={mp.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flexShrink:0,position:'relative'}}>
            <div onClick={()=>setViewingPulse({...mp,author:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}})} style={{width:64,height:64,borderRadius:'50%',background:mp.bg_color||'#5B9CF6',border:'3px solid #00C9A7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:'#fff',cursor:'pointer'}}>⚡</div>
            <button onClick={async(e)=>{e.stopPropagation();await supabase.from('pulses').delete().eq('id',mp.id);setMyPulse(prev=>prev.filter(p=>p.id!==mp.id))}} style={{position:'absolute',top:-4,right:-4,width:20,height:20,borderRadius:'50%',background:'#FF4757',border:'none',color:'#fff',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            <span style={{color:'#ccc',fontSize:11}}>My Pulse</span>
          </div>
        ))}
        {pulses.map(p=>(
          <div key={p.id} onClick={()=>setViewingPulse(p)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,cursor:'pointer',flexShrink:0}}>
            <div style={{width:64,height:64,borderRadius:'50%',background:p.bg_color||'#5B9CF6',border:'3px solid #845EF7',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
              {p.author?.avatar_url?<img src={p.author.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:<span style={{color:'#fff',fontWeight:800,fontSize:20}}>{p.author?.display_name?.[0]}</span>}
            </div>
            <span style={{color:'#ccc',fontSize:11,maxWidth:64,textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.author?.display_name}</span>
          </div>
        ))}
        {pulses.length===0&&<p style={{color:'#444',fontSize:14,padding:'20px 0'}}>No pulses yet</p>}
      </div>
    </div>
  )
}

function OmniCoreAI({ currentUser, onClose }) {
  const [messages, setMessages] = useState([{role:'assistant',content:'Hey ' + (currentUser?.display_name?.split(' ')[0]||'there') + '! I am OmniCore AI by OmniSphereLabs. How can I help you today?'}])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [genImg, setGenImg] = useState('')
  const [imgPrompt, setImgPrompt] = useState('')
  const [generatingImg, setGeneratingImg] = useState(false)
  const [showImgGen, setShowImgGen] = useState(false)
  const bottomRef = useRef(null)

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])

  const generateImage = async() => {
    if(!imgPrompt.trim()) return
    setGeneratingImg(true)
    setGenImg(null)
    try {
      const res = await fetch('/api/imagine',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:imgPrompt})})
      const data = await res.json()
      if(data.image) setGenImg(data.image)
      else alert('Generation failed, try again')
    } catch(e) { alert('Error: '+e.message) }
    setGeneratingImg(false)
  }

  const send = async() => {
    if(!input.trim()||loading) return
    const userMsg = {role:'user',content:input.trim()}
    setMessages(prev=>[...prev,userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/omnicore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[...messages,userMsg].filter(m=>m.role!=='system')})})
      const data = await res.json()
      setMessages(prev=>[...prev,{role:'assistant',content:data.reply}])
    } catch(e) {
      setMessages(prev=>[...prev,{role:'assistant',content:'Sorry, I am having trouble connecting. Please try again.'}])
    }
    setLoading(false)
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:500,background:'#090B10',color:'#fff',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',gap:12,background:'rgba(9,11,16,0.98)'}}>
        <button onClick={onClose} style={{background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:24}}>‹</button>
        <div style={{width:38,height:38,borderRadius:12,background:'linear-gradient(135deg,#5B9CF6,#845EF7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🤖</div>
        <div>
          <div style={{fontWeight:800,fontSize:16,background:'linear-gradient(135deg,#5B9CF6,#845EF7)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>OmniCore AI</div>
          <div style={{color:'#00C9A7',fontSize:11}}>● by OmniSphereLabs</div>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'16px 14px',display:'flex',flexDirection:'column',gap:12,paddingBottom:80}}>
        {messages.map((msg,i)=>(
          <div key={i} style={{display:'flex',justifyContent:msg.role==='user'?'flex-end':'flex-start',gap:8,alignItems:'flex-end'}}>
            {msg.role==='assistant'&&<div style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#5B9CF6,#845EF7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>🤖</div>}
            <div style={{maxWidth:'80%',padding:'11px 15px',borderRadius:msg.role==='user'?'20px 20px 5px 20px':'20px 20px 20px 5px',background:msg.role==='user'?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.08)',color:'#fff',fontSize:15,lineHeight:1.6,wordBreak:'break-word',whiteSpace:'pre-wrap'}}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading&&<div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
          <div style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#5B9CF6,#845EF7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>🤖</div>
          <div style={{padding:'11px 15px',borderRadius:'20px 20px 20px 5px',background:'rgba(255,255,255,0.08)',color:'#888',fontSize:15}}>Thinking...</div>
        </div>}
        <div ref={bottomRef}/>
      </div>

      {showImgGen&&<div style={{position:'fixed',inset:0,zIndex:10,background:'rgba(0,0,0,0.85)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,gap:12}}>
        <div style={{width:'100%',maxWidth:400,background:'#1a1d26',borderRadius:20,padding:20,display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontWeight:700,fontSize:17,color:'#fff'}}>🎨 Image Generator</span>
            <button onClick={()=>{setShowImgGen(false);setGenImg('')}} style={{background:'none',border:'none',color:'#888',fontSize:22,cursor:'pointer'}}>✕</button>
          </div>
          <input value={imgPrompt} onChange={e=>setImgPrompt(e.target.value)} placeholder="Describe the image..." style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none'}}/>
          <button onClick={generateImage} disabled={generatingImg||!imgPrompt.trim()} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:12,padding:'12px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer'}}>{generatingImg?'Generating...':'Generate Image'}</button>
          {genImg&&<img src={genImg} style={{width:'100%',borderRadius:12,marginTop:4}} alt="generated"/>}
          {genImg&&<button onClick={()=>window.open(genImg,'_blank')} style={{background:'rgba(255,255,255,0.07)',border:'none',borderRadius:12,padding:'10px',color:'#fff',fontSize:13,cursor:'pointer'}}>💾 Open / Save Image</button>}
        </div>
      </div>}
      <div style={{position:'fixed',bottom:0,left:0,right:0,maxWidth:600,margin:'0 auto',padding:'10px 14px 24px',background:'#090B10',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,alignItems:'center'}}>
        <button onClick={()=>setShowImgGen(true)} style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'none',cursor:'pointer',fontSize:18,flexShrink:0}}>🎨</button>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask OmniCore anything..." style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:26,padding:'12px 18px',color:'#fff',fontSize:15,outline:'none',fontFamily:'sans-serif'}}/>
        <button onClick={send} disabled={!input.trim()||loading} style={{width:46,height:46,borderRadius:'50%',background:input.trim()&&!loading?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.06)',border:'none',cursor:input.trim()&&!loading?'pointer':'not-allowed',color:input.trim()&&!loading?'#fff':'#333',fontSize:20,flexShrink:0}}>→</button>
      </div>
    </div>
  )
}
function SphereAppInner({ currentUser }) {
  const [tab, setTab] = useState('home')
  const [autoOpenGroup, setAutoOpenGroup] = useState(null)
  const [feedTab, setFeedTab] = useState('foryou')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [composeText, setComposeText] = useState('')
  const [composeImage, setComposeImage] = useState(null)
  const [composeImageUrl, setComposeImageUrl] = useState(null)
  const composeImgRef = useRef(null)
  const [conversations, setConversations] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [msgText, setMsgText] = useState('')
  const [dmView, setDmView] = useState('list')
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [followed, setFollowed] = useState({})
  const [friendsSubTab, setFriendsSubTab] = useState('friends')
  const [selectedDMMsg, setSelectedDMMsg] = useState(null)
  const [editingDMMsg, setEditingDMMsg] = useState(null)
  const [editDMText, setEditDMText] = useState('')
  const [dmReplyTo, setDmReplyTo] = useState(null)
  const dmLongPressTimer = useRef(null)
  const dmImgRef = useRef(null)
  const [sendingDMImg, setSendingDMImg] = useState(false)
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search)
    const gid = params.get('opengroup')
    if(gid){
      supabase.from('groups').select('*,group_members(user_id)').eq('id',gid).single().then(({data})=>{
        if(data){setTab('pulse');setAutoOpenGroup(data)}
      })
      window.history.replaceState({},'',window.location.pathname)
    }
  },[])
  const [people, setPeople] = useState([])
  const [notifs, setNotifs] = useState([])
  const [viewingUser, setViewingUser] = useState(null)
  const [showMyProfile, setShowMyProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url||'')
  const color = currentUser?.avatar_color||'#5B9CF6'
  const [navVisible, setNavVisible] = useState(true)
  const [hideNav, setHideNav] = useState(false)
  const [showOmniCore, setShowOmniCore] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState({})
  const stateRef = useRef({})
  useEffect(()=>{
    stateRef.current = {viewingUser,showMyProfile,showSettings,tab,dmView,hideNav}
  },[viewingUser,showMyProfile,showSettings,tab,dmView])

  // Global listener for push notifications regardless of tab
  useEffect(()=>{
    const ch = supabase.channel('global_notifs_'+currentUser.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+currentUser.id},async(payload)=>{
        const {data:actor} = await supabase.from('profiles').select('display_name').eq('id',payload.new.actor_id).single()
        const info = {like:'❤️ liked your post',comment:'💬 commented on your post',follow:'👤 started following you',repost:'🔁 reposted your sphere',follow_accepted:'✅ accepted your follow request'}
        showLocalNotif('🌐 Sphere', (actor?.display_name||'Someone')+' '+(info[payload.new.type]||'sent you a notification'))
      })
      .subscribe()

    // Separate channel for DMs - filter by user's conversations
    supabase.from('conversation_participants').select('conversation_id').eq('user_id',currentUser.id).then(({data:convs})=>{
      if(!convs?.length) return
      convs.forEach(({conversation_id})=>{
        supabase.channel('dm_notif_'+conversation_id)
          .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'conversation_id=eq.'+conversation_id},async(payload)=>{
            if(payload.new.sender_id === currentUser.id) return
            const {data:sender} = await supabase.from('profiles').select('display_name').eq('id',payload.new.sender_id).single()
            showLocalNotif('💬 '+(sender?.display_name||'Someone'), payload.new.content?.slice(0,80)||'Sent you a message')
          })
          .subscribe()
      })
    })

    return()=>{ supabase.removeChannel(ch) }
  },[])

  useEffect(()=>{
    const presenceChannel = supabase.channel('online_users')
      .on('presence',{event:'sync'},()=>{
        const state = presenceChannel.presenceState()
        const online = {}
        Object.values(state).flat().forEach(p=>{ online[p.user_id]=true })
        setOnlineUsers(online)
      })
      .subscribe(async(status)=>{
        if(status==='SUBSCRIBED'){
          await presenceChannel.track({user_id:currentUser.id,online_at:new Date().toISOString()})
        }
      })
    return()=>supabase.removeChannel(presenceChannel)
  },[])

  useEffect(()=>{
    const setupPush = async() => {
      try {
        if(!('Notification' in window)) { console.log('No Notification API'); return }
        // Request permission immediately for WebView apps
        if(Notification.permission === 'default') {
          await Notification.requestPermission()
        }
        if(!('serviceWorker' in navigator)) { console.log('No SW'); return }
        if(!('PushManager' in window)) { console.log('No PushManager'); return }
        const reg = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready
        let permission = Notification.permission
        if(permission === 'default') permission = await Notification.requestPermission()
        if(permission !== 'granted') { console.log('Permission:',permission); return }
        let sub = await reg.pushManager.getSubscription()
        if(!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: 'BPiikDJR1kYnVVizNObctiIofznuYwl0P6tGmViKwqy11Lzq5JJmMQ-tAwc12yx6tHWYrRrVOmNCUhguqjyP5Cs'
          })
        }
        const {error} = await supabase.from('push_subscriptions').upsert({
          user_id:currentUser.id,
          subscription:JSON.parse(JSON.stringify(sub))
        },{onConflict:'user_id'})
        if(error) console.log('Sub save error:',error.message)
        else console.log('Push ready!')
      } catch(e) { console.log('Push setup error:',e.message) }
    }
    setupPush()
  },[])

  useEffect(()=>{
    window.history.pushState(null,'',window.location.href)
    const handlePop = () => {
      window.history.pushState(null,'',window.location.href)
      const s = stateRef.current
      if(s.viewingUser){setViewingUser(null);return}
      if(s.showMyProfile){setShowMyProfile(false);return}
      if(s.showSettings){setShowSettings(false);return}
      if(s.dmView==='chat'){setDmView('list');setSelectedConv(null);return}
      if(s.tab!=='home'){setTab('home');return}
    }
    window.addEventListener('popstate',handlePop)
    return()=>window.removeEventListener('popstate',handlePop)
  },[])
  const lastScrollY = useRef(0)

  useEffect(()=>{
    const handleScroll = () => {
      const y = window.scrollY
      if(y < 50) setNavVisible(true)
      else if(y > lastScrollY.current + 8) setNavVisible(false)
      else if(y < lastScrollY.current - 8) setNavVisible(true)
      lastScrollY.current = y
    }
    window.addEventListener('scroll', handleScroll, {passive:true})
    return()=>window.removeEventListener('scroll', handleScroll)
  },[])
  const [chatOverlay, setChatOverlay] = useState(null)
  const [pendingDM, setPendingDM] = useState(null)
  const bottomRef = useRef(null)

  const loadPosts = useCallback(async (feedType='foryou') => {
    setLoading(true)
    let query = supabase.from('posts').select('*,author:profiles(*),likes(user_id),reposts(user_id),comments(id)').order('created_at',{ascending:false}).limit(40)
    if (feedType==='following') {
      const {data:follows} = await supabase.from('follows').select('following_id').eq('follower_id',currentUser.id)
      const ids = (follows||[]).map(f=>f.following_id)
      if (!ids.length) { setPosts([]); setLoading(false); return }
      query = query.in('user_id',ids)
    }
    const {data} = await query
    setPosts((data||[]).map(p=>({...p,user_liked:p.likes?.some(l=>l.user_id===currentUser.id),user_reposted:p.reposts?.some(r=>r.user_id===currentUser.id),likes_count:p.likes?.length||0,reposts_count:p.reposts?.length||0,comments_count:p.comments?.length||0})))
    setLoading(false)
  },[currentUser.id])

  useEffect(()=>{ loadPosts(feedTab) },[feedTab])

  useEffect(()=>{
    const ch = supabase.channel('new-posts').on('postgres_changes',{event:'INSERT',schema:'public',table:'posts'},async(payload)=>{
      if(payload.new.user_id===currentUser.id) return
      const {data} = await supabase.from('posts').select('*,author:profiles(*),likes(user_id),reposts(user_id),comments(id)').eq('id',payload.new.id).single()
      if(data) setPosts(prev=>[{...data,likes_count:0,reposts_count:0,comments_count:0,user_liked:false,user_reposted:false},...prev])
    }).subscribe()
    return()=>supabase.removeChannel(ch)
  },[])

  useEffect(()=>{
    if(tab==='friends') {
      supabase.from('profiles').select('*').neq('id',currentUser.id).limit(40).then(({data})=>setPeople(data||[]))
      // Load who current user already follows
      supabase.from('follows').select('following_id').eq('follower_id',currentUser.id).then(({data})=>{
        const map = {}
        ;(data||[]).forEach(f=>{ map[f.following_id]=true })
        setFollowed(map)
      })
    }
  },[tab])
  useEffect(()=>{ if(tab==='messages'&&dmView==='list') loadConvos() },[tab])

  const loadConvos = async() => {
    const {data:parts} = await supabase.from('conversation_participants').select('conversation_id').eq('user_id',currentUser.id)
    if(!parts?.length){setConversations([]);return}
    const ids = parts.map(p=>p.conversation_id)
    const results = await Promise.all(ids.map(async id=>{
      const {data:op} = await supabase.from('conversation_participants').select('user_id').eq('conversation_id',id).neq('user_id',currentUser.id).maybeSingle()
      if(!op) return null
      const {data:prof} = await supabase.from('profiles').select('id,display_name,username,avatar_color,avatar_url').eq('id',op.user_id).single()
      const {data:lastMsg} = await supabase.from('messages').select('content,created_at,sender_id').eq('conversation_id',id).order('created_at',{ascending:false}).limit(1).maybeSingle()
      return {id, other:prof, last:lastMsg}
    }))
    setConversations(results.filter(Boolean).sort((a,b)=>new Date(b.last?.created_at||0)-new Date(a.last?.created_at||0)))
  }

  useEffect(()=>{
    if(!selectedConv) return
    supabase.from('messages').select('*,sender:profiles(id,display_name,avatar_color,avatar_url)').eq('conversation_id',selectedConv.id).order('created_at',{ascending:true}).then(({data})=>setMessages(data||[]))
    const ch = supabase.channel(`m:${selectedConv.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`conversation_id=eq.${selectedConv.id}`},async(payload)=>{
      const {data} = await supabase.from('messages').select('*,sender:profiles(id,display_name,avatar_color,avatar_url)').eq('id',payload.new.id).single()
      if(data) {
        setMessages(prev=>[...prev.filter(m=>!m.id.toString().startsWith('tmp')),data])
        if(data.sender_id !== currentUser.id) showLocalNotif('💬 New Message', (data.sender?.display_name||'Someone')+': '+data.content?.slice(0,60))
      }
    }).subscribe()
    return()=>supabase.removeChannel(ch)
  },[selectedConv])

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])

  const [allPeople, setAllPeople] = useState([])

  useEffect(()=>{
    if(dmView==='new'){
      supabase.from('profiles').select('id,display_name,username,avatar_color,avatar_url').neq('id',currentUser.id).limit(50).then(({data})=>setAllPeople(data||[]))
    }
  },[dmView])

  useEffect(()=>{
    if(!searchQ.trim()){setSearchResults([]);return}
    const q = searchQ.toLowerCase()
    setSearchResults(allPeople.filter(u=>u.display_name?.toLowerCase().includes(q)||u.username?.toLowerCase().includes(q)))
  },[searchQ,allPeople])

  const sendPost = async() => {
    if(!composeText.trim()&&!composeImage) return
    let imageUrl = null
    if(composeImage) {
      const ext = composeImage.name.split('.').pop().toLowerCase()
      const path = 'posts/'+currentUser.id+'_'+Date.now()+'.'+ext
      const {data:upData, error} = await supabase.storage.from('avatars').upload(path, composeImage, {upsert:true, contentType:composeImage.type})
      if(error) { alert('Image upload failed: '+error.message); return }
      const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
      imageUrl = urlData.publicUrl
    }
    const {data} = await supabase.from('posts').insert({user_id:currentUser.id,content:composeText.trim(),image_url:imageUrl}).select('*,author:profiles(*),likes(user_id),reposts(user_id),comments(id)').single()
    if(data) setPosts(prev=>[{...data,likes_count:0,reposts_count:0,comments_count:0,user_liked:false,user_reposted:false},...prev])
    setComposeText(''); setComposeImage(null); setComposeImageUrl(null); setShowCompose(false)
  }

  const deletePost = async(postId) => {
    await supabase.from('posts').delete().eq('id',postId).eq('user_id',currentUser.id)
    setPosts(prev=>prev.filter(p=>p.id!==postId))
  }

  const openDMWithUser = async(user) => {
    setViewingUser(null)
    setShowMyProfile(false)
    const {data:myP} = await supabase.from('conversation_participants').select('conversation_id').eq('user_id',currentUser.id)
    let convId = null
    if(myP?.length){
      const {data:shared} = await supabase.from('conversation_participants').select('conversation_id').eq('user_id',user.id).in('conversation_id',myP.map(p=>p.conversation_id))
      if(shared?.length) convId = shared[0].conversation_id
    }
    if(!convId){
      const {data:conv} = await supabase.from('conversations').insert({}).select().single()
      await supabase.from('conversation_participants').insert([{conversation_id:conv.id,user_id:currentUser.id},{conversation_id:conv.id,user_id:user.id}])
      convId = conv.id
    }
    setSelectedConv({id:convId,other:user})
    setDmView('chat')
    setTab('messages')
  }

  const sendMsg = async() => {
    if(!msgText.trim()||!selectedConv?.id) return
    const content=msgText.trim(); const reply=dmReplyTo
    setMsgText(''); setDmReplyTo(null)
    const tmp={id:'tmp'+Date.now(),sender_id:currentUser.id,content,reply_to:reply,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content,reply_to:reply})
    loadConvos()
  }

  const toggleFollow = async(user) => {
    const isF = !!followed[user.id]
    // Update UI immediately
    setFollowed(p=>({...p,[user.id]:!isF}))
    if(isF) {
      const {error} = await supabase.from('follows').delete().eq('follower_id',currentUser.id).eq('following_id',user.id)
      if(error) setFollowed(p=>({...p,[user.id]:true})) // revert on error
    } else {
      const {error} = await supabase.from('follows').insert({follower_id:currentUser.id,following_id:user.id})
      if(error) setFollowed(p=>({...p,[user.id]:false})) // revert on error
    }
  }

  const handleUserClick = (user) => {
    if(!user?.id) return
    if(user.id===currentUser.id){setShowMyProfile(true);return}
    setViewingUser(user)
  }

  const handleDMLongPress = (msg) => { dmLongPressTimer.current = setTimeout(()=>setSelectedDMMsg(msg),500) }
  const handleDMPressEnd = () => clearTimeout(dmLongPressTimer.current)

  const deleteDMMsg = async(msg) => {
    setSelectedDMMsg(null)
    await supabase.from('messages').delete().eq('id',msg.id).eq('sender_id',currentUser.id)
    setMessages(prev=>prev.filter(m=>m.id!==msg.id))
  }

  const saveDMEdit = async() => {
    if(!editDMText.trim()) return
    await supabase.from('messages').update({content:editDMText.trim()}).eq('id',editingDMMsg).eq('sender_id',currentUser.id)
    setMessages(prev=>prev.map(m=>m.id===editingDMMsg?{...m,content:editDMText.trim()}:m))
    setEditingDMMsg(null); setEditDMText('')
  }

  const sendDMImage = async(file)=>{
    if(!file||!selectedConv?.id) return
    setSendingDMImg(true)
    const ext=file.name.split('.').pop()
    const path='chats/dm_'+selectedConv.id+'_'+Date.now()+'.'+ext
    const {error}=await supabase.storage.from('avatars').upload(path,file,{upsert:false})
    if(error){alert('Upload failed: '+error.message);setSendingDMImg(false);return}
    const {data:urlData}=supabase.storage.from('avatars').getPublicUrl(path)
    const url=urlData.publicUrl
    const tmp={id:'tmp_img'+Date.now(),sender_id:currentUser.id,content:'📷',image_url:url,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content:'📷',image_url:url})
    setSendingDMImg(false)
  }

  const showLocalNotif = (title, body) => {
    try {
      if(typeof Notification === 'undefined') return
      if(Notification.permission !== 'granted') return
      setTimeout(()=>{
        try { new Notification(title, {body, icon:'/icon-192.png', tag:Date.now().toString()}) }
        catch(e){ console.log('Notif error:',e.message) }
      }, 100)
    } catch(e){ console.log('showLocalNotif error:',e) }
  }

  const sendPush = async(userId, title, body) => {
    try {
      const {data} = await supabase.from('push_subscriptions').select('subscription').eq('user_id',userId).maybeSingle()
      if(data?.subscription) {
        fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:data.subscription,title,body,url:'/'})})
      }
    } catch(e) { console.log('Push send error',e) }
  }

  const TABS=[{id:'home',label:'Home',icon:'🏠'},{id:'messages',label:'Messages',icon:'💬'},{id:'pulse',label:'Pulse',icon:'⚡'},{id:'friends',label:'People',icon:'👥'},{id:'notifications',label:'Alerts',icon:'🔔'}]
  const TRENDING=[{tag:'#GlobalVoices',posts:'142K',cat:'Worldwide'},{tag:'#TechForGood',posts:'89K',cat:'Technology'},{tag:'#WorldCulture',posts:'211K',cat:'Culture'},{tag:'#SphereSpotlight',posts:'445K',cat:'Sphere'},{tag:'#FutureNow',posts:'78K',cat:'Trending'},{tag:'#ClimateAction',posts:'190K',cat:'Environment'},{tag:'#StartupLife',posts:'55K',cat:'Business'},{tag:'#MusicMonday',posts:'33K',cat:'Entertainment'}]

  if(showOmniCore) return <OmniCoreAI currentUser={currentUser} onClose={()=>setShowOmniCore(false)}/>
  if(showSettings) return <SettingsView currentUser={currentUser} supabase={supabase} onBack={()=>setShowSettings(false)} onSignOut={handleSignOut} onAvatarUpdate={url=>{setAvatarUrl(url);currentUser.avatar_url=url}}/>
  if(showMyProfile) return <MyProfileView currentUser={currentUser} supabase={supabase} avatarUrl={avatarUrl} onBack={()=>setShowMyProfile(false)} onSettings={()=>{setShowMyProfile(false);setShowSettings(true)}}/>
  if(viewingUser) return <UserProfileView user={viewingUser} currentUser={currentUser} supabase={supabase} onBack={()=>setViewingUser(null)} onMessage={openDMWithUser}/>

  return (
    <div style={{minHeight:'100vh',background:'#090B10',maxWidth:600,margin:'0 auto',color:'#fff',fontFamily:'sans-serif'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'10px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <button onClick={()=>setShowMyProfile(true)} style={{background:'none',border:'none',cursor:'pointer',padding:0}}>
          <Avatar url={avatarUrl} name={currentUser?.display_name} color={color} size={36}/>
        </button>
        <span onClick={()=>window.location.reload()} style={{fontWeight:800,fontSize:20,background:'linear-gradient(135deg,#5B9CF6,#845EF7)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',cursor:'pointer'}}>🌐 sphere</span>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          
          <button onClick={()=>setShowOmniCore(true)} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:16,padding:'5px 10px',cursor:'pointer',color:'#fff',fontSize:12,fontWeight:700}}>🤖 AI</button>
<button onClick={()=>setShowSettings(true)} style={{background:'none',border:'none',cursor:'pointer',color:'#666',fontSize:22}}>⚙️</button>
        </div>
      </div>

      {typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
        <div onClick={async()=>{
          if(Notification.permission === 'denied'){
            alert('Notifications are blocked. Please go to your browser settings and allow notifications for this site, then refresh.')
            return
          }
          const p = await Notification.requestPermission()
          if(p==='granted') window.location.reload()
        }} style={{margin:'8px 16px',background:'linear-gradient(135deg,rgba(91,156,246,0.15),rgba(132,94,247,0.15))',border:'1px solid rgba(91,156,246,0.3)',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
          <span style={{fontSize:20}}>🔔</span>
          <div style={{flex:1}}>
            <div style={{color:'#fff',fontWeight:700,fontSize:13}}>{typeof Notification !== 'undefined' && Notification.permission === 'denied' ? 'Notifications Blocked' : 'Enable Notifications'}</div>
            <div style={{color:'#888',fontSize:11}}>Tap to get notified about likes, messages and more</div>
          </div>
          <span style={{color:'#5B9CF6',fontSize:13,fontWeight:700}}>{typeof Notification !== 'undefined' && Notification.permission === 'denied' ? 'Fix →' : 'Allow'}</span>
        </div>
      )}
      <div style={{paddingBottom:110}}>
        {tab==='home'&&<>
          <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.07)',position:'sticky',top:58,zIndex:5,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(12px)'}}>
            {[{id:'foryou',label:'For You'},{id:'following',label:'Following'},{id:'global',label:'Global'}].map(t=>(
              <button key={t.id} onClick={()=>setFeedTab(t.id)} style={{flex:1,padding:'14px 0',background:'none',border:'none',borderBottom:feedTab===t.id?'2px solid #5B9CF6':'2px solid transparent',color:feedTab===t.id?'#fff':'#555',fontWeight:feedTab===t.id?700:500,fontSize:14,cursor:'pointer'}}>{t.label}</button>
            ))}
          </div>
          {loading&&<div style={{padding:'50px',textAlign:'center',color:'#444'}}>Loading...</div>}
          {!loading&&posts.length===0&&<div style={{padding:'60px 20px',textAlign:'center'}}><p style={{fontSize:48}}>🌐</p><p style={{color:'#666',fontSize:16,marginTop:8}}>{feedTab==='following'?'Follow people to see their posts':'No posts yet. Tap + to post!'}</p></div>}
          {posts.map(post=><PostCard key={post.id} post={post} currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick} onDelete={deletePost}/>)}
        </>}

        {tab==='messages'&&<>
          {dmView==='list'&&<>
            <div style={{padding:'16px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontWeight:800,fontSize:20}}>Messages</span>
              <button onClick={()=>{setSearchQ('');setDmView('new')}} style={{background:'rgba(91,156,246,0.1)',border:'1px solid rgba(91,156,246,0.2)',borderRadius:12,padding:'8px 16px',color:'#5B9CF6',cursor:'pointer',fontWeight:700,fontSize:13}}>+ New</button>
            </div>
            {conversations.length===0&&<div style={{padding:'60px 20px',textAlign:'center'}}><p style={{fontSize:48}}>💬</p><p style={{color:'#555',marginTop:8,fontSize:15}}>No messages yet</p><p style={{color:'#444',fontSize:13,marginTop:4}}>Tap New to start a conversation</p></div>}
            {conversations.map(conv=>(
              <div key={conv.id}
                onClick={()=>{ setSelectedConv(conv); setDmView('chat') }}
                style={{display:'flex',alignItems:'center',gap:12,padding:'16px',borderBottom:'1px solid rgba(255,255,255,0.04)',color:'#fff',cursor:'pointer',WebkitTapHighlightColor:'rgba(91,156,246,0.1)',userSelect:'none',active:{background:'rgba(255,255,255,0.04)'}}}>
                <Avatar url={conv.other?.avatar_url} name={conv.other?.display_name} color={conv.other?.avatar_color||'#5B9CF6'} size={50} online={!!onlineUsers[conv.other?.id]}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontWeight:700,fontSize:15}}>{conv.other?.display_name}</span>
                    {conv.last&&<span style={{color:'#444',fontSize:12}}>{timeAgo(conv.last.created_at)}</span>}
                  </div>
                  <p style={{color:'#555',fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',margin:0}}>
                    {conv.last ? (conv.last.sender_id===currentUser.id?'You: ':'')+conv.last.content : 'Tap to chat'}
                  </p>
                </div>
                <span style={{color:'#444',fontSize:20}}>›</span>
              </div>
            ))}
          </>}

          {dmView==='new'&&<>
            <div style={{padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',gap:12}}>
              <button onClick={()=>setDmView('list')} style={{background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:24}}>‹</button>
              <span style={{fontWeight:700,fontSize:17}}>New Message</span>
            </div>
            <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
              <input autoFocus value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search name or username..." style={{...inp}}/>
            </div>
            {!searchQ&&allPeople.map(u=>(
              <div key={u.id} onClick={()=>openDMWithUser(u)} style={{display:'flex',alignItems:'center',gap:12,padding:'16px',borderBottom:'1px solid rgba(255,255,255,0.04)',color:'#fff',cursor:'pointer'}}>
                <Avatar url={u.avatar_url} name={u.display_name} color={u.avatar_color||getColor(u.id)} size={46}/>
                <div style={{flex:1}}><div style={{fontWeight:700,fontSize:15}}>{u.display_name}</div><div style={{color:'#555',fontSize:13}}>@{u.username}</div></div>
                <span style={{color:'#5B9CF6',fontSize:22}}>›</span>
              </div>
            ))}
            {searchQ&&!searchResults.length&&<p style={{padding:'30px',textAlign:'center',color:'#444',fontSize:14}}>No users found</p>}
            {searchQ&&searchResults.map(u=>(
              <div key={u.id}
                onClick={()=>openDMWithUser(u)}
                onTouchEnd={(e)=>{ e.preventDefault(); openDMWithUser(u) }}
                style={{display:'flex',alignItems:'center',gap:12,padding:'16px',borderBottom:'1px solid rgba(255,255,255,0.04)',color:'#fff',cursor:'pointer',WebkitTapHighlightColor:'transparent',userSelect:'none'}}>
                <Avatar url={u.avatar_url} name={u.display_name} color={u.avatar_color||getColor(u.id)} size={46}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:16}}>{u.display_name}</div>
                  <div style={{color:'#555',fontSize:13}}>@{u.username}</div>
                </div>
                <span style={{color:'#5B9CF6',fontSize:22}}>›</span>
              </div>
            ))}
          </>}

          {dmView==='chat'&&selectedConv&&<>
            <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',gap:12,position:'sticky',top:58,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(12px)',zIndex:5}}>
              <button onClick={()=>{setDmView('list');setSelectedConv(null);setMessages([]);loadConvos()}} style={{background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:24}}>‹</button>
              <Avatar url={selectedConv.other?.avatar_url} name={selectedConv.other?.display_name} color={selectedConv.other?.avatar_color||'#5B9CF6'} size={38} online/>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>{selectedConv.other?.display_name}</div>
                <div style={{color:onlineUsers[selectedConv?.other?.id]?'#00C9A7':'#555',fontSize:11}}>{onlineUsers[selectedConv?.other?.id]?'● Active now':'● Offline'}</div>
              </div>
            </div>
            <div style={{minHeight:'60vh',padding:'16px 14px',display:'flex',flexDirection:'column',gap:8,paddingBottom:20}}>
              {messages.length===0&&<div style={{textAlign:'center',marginTop:60,display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
                <Avatar url={selectedConv.other?.avatar_url} name={selectedConv.other?.display_name} color={selectedConv.other?.avatar_color||'#5B9CF6'} size={72}/>
                <p style={{color:'#444',fontSize:14}}>Say hello! 👋</p>
              </div>}
              {selectedDMMsg&&<div onClick={()=>setSelectedDMMsg(null)} style={{position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-end'}}>
                <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'#1a1d26',borderRadius:'20px 20px 0 0',padding:'16px 0 32px'}}>
                  <div style={{width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.15)',margin:'0 auto 16px'}}/>
                  <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:16,padding:'0 8px'}}>
                    {['👍','❤️','😂','😮','😢','🔥','👏','💯'].map(e=>(
                      <button key={e} onClick={async()=>{await supabase.from('messages').update({content:selectedDMMsg.content+' '+e}).eq('id',selectedDMMsg.id);setMessages(prev=>prev.map(m=>m.id===selectedDMMsg.id?{...m,content:m.content+' '+e}:m));setSelectedDMMsg(null)}} style={{background:'rgba(255,255,255,0.08)',border:'none',borderRadius:12,padding:'8px',fontSize:22,cursor:'pointer'}}>{e}</button>
                    ))}
                  </div>
                  <button onClick={()=>{setDmReplyTo(selectedDMMsg.sender?.display_name+': '+selectedDMMsg.content?.slice(0,50));setSelectedDMMsg(null)}} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'#fff',fontSize:15,cursor:'pointer',textAlign:'left'}}>↩ Reply</button>
                  {selectedDMMsg.sender_id===currentUser.id&&<>
                    <button onClick={()=>{setEditingDMMsg(selectedDMMsg.id);setEditDMText(selectedDMMsg.content);setSelectedDMMsg(null)}} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'#5B9CF6',fontSize:15,cursor:'pointer',textAlign:'left'}}>✏️ Edit</button>
                    <button onClick={()=>deleteDMMsg(selectedDMMsg)} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'#FF4757',fontSize:15,cursor:'pointer',textAlign:'left'}}>🗑️ Delete</button>
                  </>}
                </div>
              </div>}
              {messages.map(msg=>{
                const own = msg.sender_id===currentUser.id
                return(<div key={msg.id}
                  onTouchStart={()=>handleDMLongPress(msg)} onTouchEnd={handleDMPressEnd}
                  onMouseDown={()=>handleDMLongPress(msg)} onMouseUp={handleDMPressEnd}
                  style={{display:'flex',justifyContent:own?'flex-end':'flex-start',gap:8,alignItems:'flex-end'}}>
                  {!own&&<Avatar url={msg.sender?.avatar_url} name={msg.sender?.display_name} color={msg.sender?.avatar_color||'#5B9CF6'} size={28}/>}
                  <div style={{maxWidth:'75%'}}>
                    {msg.reply_to&&<div style={{background:'rgba(255,255,255,0.05)',borderLeft:'3px solid #5B9CF6',borderRadius:8,padding:'6px 10px',marginBottom:4,fontSize:12,color:'#888'}}>↩ {msg.reply_to}</div>}
                    {editingDMMsg===msg.id?(
                      <div style={{display:'flex',gap:6}}>
                        <input value={editDMText} onChange={e=>setEditDMText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveDMEdit()} style={{flex:1,background:'rgba(255,255,255,0.1)',border:'1px solid #5B9CF6',borderRadius:16,padding:'8px 12px',color:'#fff',fontSize:14,outline:'none'}}/>
                        <button onClick={saveDMEdit} style={{background:'#5B9CF6',border:'none',borderRadius:16,padding:'8px 12px',color:'#fff',cursor:'pointer'}}>✓</button>
                        <button onClick={()=>setEditingDMMsg(null)} style={{background:'rgba(255,255,255,0.1)',border:'none',borderRadius:16,padding:'8px 12px',color:'#fff',cursor:'pointer'}}>✕</button>
                      </div>
                    ):(
                      <div style={{padding:msg.image_url?'6px':'11px 15px',borderRadius:own?'20px 20px 5px 20px':'20px 20px 20px 5px',background:own?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.09)',color:'#fff',fontSize:15,lineHeight:1.5,wordBreak:'break-word',overflow:'hidden'}}>
                        {msg.image_url?<img src={msg.image_url} style={{maxWidth:220,maxHeight:220,borderRadius:14,display:'block'}} alt="img"/>:msg.content}
                        <div style={{fontSize:10,color:own?'rgba(255,255,255,0.45)':'#444',marginTop:4,textAlign:'right',padding:msg.image_url?'0 8px 6px':'0'}}>{timeAgo(msg.created_at)}</div>
                      </div>
                    )}
                  </div>
                </div>)
              })}
              <div ref={bottomRef}/>
            </div>
            <div style={{position:'sticky',bottom:0,background:'#090B10',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              {dmReplyTo&&<div style={{padding:'8px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <span style={{color:'#888',fontSize:12}}>↩ <span style={{color:'#5B9CF6'}}>{dmReplyTo}</span></span>
                <button onClick={()=>setDmReplyTo(null)} style={{background:'none',border:'none',color:'#555',cursor:'pointer',fontSize:18}}>✕</button>
              </div>}
              <div style={{padding:'10px 14px 24px',display:'flex',gap:10,alignItems:'center'}}>
              <input ref={dmImgRef} type="file" accept="image/*" onChange={e=>sendDMImage(e.target.files[0])} style={{display:'none'}}/>
              <button onClick={()=>dmImgRef.current?.click()} disabled={sendingDMImg} style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'none',cursor:'pointer',color:'#888',fontSize:18,flexShrink:0}}>{sendingDMImg?'⏳':'🖼️'}</button>
              <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder={dmReplyTo?'Reply...':'Message...'} style={{...inp,flex:1,borderRadius:26,marginBottom:0,padding:'12px 18px'}}/>
              <button onClick={sendMsg} disabled={!msgText.trim()} style={{width:46,height:46,borderRadius:'50%',background:msgText.trim()?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.06)',border:'none',cursor:msgText.trim()?'pointer':'not-allowed',color:msgText.trim()?'#fff':'#333',fontSize:20,flexShrink:0}}>→</button>
              </div>
            </div>
          </>}
        </>}

        {tab==='friends'&&<>
          <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.07)',position:'sticky',top:58,zIndex:5,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(12px)'}}>
            <button onClick={()=>setFriendsSubTab('friends')} style={{flex:1,padding:'14px 0',background:'none',border:'none',borderBottom:friendsSubTab==='friends'?'2px solid #5B9CF6':'2px solid transparent',color:friendsSubTab==='friends'?'#fff':'#555',fontWeight:friendsSubTab==='friends'?700:500,fontSize:14,cursor:'pointer'}}>👥 Friends</button>
            <button onClick={()=>setFriendsSubTab('explore')} style={{flex:1,padding:'14px 0',background:'none',border:'none',borderBottom:friendsSubTab==='explore'?'2px solid #5B9CF6':'2px solid transparent',color:friendsSubTab==='explore'?'#fff':'#555',fontWeight:friendsSubTab==='explore'?700:500,fontSize:14,cursor:'pointer'}}>🔭 Explore</button>
          </div>
          {friendsSubTab==='friends'&&<>
            {people.filter(u=>followed[u.id]).length===0&&<div style={{padding:'50px 20px',textAlign:'center'}}><p style={{fontSize:40}}>👥</p><p style={{color:'#555',marginTop:8}}>You are not following anyone yet</p><p style={{color:'#444',fontSize:13,marginTop:4}}>Go to Explore to find people</p></div>}
            {people.filter(u=>followed[u.id]).map((u,i)=>(
              <div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                <button onClick={()=>handleUserClick(u)} style={{background:'none',border:'none',padding:0,cursor:'pointer'}}>
                  <Avatar url={u.avatar_url} name={u.display_name} color={u.avatar_color||COLORS[i%COLORS.length]} size={48}/>
                </button>
                <button onClick={()=>handleUserClick(u)} style={{flex:1,minWidth:0,background:'none',border:'none',cursor:'pointer',textAlign:'left',padding:0,color:'#fff'}}>
                  <div style={{fontWeight:700,fontSize:15}}>{u.display_name}</div>
                  <div style={{color:'#555',fontSize:13}}>@{u.username}</div>
                  {u.bio&&<div style={{color:'#666',fontSize:12,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.bio}</div>}
                </button>
                <button onClick={()=>toggleFollow(u)} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:20,padding:'8px 16px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0}}>Following</button>
              </div>
            ))}
          </>}
          {friendsSubTab==='explore'&&<>
            <p style={{color:'#555',fontSize:13,padding:'12px 16px 4px'}}>People you might know</p>
            {people.filter(u=>!followed[u.id]).map((u,i)=>(
              <div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                <button onClick={()=>handleUserClick(u)} style={{background:'none',border:'none',padding:0,cursor:'pointer'}}>
                  <Avatar url={u.avatar_url} name={u.display_name} color={u.avatar_color||COLORS[i%COLORS.length]} size={48}/>
                </button>
                <button onClick={()=>handleUserClick(u)} style={{flex:1,minWidth:0,background:'none',border:'none',cursor:'pointer',textAlign:'left',padding:0,color:'#fff'}}>
                  <div style={{fontWeight:700,fontSize:15}}>{u.display_name}</div>
                  <div style={{color:'#555',fontSize:13}}>@{u.username}</div>
                  {u.bio&&<div style={{color:'#666',fontSize:12,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.bio}</div>}
                </button>
                <button onClick={()=>toggleFollow(u)} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:20,padding:'8px 16px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0}}>Follow</button>
              </div>
            ))}
            {!people.filter(u=>!followed[u.id]).length&&<p style={{padding:'40px',textAlign:'center',color:'#444'}}>You follow everyone on Sphere!</p>}
          </>}
        </>}

        {tab==='pulse'&&<PulseTab currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick} autoOpenGroup={autoOpenGroup} onAutoOpenDone={()=>setAutoOpenGroup(null)} onHideNav={setHideNav}/>}
        {tab==='search'&&<div style={{padding:'60px 20px',textAlign:'center'}}><p style={{fontSize:48}}>🔍</p><p style={{color:'#666',fontSize:16,marginTop:8}}>Search coming soon</p></div>}

        {tab==='notifications'&&<NotificationsPanel currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick}/>}
      </div>

      {tab==='home'&&<button onClick={()=>setShowCompose(true)} style={{position:'fixed',bottom:96,right:18,width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:28,boxShadow:'0 4px 24px rgba(91,156,246,0.55)',zIndex:50}}>+</button>}

      <div style={{position:'fixed',bottom:14,left:'50%',transform:(navVisible&&!(tab==='messages'&&dmView==='chat')&&!hideNav)?'translateX(-50%)':'translateX(-50%) translateY(100px)',zIndex:100,width:'calc(100% - 28px)',maxWidth:500,transition:'transform 0.3s ease',opacity:navVisible?1:0}}>
        <div style={{background:'rgba(13,15,22,0.97)',backdropFilter:'blur(28px)',borderRadius:30,padding:'8px 4px',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'space-around',boxShadow:'0 8px 40px rgba(0,0,0,0.7)'}}>
          {TABS.map(({id,label,icon})=>(<button key={id} onClick={()=>{setTab(id);if(id==='messages')setDmView('list')}} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,background:tab===id?'rgba(91,156,246,0.14)':'none',border:'none',cursor:'pointer',color:tab===id?'#5B9CF6':'#4a4a5a',padding:'8px 10px',borderRadius:20,minWidth:48}}><span style={{fontSize:20}}>{icon}</span><span style={{fontSize:9.5,fontWeight:tab===id?700:500}}>{label}</span></button>))}
        </div>
      </div>

      {showCompose&&<div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(10px)',display:'flex',alignItems:'flex-end'}} onClick={()=>setShowCompose(false)}>
        <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'#0f1117',borderRadius:'24px 24px 0 0',padding:'16px 20px 40px',border:'1px solid rgba(255,255,255,0.09)'}}>
          <div style={{width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.15)',margin:'0 auto 20px'}}/>
          <div style={{display:'flex',gap:12}}>
            <Avatar url={avatarUrl} name={currentUser?.display_name} color={color} size={42}/>
            <div style={{flex:1}}>
              <textarea value={composeText} onChange={e=>setComposeText(e.target.value)} placeholder="What's happening around the world?" autoFocus rows={3} style={{width:'100%',background:'transparent',border:'none',color:'#fff',fontSize:17,resize:'none',outline:'none',lineHeight:1.6,fontFamily:'sans-serif'}}/>
              {composeImageUrl&&<div style={{position:'relative',marginBottom:8}}>
                <img src={composeImageUrl} style={{width:'100%',maxHeight:200,objectFit:'cover',borderRadius:12}} alt="preview"/>
                <button onClick={()=>{setComposeImage(null);setComposeImageUrl(null)}} style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,0.7)',border:'none',borderRadius:'50%',width:28,height:28,color:'#fff',cursor:'pointer',fontSize:14}}>✕</button>
              </div>}
              <input ref={composeImgRef} type="file" accept="image/*" onChange={e=>{const f=e.target.files[0];if(f){setComposeImage(f);if(typeof window!=='undefined')setComposeImageUrl(URL.createObjectURL(f))}}} style={{display:'none'}}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.07)'}}>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <button onClick={()=>composeImgRef.current?.click()} style={{background:'none',border:'none',color:'#5B9CF6',cursor:'pointer',fontSize:22}}>🖼️</button>
                  <span style={{color:composeText.length>250?'#FF4757':'#444',fontSize:13}}>{280-composeText.length}</span>
                </div>
                <button onClick={sendPost} disabled={!composeText.trim()&&!composeImage} style={{background:(composeText.trim()||composeImage)?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.07)',border:'none',borderRadius:24,padding:'10px 26px',color:(composeText.trim()||composeImage)?'#fff':'#444',fontWeight:700,fontSize:14,cursor:(composeText.trim()||composeImage)?'pointer':'not-allowed'}}>Sphere it</button>
              </div>
            </div>
          </div>
        </div>
      </div>}
    </div>
  )
}

export default function SphereApp({ currentUser }) {
  return <ErrorBoundary><SphereAppInner currentUser={currentUser}/></ErrorBoundary>
}