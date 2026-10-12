const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add join requests state and load in GroupChat
code = code.replace(
  `  const [showMembers, setShowMembers] = useState(false)
  const [loading, setLoading] = useState(true)`,
  `  const [showMembers, setShowMembers] = useState(false)
  const [showRequests, setShowRequests] = useState(false)
  const [joinRequests, setJoinRequests] = useState([])
  const [loading, setLoading] = useState(true)`
);

// Load join requests in loadAll
code = code.replace(
  `    const [{data:msgs},{data:mems}] = await Promise.all([
      supabase.from('group_messages').select('*,sender:profiles(id,display_name,avatar_url,avatar_color)').eq('group_id',group.id).order('created_at',{ascending:true}).limit(100),
      supabase.from('group_members').select('*,profile:profiles(id,display_name,username,avatar_url,avatar_color)').eq('group_id',group.id)
    ])
    setMessages(msgs||[])
    setMembers(mems||[])`,
  `    const [{data:msgs},{data:mems},{data:reqs}] = await Promise.all([
      supabase.from('group_messages').select('*,sender:profiles(id,display_name,avatar_url,avatar_color)').eq('group_id',group.id).order('created_at',{ascending:true}).limit(100),
      supabase.from('group_members').select('*,profile:profiles(id,display_name,username,avatar_url,avatar_color)').eq('group_id',group.id),
      supabase.from('group_join_requests').select('*,profile:profiles(id,display_name,username,avatar_url,avatar_color)').eq('group_id',group.id).eq('status','pending')
    ])
    setMessages(msgs||[])
    setMembers(mems||[])
    setJoinRequests(reqs||[])`
);

// Add acceptRequest and rejectRequest functions after removeMember
code = code.replace(
  `  const leaveGroup = async () => {`,
  `  const acceptRequest = async (req) => {
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
    navigator.clipboard.writeText(link).then(()=>alert('Invite link copied!\\n'+link))
  }

  const leaveGroup = async () => {`
);

// Add join requests view before showMembers view
code = code.replace(
  `  if(showMembers) return (`,
  `  if(showRequests) return (
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

  if(showMembers) return (`
);

// Update settings view to add invite link, join requests, join mode display
code = code.replace(
  `        {isCreator&&<button onClick={()=>{if(window.confirm('Delete this group? This cannot be undone.'))deleteGroup()}} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'none',padding:'16px',color:'#FF4757',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left'}}>
          🗑️ Delete Group
        </button>}`,
  `        <button onClick={copyInviteLink} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'none',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'16px',color:'#00C9A7',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between'}}>
          <span>🔗 Copy Invite Link</span><span style={{color:'#555',fontSize:13}}>@{group.tag}</span>
        </button>
        {(isAdmin||isCreator)&&joinRequests.length>0&&<button onClick={()=>{setShowSettings(false);setShowRequests(true)}} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'none',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'16px',color:'#F7B731',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between'}}>
          <span>📬 Join Requests</span><span style={{background:'#FF4757',borderRadius:10,padding:'2px 8px',fontSize:12,color:'#fff'}}>{joinRequests.length}</span>
        </button>}
        <div style={{width:'100%',background:'rgba(255,255,255,0.04)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{color:'#fff',fontWeight:600,fontSize:15}}>🔒 Join Mode</span>
          <span style={{color:'#555',fontSize:13}}>{group.join_mode==='open'?'🌐 Anyone':'🔒 Request only'}</span>
        </div>
        {isCreator&&<button onClick={()=>{if(window.confirm('Delete this group? This cannot be undone.'))deleteGroup()}} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'none',padding:'16px',color:'#FF4757',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left'}}>
          🗑️ Delete Group
        </button>}`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
