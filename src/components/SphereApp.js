'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

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
      <div style={{padding:'0 16px',marginTop:-36,marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
        <Avatar url={user?.avatar_url} name={user?.display_name} color={color} size={72}/>
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
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><h2 style={{fontWeight:800,fontSize:20,margin:0}}>{user?.display_name}</h2>{user?.verified&&<span style={{background:"linear-gradient(135deg,#FFD700,#FFA500)",borderRadius:"50%",width:22,height:22,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#000",fontWeight:900,flexShrink:0}}>✓</span>}</div>
        {user?.verified&&<span style={{background:'linear-gradient(135deg,#FFD700,#FFA500)',borderRadius:'50%',width:22,height:22,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#000',fontWeight:900}}>✓</span>}
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
    const {error} = const emojiRegex = /[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;if(emojiRegex.test(displayName)){showMsg('Emojis are not allowed in display names',false);setSaving(false);return}await supabase.from('profiles').update({display_name:displayName,bio,location}).eq('id',currentUser.id)
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
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><h2 style={{fontWeight:800,fontSize:22,margin:0}}>{currentUser?.display_name}</h2>{currentUser?.verified&&<span style={{background:"linear-gradient(135deg,#FFD700,#FFA500)",borderRadius:"50%",width:22,height:22,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#000",fontWeight:900,flexShrink:0}}>✓</span>}</div>
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
    } else {
      await supabase.from('reposts').delete().eq('post_id',post.id).eq('user_id',currentUser.id)
    }
  }

  const submitReply = async () => {
    if (!replyText.trim()) return
    const {error} = await supabase.from('comments').insert({post_id:post.id,user_id:currentUser.id,content:replyText.trim()})
    if (!error) { setComments(c=>c+1); setReplyText(''); setShowReply(false) }
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
                      <span style={{fontWeight:700,fontSize:13,color:'#fff'}}>{cm.author?.display_name}</span>
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

function ChatWindow({ conv, currentUser, supabase, onBack }) {
  const [messages, setMessages] = useState([])
  const [msgText, setMsgText] = useState('')
  const bottomRef = useRef(null)

  useEffect(()=>{
    if(!conv) return
    supabase.from('messages').select('*,sender:profiles(id,display_name,avatar_color,avatar_url)').eq('conversation_id',conv.id).order('created_at',{ascending:true}).then(({data})=>setMessages(data||[]))
    const ch = supabase.channel('chat:'+conv.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'conversation_id=eq.'+conv.id},async(payload)=>{
      const {data} = await supabase.from('messages').select('*,sender:profiles(id,display_name,avatar_color,avatar_url)').eq('id',payload.new.id).single()
      if(data) setMessages(prev=>[...prev,data])
    }).subscribe()
    return()=>supabase.removeChannel(ch)
  },[conv])

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])

  const sendMsg = async()=>{
    if(!msgText.trim()) return
    const content=msgText.trim(); setMsgText('')
    await supabase.from('messages').insert({conversation_id:conv.id,sender_id:currentUser.id,content})
  }

  const timeAgo2 = (ts) => {
    if(!ts) return ''
    const d = Math.floor((Date.now()-new Date(ts))/1000)
    if(d<60) return 'now'
    if(d<3600) return Math.floor(d/60)+'m'
    return Math.floor(d/3600)+'h'
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:500,background:'#090B10',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',gap:12,flexShrink:0,background:'rgba(9,11,16,0.95)'}}>
        <div onClick={onBack} style={{color:'#888',cursor:'pointer',fontSize:24,padding:'0 4px'}}>‹</div>
        <Avatar url={conv.other?.avatar_url} name={conv.other?.display_name} color={conv.other?.avatar_color||'#5B9CF6'} size={38} online/>
        <div>
          <div style={{fontWeight:700,fontSize:15,color:'#fff'}}>{conv.other?.display_name}</div>
          <div style={{color:'#00C9A7',fontSize:11}}>● Active now</div>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'16px 14px',display:'flex',flexDirection:'column',gap:8}}>
        {messages.length===0&&<div style={{textAlign:'center',marginTop:60,display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
          <Avatar url={conv.other?.avatar_url} name={conv.other?.display_name} color={conv.other?.avatar_color||'#5B9CF6'} size={72}/>
          <p style={{color:'#444',fontSize:14}}>Say hello! 👋</p>
        </div>}
        {messages.map(msg=>{
          const own=msg.sender_id===currentUser.id
          return(<div key={msg.id} style={{display:'flex',justifyContent:own?'flex-end':'flex-start',gap:8,alignItems:'flex-end'}}>
            {!own&&<Avatar url={msg.sender?.avatar_url} name={msg.sender?.display_name} color={msg.sender?.avatar_color||'#5B9CF6'} size={28}/>}
            <div style={{maxWidth:'75%',padding:'11px 15px',borderRadius:own?'20px 20px 5px 20px':'20px 20px 20px 5px',background:own?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.09)',color:'#fff',fontSize:15,lineHeight:1.5,wordBreak:'break-word'}}>
              {msg.content}
              <div style={{fontSize:10,color:own?'rgba(255,255,255,0.45)':'#444',marginTop:4,textAlign:'right'}}>{timeAgo2(msg.created_at)}</div>
            </div>
          </div>)
        })}
        <div ref={bottomRef}/>
      </div>
      <div style={{padding:'10px 14px 30px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,alignItems:'center',background:'#090B10',flexShrink:0}}>
        <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder='Message...' style={{flex:1,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:26,padding:'12px 18px',color:'#fff',fontSize:15,outline:'none'}}/>
        <div onClick={sendMsg} style={{width:46,height:46,borderRadius:'50%',background:msgText.trim()?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',color:msgText.trim()?'#fff':'#333',fontSize:20,flexShrink:0,cursor:'pointer'}}>→</div>
      </div>
    </div>
  )
}

export default function SphereApp({ currentUser }) {
  const [tab, setTab] = useState('home')
  const [feedTab, setFeedTab] = useState('foryou')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [composeText, setComposeText] = useState('')
  const [conversations, setConversations] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [msgText, setMsgText] = useState('')
  const [dmView, setDmView] = useState('list')
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [followed, setFollowed] = useState({})
  const [people, setPeople] = useState([])
  const [viewingUser, setViewingUser] = useState(null)
  const [showMyProfile, setShowMyProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url||'')
  const [navVisible, setNavVisible] = useState(true)
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
  const supabase = createClient()

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
      if(data) setMessages(prev=>[...prev,data])
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
    if(!composeText.trim()) return
    const {data} = await supabase.from('posts').insert({user_id:currentUser.id,content:composeText.trim()}).select('*,author:profiles(*),likes(user_id),reposts(user_id),comments(id)').single()
    if(data) setPosts(prev=>[{...data,likes_count:0,reposts_count:0,comments_count:0,user_liked:false,user_reposted:false},...prev])
    setComposeText(''); setShowCompose(false)
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
    if(!msgText.trim()||!selectedConv) return
    const content = msgText.trim(); setMsgText('')
    await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content})
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

  const handleSignOut = async() => { await supabase.auth.signOut(); window.location.href='/auth' }

  const inp = {width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',fontFamily:'sans-serif',boxSizing:'border-box'}
  const color = currentUser?.avatar_color||'#5B9CF6'
  const TABS=[{id:'home',label:'Home',icon:'🏠'},{id:'messages',label:'Messages',icon:'💬'},{id:'friends',label:'Friends',icon:'👥'},{id:'trending',label:'Trending',icon:'📈'},{id:'notifications',label:'Alerts',icon:'🔔'}]
  const TRENDING=[{tag:'#GlobalVoices',posts:'142K',cat:'Worldwide'},{tag:'#TechForGood',posts:'89K',cat:'Technology'},{tag:'#WorldCulture',posts:'211K',cat:'Culture'},{tag:'#SphereSpotlight',posts:'445K',cat:'Sphere'},{tag:'#FutureNow',posts:'78K',cat:'Trending'},{tag:'#ClimateAction',posts:'190K',cat:'Environment'},{tag:'#StartupLife',posts:'55K',cat:'Business'},{tag:'#MusicMonday',posts:'33K',cat:'Entertainment'}]
  const NOTIFS=[{emoji:'❤️',user:'Amara Osei',text:'liked your post',time:'2m'},{emoji:'👤',user:'Yuki Tanaka',text:'started following you',time:'15m'},{emoji:'💬',user:'Carlos Vega',text:'replied to your post',time:'1h'},{emoji:'🔁',user:'Priya Nair',text:'reposted your sphere',time:'2h'},{emoji:'❤️',user:'Lena',text:'liked your reply',time:'3h'},{emoji:'👤',user:'James Okafor',text:'started following you',time:'5h'}]

  if(showSettings) return <SettingsView currentUser={currentUser} supabase={supabase} onBack={()=>setShowSettings(false)} onSignOut={handleSignOut} onAvatarUpdate={url=>{setAvatarUrl(url);currentUser.avatar_url=url}}/>
  if(showMyProfile) return <MyProfileView currentUser={currentUser} supabase={supabase} avatarUrl={avatarUrl} onBack={()=>setShowMyProfile(false)} onSettings={()=>{setShowMyProfile(false);setShowSettings(true)}}/>
  if(viewingUser) return <UserProfileView user={viewingUser} currentUser={currentUser} supabase={supabase} onBack={()=>setViewingUser(null)} onMessage={openDMWithUser}/>

  return (
    <div style={{minHeight:'100vh',background:'#090B10',maxWidth:600,margin:'0 auto',color:'#fff',fontFamily:'sans-serif'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'10px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <button onClick={()=>setShowMyProfile(true)} style={{background:'none',border:'none',cursor:'pointer',padding:0}}>
          <Avatar url={avatarUrl} name={currentUser?.display_name} color={color} size={36}/>
        </button>
        <span style={{fontWeight:800,fontSize:20,background:'linear-gradient(135deg,#5B9CF6,#845EF7)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>🌐 sphere</span>
        <button onClick={()=>setShowSettings(true)} style={{background:'none',border:'none',cursor:'pointer',color:'#666',fontSize:22}}>⚙️</button>
      </div>

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
                <Avatar url={conv.other?.avatar_url} name={conv.other?.display_name} color={conv.other?.avatar_color||'#5B9CF6'} size={50} online/>
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
                <div style={{color:'#00C9A7',fontSize:11}}>● Active now</div>
              </div>
            </div>
            <div style={{minHeight:'60vh',padding:'16px 14px',display:'flex',flexDirection:'column',gap:8,paddingBottom:90}}>
              {messages.length===0&&<div style={{textAlign:'center',marginTop:60,display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
                <Avatar url={selectedConv.other?.avatar_url} name={selectedConv.other?.display_name} color={selectedConv.other?.avatar_color||'#5B9CF6'} size={72}/>
                <p style={{color:'#444',fontSize:14}}>Say hello! 👋</p>
              </div>}
              {messages.map(msg=>{
                const own = msg.sender_id===currentUser.id
                return(<div key={msg.id} style={{display:'flex',justifyContent:own?'flex-end':'flex-start',gap:8,alignItems:'flex-end'}}>
                  {!own&&<Avatar url={msg.sender?.avatar_url} name={msg.sender?.display_name} color={msg.sender?.avatar_color||'#5B9CF6'} size={28}/>}
                  <div style={{maxWidth:'75%',padding:'11px 15px',borderRadius:own?'20px 20px 5px 20px':'20px 20px 20px 5px',background:own?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.09)',color:'#fff',fontSize:15,lineHeight:1.5,wordBreak:'break-word'}}>
                    {msg.content}
                    <div style={{fontSize:10,color:own?'rgba(255,255,255,0.45)':'#444',marginTop:4,textAlign:'right'}}>{timeAgo(msg.created_at)}</div>
                  </div>
                </div>)
              })}
              <div ref={bottomRef}/>
            </div>
            <div style={{position:'sticky',bottom:80,background:'#090B10',padding:'10px 14px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,alignItems:'center'}}>
              <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Message..." style={{...inp,flex:1,borderRadius:26,marginBottom:0,padding:'12px 18px'}}/>
              <button onClick={sendMsg} disabled={!msgText.trim()} style={{width:46,height:46,borderRadius:'50%',background:msgText.trim()?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.06)',border:'none',cursor:msgText.trim()?'pointer':'not-allowed',color:msgText.trim()?'#fff':'#333',fontSize:20,flexShrink:0}}>→</button>
            </div>
          </>}
        </>}

        {tab==='friends'&&<>
          <div style={{padding:'16px 16px 8px',fontWeight:800,fontSize:20}}>People 👥</div>
          <p style={{color:'#555',fontSize:14,padding:'0 16px 12px'}}>Discover people on Sphere</p>
          {people.map((u,i)=>(
            <div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
              <button onClick={()=>handleUserClick(u)} style={{background:'none',border:'none',padding:0,cursor:'pointer'}}>
                <Avatar url={u.avatar_url} name={u.display_name} color={u.avatar_color||COLORS[i%COLORS.length]} size={48}/>
              </button>
              <button onClick={()=>handleUserClick(u)} style={{flex:1,minWidth:0,background:'none',border:'none',cursor:'pointer',textAlign:'left',padding:0,color:'#fff'}}>
                <div style={{fontWeight:700,fontSize:15}}>{u.display_name}</div>
                <div style={{color:'#555',fontSize:13}}>@{u.username}</div>
                {u.bio&&<div style={{color:'#666',fontSize:12,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.bio}</div>}
              </button>
              <button onClick={()=>toggleFollow(u)} style={{background:followed[u.id]?'rgba(255,255,255,0.07)':'linear-gradient(135deg,#5B9CF6,#845EF7)',border:followed[u.id]?'1px solid rgba(255,255,255,0.12)':'none',borderRadius:20,padding:'8px 16px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0}}>
                {followed[u.id]?'Following':'Follow'}
              </button>
            </div>
          ))}
          {!people.length&&<p style={{padding:'40px',textAlign:'center',color:'#444'}}>No other users yet</p>}
        </>}

        {tab==='trending'&&<>
          <div style={{padding:'16px 16px 12px',fontWeight:800,fontSize:20}}>Trending 🌐</div>
          {TRENDING.map((item,i)=>(<div key={i} style={{padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)',cursor:'pointer'}}><div style={{color:'#555',fontSize:12,marginBottom:2}}>{item.cat} · Trending</div><div style={{fontWeight:700,fontSize:17,marginBottom:2}}>{item.tag}</div><div style={{color:'#555',fontSize:13}}>{item.posts} posts</div></div>))}
        </>}

        {tab==='notifications'&&<>
          <div style={{padding:'16px 16px 12px',fontWeight:800,fontSize:20}}>Notifications 🔔</div>
          {NOTIFS.map((n,i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}><div style={{width:44,height:44,borderRadius:'50%',background:'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{n.emoji}</div><div style={{flex:1}}><span style={{fontWeight:700,fontSize:14}}>{n.user} </span><span style={{color:'#888',fontSize:14}}>{n.text}</span></div><span style={{color:'#444',fontSize:12,flexShrink:0}}>{n.time}</span></div>))}
        </>}
      </div>

      {tab==='home'&&<button onClick={()=>setShowCompose(true)} style={{position:'fixed',bottom:96,right:18,width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:28,boxShadow:'0 4px 24px rgba(91,156,246,0.55)',zIndex:50}}>+</button>}

      <div style={{position:'fixed',bottom:14,left:'50%',transform:navVisible?'translateX(-50%)':'translateX(-50%) translateY(100px)',zIndex:100,width:'calc(100% - 28px)',maxWidth:500,transition:'transform 0.3s ease',opacity:navVisible?1:0}}>
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
              <textarea value={composeText} onChange={e=>setComposeText(e.target.value)} placeholder="What's happening around the world?" autoFocus rows={4} style={{width:'100%',background:'transparent',border:'none',color:'#fff',fontSize:17,resize:'none',outline:'none',lineHeight:1.6,fontFamily:'sans-serif'}}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.07)'}}>
                <span style={{color:composeText.length>250?'#FF4757':'#444',fontSize:13}}>{280-composeText.length}</span>
                <button onClick={sendPost} disabled={!composeText.trim()} style={{background:composeText.trim()?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.07)',border:'none',borderRadius:24,padding:'10px 26px',color:composeText.trim()?'#fff':'#444',fontWeight:700,fontSize:14,cursor:composeText.trim()?'pointer':'not-allowed'}}>Sphere it</button>
              </div>
            </div>
          </div>
        </div>
      </div>}
    </div>
  )
}
