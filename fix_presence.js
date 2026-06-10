const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Fix 1: My Pulse button always opens create, tap existing pulse to view it
code = code.replace(
  `<div onClick={()=>myPulse?setViewingPulse({...myPulse,author:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}}):setShowCreatePulse(true)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,cursor:'pointer',flexShrink:0}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:myPulse?myPulse.bg_color:'rgba(255,255,255,0.07)',border:myPulse?'3px solid #5B9CF6':'2px dashed #444',display:'flex',alignItems:'center',justifyContent:'center',fontSize:myPulse?20:28,color:myPulse?'#fff':'#555'}}>
            {myPulse?'⚡':'＋'}
          </div>
          <span style={{color:'#ccc',fontSize:11}}>My Pulse</span>
        </div>`,
  `<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flexShrink:0}}>
          <div onClick={()=>setShowCreatePulse(true)} style={{width:64,height:64,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'2px dashed #5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,color:'#5B9CF6',cursor:'pointer'}}>＋</div>
          <span style={{color:'#ccc',fontSize:11}}>Add Pulse</span>
        </div>
        {myPulse&&<div onClick={()=>setViewingPulse({...myPulse,author:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}})} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,cursor:'pointer',flexShrink:0}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:myPulse.bg_color||'#5B9CF6',border:'3px solid #00C9A7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:'#fff'}}>⚡</div>
          <span style={{color:'#ccc',fontSize:11}}>My Pulse</span>
        </div>`
);

// Fix 2: Add online presence tracking to SphereApp
// Add onlineUsers state
code = code.replace(
  `  const [hideNav, setHideNav] = useState(false)`,
  `  const [hideNav, setHideNav] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState({})`
);

// Add presence useEffect after stateRef useEffect
code = code.replace(
  `  useEffect(()=>{
    window.history.pushState(null,'',window.location.href)`,
  `  useEffect(()=>{
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
    window.history.pushState(null,'',window.location.href)`
);

// Fix 3: Replace dummy green dot in DM list with real presence
code = code.replace(
  `<Avatar url={conv.other?.avatar_url} name={conv.other?.display_name} color={conv.other?.avatar_color||'#5B9CF6'} size={50} online/>`,
  `<Avatar url={conv.other?.avatar_url} name={conv.other?.display_name} color={conv.other?.avatar_color||'#5B9CF6'} size={50} online={!!onlineUsers[conv.other?.id]}/>`
);

// Fix 4: Real presence in DM chat header
code = code.replace(
  `<div style={{color:'#555',fontSize:11}}>DM</div>`,
  `<div style={{color:onlineUsers[selectedConv?.other?.id]?'#00C9A7':'#555',fontSize:11}}>{onlineUsers[selectedConv?.other?.id]?'● Active now':'● Offline'}</div>`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
