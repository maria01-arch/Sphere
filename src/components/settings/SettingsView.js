'use client'
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Award, Ban, Bell, BookOpen, Check, Globe, Image as ImageIcon, Lock, LogOut, MapPin, Trash2, User } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { RowSkeletonList } from '@/components/common/Skeletons'
import { ThemeToggleRow } from '@/components/settings/ThemeToggleRow'
import { VerifyForm } from '@/components/settings/VerifyForm'
import { authJsonHeaders } from '@/lib/api'
import { uploadToR2 } from '@/lib/media/upload'

export function SettingsView({ currentUser, supabase, onBack, onSignOut, onAvatarUpdate, sendPush, setupPush, requestNotifPermission }) {
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
  const [crossUsername, setCrossUsername] = useState('')
  const [crossTestMsg, setCrossTestMsg] = useState('')
  const [testingCross, setTestingCross] = useState(false)
  const [testMsg, setTestMsg] = useState('')
  const [permState, setPermState] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const [serverTestMsg, setServerTestMsg] = useState('')
  const [testingServer, setTestingServer] = useState(false)
  const [pushSetupStatus, setPushSetupStatus] = useState(()=>{ try { return localStorage.getItem('flitters_push_status')||'' } catch(e){ return '' } })
  const [rerunning, setRerunning] = useState(false)
  const rerunSetup = async () => {
    setRerunning(true)
    await setupPush()
    try { setPushSetupStatus(localStorage.getItem('flitters_push_status')||'') } catch(e){}
    setRerunning(false)
  }
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [blockedList, setBlockedList] = useState(null)
  useEffect(()=>{
    if(section!=='blocked') return
    supabase.from('blocks').select('id,blocked_id,blocked:profiles!blocks_blocked_id_fkey(id,display_name,username,avatar_url,avatar_color)').eq('blocker_id',currentUser.id).order('created_at',{ascending:false})
      .then(({data,error})=>{ if(error) console.log('blocked list error',error.message); setBlockedList(data||[]) })
  },[section])
  const deleteAccount = async () => {
    setDeleting(true); setDeleteError('')
    try {
      const res = await fetch('/api/delete-account',{method:'POST',headers:await authJsonHeaders()})
      const result = await res.json().catch(()=>({}))
      if(!res.ok) { setDeleteError(result.error||'Something went wrong. Please try again.'); setDeleting(false); return }
      await supabase.auth.signOut()
      window.location.href = '/auth'
    } catch(e) { setDeleteError(e.message); setDeleting(false) }
  }

  const showMsg = (text, ok=true) => { setMsg({text,ok}); setTimeout(()=>setMsg({text:'',ok:true}),3000) }
  const inp = {width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none',fontFamily:'sans-serif',boxSizing:'border-box',marginBottom:12}
  const LANGUAGES = ['English','French','Spanish','Arabic','Portuguese','Swahili','Hindi','Chinese','German','Japanese','Russian','Italian']

  const uploadAvatar = async (file) => {
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${currentUser.id}.${ext}`
    let urlData
    try { urlData = await uploadToR2(file, path) }
    catch(err) { showMsg('Upload failed: '+err.message, false); setUploading(false); return }
    // Cache-bust: the storage path (and therefore the base public URL) stays
    // identical across re-uploads, so browsers cache the old image against
    // that same URL and never re-fetch the new one. Appending a changing
    // query param forces a fresh fetch every time.
    const url = urlData.publicUrl + '?v=' + Date.now()
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

  const MsgBox = () => msg.text ? <div style={{padding:'10px 14px',borderRadius:10,background:msg.ok?'rgba(var(--repost-rgb),0.1)':'rgba(var(--danger-rgb),0.1)',border:`1px solid ${msg.ok?'rgba(var(--repost-rgb),0.2)':'rgba(var(--danger-rgb),0.2)'}`,color:msg.ok?'var(--repost)':'var(--danger)',fontSize:13,marginBottom:16}}>{msg.text}</div> : null

  const Header = ({title}) => (
    <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'calc(12px + env(safe-area-inset-top)) 16px 12px',display:'flex',alignItems:'center',gap:12}}>
      <button onClick={()=>setSection('main')} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',fontSize:24}}>‹</button>
      <span style={{fontWeight:700,fontSize:17}}>{title}</span>
    </div>
  )

  if (section==='avatar') return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <Header title="Profile Picture"/>
      <div style={{padding:'30px 20px',display:'flex',flexDirection:'column',alignItems:'center',gap:20}}>
        <MsgBox/>
        <Avatar url={currentUser?.avatar_url} name={currentUser?.display_name} color={currentUser?.avatar_color||'#5B9CF6'} size={100}/>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>uploadAvatar(e.target.files[0])}/>
        <button onClick={()=>fileRef.current?.click()} style={{background:'var(--primary)',border:'none',borderRadius:12,padding:'14px 32px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',width:'100%'}}>
          {uploading?'Uploading...':'Choose Photo'}
        </button>
        <p style={{color:'var(--text-secondary)',fontSize:13,textAlign:'center'}}>Tap to select a photo from your device</p>
      </div>
    </div>
  )

  if (section==='profile') return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <Header title="Edit Profile"/>
      <div style={{padding:'20px 16px'}}>
        <MsgBox/>
        <label style={{color:'var(--text-tertiary)',fontSize:13,display:'block',marginBottom:6}}>Display Name</label>
        <input value={displayName} onChange={e=>setDisplayName(e.target.value)} style={{...inp}} placeholder="Your name"/>
        <label style={{color:'var(--text-tertiary)',fontSize:13,display:'block',marginBottom:6}}>Bio</label>
        <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={3} style={{...inp,resize:'none'}} placeholder="Tell the world about yourself"/>
        <button onClick={saveProfile} style={{width:'100%',background:'var(--primary)',border:'none',borderRadius:12,padding:'14px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer'}}>
          {saving?'Saving...':'Save Changes'}
        </button>
      </div>
    </div>
  )

  if (section==='password') return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <Header title="Change Password"/>
      <div style={{padding:'20px 16px'}}>
        <MsgBox/>
        <label style={{color:'var(--text-tertiary)',fontSize:13,display:'block',marginBottom:6}}>New Password</label>
        <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} style={{...inp}} placeholder="New password"/>
        <label style={{color:'var(--text-tertiary)',fontSize:13,display:'block',marginBottom:6}}>Confirm Password</label>
        <input type="password" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} style={{...inp}} placeholder="Confirm new password"/>
        <button onClick={changePassword} style={{width:'100%',background:'var(--primary)',border:'none',borderRadius:12,padding:'14px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer'}}>
          {saving?'Saving...':'Update Password'}
        </button>
      </div>
    </div>
  )

  if (section==='location') return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <Header title="Location"/>
      <div style={{padding:'20px 16px'}}>
        <MsgBox/>
        <label style={{color:'var(--text-tertiary)',fontSize:13,display:'block',marginBottom:6}}>Your Country / City</label>
        <input value={location} onChange={e=>setLocation(e.target.value)} style={{...inp}} placeholder="e.g. Lagos, Nigeria"/>
        <button onClick={async()=>{setSaving(true);const {error}=await supabase.from('profiles').update({location}).eq('id',currentUser.id);if(error)showMsg(error.message,false);else{currentUser.location=location;showMsg('Saved!')};setSaving(false)}} style={{width:'100%',background:'var(--primary)',border:'none',borderRadius:12,padding:'14px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer'}}>
          {saving?'Saving...':'Save Location'}
        </button>
      </div>
    </div>
  )

  if (section==='language') return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <Header title="Language"/>
      <div style={{padding:'8px 0'}}>
        {LANGUAGES.map(lang=>(
          <div key={lang} onClick={()=>setLanguage(lang)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',cursor:'pointer',borderBottom:'1px solid var(--bg-card-4)',background:language===lang?'rgba(var(--primary-rgb),0.08)':'transparent'}}>
            <span style={{fontSize:15}}>{lang}</span>
            {language===lang&&<span style={{color:'var(--primary)',display:'flex'}}><Check size={18}/></span>}
          </div>
        ))}
      </div>
    </div>
  )


  // Intentionally removed from the Settings menu (see below) and left
  // unreachable rather than deleted outright. Google Play's Payments
  // policy requires any digital feature/perk unlocked inside an app
  // distributed through Google Play to go through Google Play Billing —
  // this screen instead shows raw USDT/BTC wallet addresses for a paid
  // verified badge, which is exactly what that policy prohibits. Don't
  // re-add the menu entry below without first wiring this through Play
  // Billing (or gating it to a genuinely non-Play-reviewed context).
  if(section==='verify') return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <Header title="Get Verified"/>
      <div style={{padding:'20px 16px'}}>
        <MsgBox/>
        <div style={{background:'linear-gradient(135deg,rgba(255,215,0,0.08),rgba(255,165,0,0.08))',border:'1px solid rgba(255,215,0,0.25)',borderRadius:16,padding:'20px',marginBottom:24,textAlign:'center'}}>
          <div style={{marginBottom:8,display:'flex',justifyContent:'center',color:'var(--primary)'}}><Award size={48}/></div>
          <h2 style={{fontWeight:800,fontSize:20,color:'#FFD700',marginBottom:8}}>Flitters Verified Badge</h2>
          <p style={{color:'var(--text-subtle)',fontSize:14,lineHeight:1.6}}>Get a gold badge on your profile and all your posts.</p>
          <p style={{color:'#FFD700',fontWeight:700,fontSize:18,marginTop:12}}>One-time fee: $5 USD</p>
        </div>
        <h3 style={{fontWeight:700,fontSize:15,marginBottom:12}}>Pay to one of these:</h3>
        <div style={{background:'var(--bg-card-4)',borderRadius:12,padding:'14px',marginBottom:10}}>
          <p style={{fontWeight:700,marginBottom:6}}>USDT TRC-20</p>
          <p style={{color:'var(--text-tertiary)',fontSize:11,wordBreak:'break-all',fontFamily:'monospace'}}>TABFK9Z3yC4kKtVzqEwqoyAfwSySkzJcHL</p>
        </div>
        <div style={{background:'var(--bg-card-4)',borderRadius:12,padding:'14px',marginBottom:20}}>
          <p style={{fontWeight:700,marginBottom:6}}>Bitcoin BTC</p>
          <p style={{color:'var(--text-tertiary)',fontSize:11,wordBreak:'break-all',fontFamily:'monospace'}}>bc1ql7qzefrh2czl29krzzsnwkr6dvnp2few2h80s7</p>
        </div>
        <h3 style={{fontWeight:700,fontSize:15,marginBottom:12}}>Application Form</h3>
        <VerifyForm currentUser={currentUser} supabase={supabase} showMsg={showMsg} saving={saving} setSaving={setSaving} inp={inp}/>
      </div>
    </div>
  )
  if(section==='notiftest') {
    const runTest = async () => {
      setTestMsg('')
      if (typeof Notification === 'undefined') { setTestMsg('This browser/app does not support the Notification API at all.'); return }
      const usingNativeBridge = window.__webtoapp_notification_polyfill__ === true
      let perm = Notification.permission
      if (perm === 'default') { perm = await requestNotifPermission(); setPermState(perm) }
      if (perm !== 'granted' && !usingNativeBridge) { setTestMsg('Permission is "'+perm+'" — notifications are blocked. Check app/site notification settings.'); return }
      try {
        if('serviceWorker' in navigator){
          const reg = await navigator.serviceWorker.ready
          await reg.showNotification('Flitters Test', { body: 'If you see this, notifications work in this browser/app!', icon: '/icon-192.png' })
        } else {
          new Notification('Flitters Test', { body: 'If you see this, notifications work in this browser/app!', icon: '/icon-192.png' })
        }
        setTestMsg('Test notification sent — check if it appeared.'+(perm!=='granted'?' (permission property said "'+perm+'" but the native bridge is in play, so this is the real test.)':''))
      } catch(e) {
        setTestMsg('showNotification() threw an error: ' + e.message)
      }
    }
    const runServerTest = async () => {
      setServerTestMsg('')
      setTestingServer(true)
      const result = await sendPush(currentUser.id, 'Flitters Push Test', 'This came through the real server — subscription, VAPID keys, and all.')
      setTestingServer(false)
      if(result.ok) setServerTestMsg('Sent via the server! If it doesn\'t appear in a few seconds, the issue is on the delivery side (check your device notification settings for this site/app), not your setup.')
      else setServerTestMsg('Failed: '+result.error+(result.error.includes('subscription')?' — try closing and reopening the app once (with notifications allowed) so it can register.':''))
    }
    const runCrossTest = async () => {
      setCrossTestMsg('')
      const uname = crossUsername.trim().replace(/^@/,'')
      if(!uname) { setCrossTestMsg('Enter a username first.'); return }
      setTestingCross(true)
      const {data:target, error:lookupErr} = await supabase.from('profiles').select('id,display_name').ilike('username',uname).maybeSingle()
      if(lookupErr || !target) { setCrossTestMsg('No account found with username @'+uname); setTestingCross(false); return }
      if(target.id === currentUser.id) { setCrossTestMsg('That\'s your own account — this test needs a different account to check cross-account delivery.'); setTestingCross(false); return }
      const result = await sendPush(target.id, 'Flitters Push Test', 'Sent to you by '+(currentUser.display_name||'someone')+' as a cross-account test.')
      setTestingCross(false)
      if(result.ok) setCrossTestMsg('Sent to @'+uname+'! Ask them to check their device — if it doesn\'t arrive there, the read succeeded but delivery failed on their end.')
      else setCrossTestMsg('Failed reading/sending to @'+uname+': '+result.error+(result.error.includes('subscription')?' — this is the same lookup a like/comment notification uses, so if that account has genuinely completed setup and this still says no subscription found, it points at a database permissions (RLS) issue reading someone else\'s subscription row rather than your own.':''))
    }
    return (
      <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
        <Header title="Notifications"/>
        <div style={{padding:'20px 16px'}}>
          <div style={{background:'var(--bg-card-5)',border:'1px solid var(--bg-card-6)',borderRadius:14,padding:16,marginBottom:16,fontSize:14,color:'var(--text-subtle)'}}>
            <div>Browser permission status: <strong style={{color: permState==='granted'?'var(--repost)':'var(--danger)'}}>{permState}</strong></div>
            <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid var(--bg-card-6)'}}>Last subscription attempt: <strong style={{color:'var(--text-primary)'}}>{pushSetupStatus||'(none recorded yet — try the button below)'}</strong></div>
            <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid var(--bg-card-6)'}}>window.requestNotificationPermissions: <strong style={{color:typeof window!=='undefined'&&typeof window.requestNotificationPermissions==='function'?'var(--repost)':'var(--danger)'}}>{typeof window!=='undefined'?typeof window.requestNotificationPermissions:'n/a'}</strong></div>
            <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid var(--bg-card-6)'}}>Similar globals found: <strong style={{color:'var(--text-primary)',wordBreak:'break-word'}}>{typeof window!=='undefined'?(Object.keys(window).filter(k=>/notif|permission/i.test(k)).join(', ')||'(none)'):'n/a'}</strong></div>
            <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid var(--bg-card-6)'}}>__webtoapp_notification_polyfill__ type: <strong style={{color:'var(--text-primary)'}}>{typeof window!=='undefined'?typeof window.__webtoapp_notification_polyfill__:'n/a'}</strong></div>
            <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid var(--bg-card-6)'}}>...its keys: <strong style={{color:'var(--text-primary)',wordBreak:'break-word'}}>{(()=>{try{const p=window.__webtoapp_notification_polyfill__; if(!p) return '(not present)'; if(typeof p!=='object'&&typeof p!=='function') return '(primitive: '+String(p)+')'; const own=Object.getOwnPropertyNames(p); const proto=Object.getPrototypeOf(p); const protoKeys=proto?Object.getOwnPropertyNames(proto).filter(k=>k!=='constructor'):[]; return 'own: ['+own.join(', ')+'] proto: ['+protoKeys.join(', ')+']'}catch(e){return 'error: '+e.message}})()}</strong></div>
            <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid var(--bg-card-6)'}}>window.Notification own keys: <strong style={{color:'var(--text-primary)',wordBreak:'break-word'}}>{(()=>{try{return typeof Notification!=='undefined'?Object.getOwnPropertyNames(Notification).join(', '):'n/a'}catch(e){return 'error: '+e.message}})()}</strong></div>
          </div>
          <button onClick={rerunSetup} disabled={rerunning} style={{width:'100%',background:'var(--bg-card-2)',border:'none',borderRadius:12,padding:'12px',color:'var(--text-primary)',fontWeight:600,fontSize:13,cursor:'pointer',marginBottom:16}}>
            {rerunning?'Running...':'Re-run subscription setup now'}
          </button>
          <button onClick={runTest} style={{width:'100%',background:'var(--bg-card-2)',border:'none',borderRadius:12,padding:'14px',color:'var(--text-primary)',fontWeight:700,fontSize:15,cursor:'pointer',marginBottom:12}}>
            1. Test local notification
          </button>
          {testMsg && <div style={{padding:'12px 14px',borderRadius:10,background:'var(--bg-card-4)',color:'var(--text-subtle)',fontSize:13,lineHeight:1.5,marginBottom:16}}>{testMsg}</div>}
          <button onClick={runServerTest} disabled={testingServer} style={{width:'100%',background:'var(--primary)',border:'none',borderRadius:12,padding:'14px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',marginBottom:12}}>
            {testingServer?'Sending...':'2. Test real push (via server)'}
          </button>
          {serverTestMsg && <div style={{padding:'12px 14px',borderRadius:10,background:'var(--bg-card-4)',color:'var(--text-subtle)',fontSize:13,lineHeight:1.5,marginBottom:16}}>{serverTestMsg}</div>}
          <div style={{background:'var(--bg-card-3)',borderRadius:12,padding:14,marginBottom:12}}>
            <p style={{fontWeight:700,fontSize:14,marginBottom:10}}>3. Test push to another account</p>
            <input value={crossUsername} onChange={e=>setCrossUsername(e.target.value)} placeholder="their username (no @)" style={{width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:10,padding:'10px 14px',color:'var(--text-primary)',fontSize:14,outline:'none',boxSizing:'border-box',marginBottom:10}}/>
            <button onClick={runCrossTest} disabled={testingCross} style={{width:'100%',background:'var(--bg-card-2)',border:'none',borderRadius:10,padding:'12px',color:'var(--text-primary)',fontWeight:700,fontSize:14,cursor:'pointer'}}>
              {testingCross?'Sending...':'Send test to that account'}
            </button>
            {crossTestMsg && <p style={{marginTop:10,color:'var(--text-subtle)',fontSize:13,lineHeight:1.5}}>{crossTestMsg}</p>}
          </div>
          <p style={{color:'var(--text-secondary)',fontSize:12,marginTop:8,lineHeight:1.6}}>Test 1 checks only that this browser/app can show notifications at all. Test 2 sends a real notification from the server through your own saved subscription. Test 3 does the same thing but to someone else's account by username — this is exactly what happens when someone likes or comments on your post, so it's the right way to check cross-account delivery specifically.</p>
        </div>
      </div>
    )
  }

  if(section==='blocked') {
    const unblock = async(blockRowId) => {
      setBlockedList(list=>list.filter(b=>b.id!==blockRowId))
      await supabase.from('blocks').delete().eq('id',blockRowId).eq('blocker_id',currentUser.id)
    }
    return (
      <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
        <Header title="Blocked Accounts"/>
        <div style={{padding:'8px 0'}}>
          {blockedList===null&&<RowSkeletonList count={4}/>}
          {blockedList?.length===0&&<div style={{padding:'50px 20px',textAlign:'center'}}><div style={{display:'flex',justifyContent:'center',color:'var(--text-quaternary)'}}><Ban size={36}/></div><p style={{color:'var(--text-secondary)',marginTop:8}}>You haven't blocked anyone</p></div>}
          {blockedList?.map(b=>(
            <div key={b.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid var(--bg-card-4)'}}>
              <Avatar url={b.blocked?.avatar_url} name={b.blocked?.display_name} color={b.blocked?.avatar_color||'#5B9CF6'} size={40}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:14}}>{b.blocked?.display_name}</div>
                <div style={{color:'var(--text-secondary)',fontSize:12}}>@{b.blocked?.username}</div>
              </div>
              <button onClick={()=>unblock(b.id)} style={{background:'var(--bg-card-2)',border:'none',borderRadius:16,padding:'7px 14px',color:'var(--text-primary)',fontWeight:600,fontSize:12,cursor:'pointer',flexShrink:0}}>Unblock</button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'calc(12px + env(safe-area-inset-top)) 16px 12px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',fontSize:24}}>‹</button>
        <span style={{fontWeight:700,fontSize:17}}>Settings</span>
      </div>
      <div style={{padding:'12px 0'}}>
        <ThemeToggleRow/>
        <a href="/stories" style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',background:'none',border:'none',width:'100%',cursor:'pointer',color:'var(--text-primary)',borderBottom:'1px solid var(--bg-card-4)',textAlign:'left',fontSize:15,textDecoration:'none',boxSizing:'border-box'}}>
          <span style={{fontSize:22,display:'flex'}}><BookOpen size={18}/></span><span style={{flex:1,fontWeight:500}}>My Stories</span><span style={{color:'var(--text-quaternary)'}}>›</span>
        </a>
        {[{icon:<ImageIcon size={18}/>,label:'Profile Picture',id:'avatar'},{icon:<User size={18}/>,label:'Edit Profile',id:'profile'},{icon:<Lock size={18}/>,label:'Change Password',id:'password'},{icon:<MapPin size={18}/>,label:'Location',id:'location'},{icon:<Globe size={18}/>,label:'Language',id:'language'},{icon:<Bell size={18}/>,label:'Notifications',id:'notiftest'},{icon:<Ban size={18}/>,label:'Blocked Accounts',id:'blocked'}].map(s=>(
          <button key={s.id} onClick={()=>setSection(s.id)} style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',background:'none',border:'none',width:'100%',cursor:'pointer',color:'var(--text-primary)',borderBottom:'1px solid var(--bg-card-4)',textAlign:'left',fontSize:15}}>
            <span style={{fontSize:22}}>{s.icon}</span><span style={{flex:1,fontWeight:500}}>{s.label}</span><span style={{color:'var(--text-quaternary)'}}>›</span>
          </button>
        ))}
        <button onClick={onSignOut} style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',background:'none',border:'none',width:'100%',cursor:'pointer',color:'var(--danger)',borderTop:'1px solid var(--border-color)',marginTop:8,fontSize:15}}>
          <LogOut size={20}/><span style={{fontWeight:600}}>Sign Out</span>
        </button>
        <button onClick={()=>setShowDeleteConfirm(true)} style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',background:'none',border:'none',width:'100%',cursor:'pointer',color:'var(--text-quaternary)',fontSize:14}}>
          <Trash2 size={18}/><span style={{fontWeight:500}}>Delete Account</span>
        </button>
        <div style={{padding:'16px 20px',borderTop:'1px solid var(--bg-card-5)',textAlign:'center'}}>
          <a href="/privacy" style={{color:'var(--text-faint)',fontSize:12,textDecoration:'none'}}>Privacy Policy</a>
          <span style={{color:'#222',fontSize:12}}> · </span>
          <a href="/child-safety" style={{color:'var(--text-faint)',fontSize:12,textDecoration:'none'}}>Child Safety Standards</a>
          <br/>
          <span style={{color:'#222',fontSize:12}}>© 2025 Flitters · fka Sphere</span>
        </div>
      </div>
      {showDeleteConfirm && (
        <div onClick={()=>!deleting&&setShowDeleteConfirm(false)} style={{position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-app)',borderRadius:18,padding:24,maxWidth:360,width:'100%'}}>
            <div style={{display:'flex',justifyContent:'center',color:'var(--danger)',marginBottom:10}}><AlertTriangle size={32}/></div>
            <p style={{fontWeight:800,fontSize:17,textAlign:'center',marginBottom:8}}>Delete your account?</p>
            <p style={{color:'var(--text-secondary)',fontSize:13,textAlign:'center',marginBottom:16,lineHeight:1.6}}>This permanently deletes your profile, posts, messages, and everything tied to your account. This cannot be undone.</p>
            <label style={{color:'var(--text-tertiary)',fontSize:12,display:'block',marginBottom:6}}>Type <strong style={{color:'var(--text-primary)'}}>DELETE</strong> to confirm</label>
            <input value={deleteConfirmText} onChange={e=>setDeleteConfirmText(e.target.value)} style={{width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:10,padding:'10px 14px',color:'var(--text-primary)',fontSize:15,outline:'none',boxSizing:'border-box',marginBottom:12}}/>
            {deleteError && <p style={{color:'var(--danger)',fontSize:12,marginBottom:12}}>{deleteError}</p>}
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setShowDeleteConfirm(false);setDeleteConfirmText('')}} disabled={deleting} style={{flex:1,padding:'12px',borderRadius:14,border:'none',background:'var(--bg-card)',color:'var(--text-primary)',fontWeight:700,cursor:'pointer'}}>Cancel</button>
              <button onClick={deleteAccount} disabled={deleteConfirmText!=='DELETE'||deleting} style={{flex:1,padding:'12px',borderRadius:14,border:'none',background:deleteConfirmText==='DELETE'?'var(--danger)':'var(--bg-card-2)',color:deleteConfirmText==='DELETE'?'var(--text-primary)':'var(--text-quaternary)',fontWeight:700,cursor:deleteConfirmText==='DELETE'?'pointer':'not-allowed'}}>{deleting?'Deleting...':'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
