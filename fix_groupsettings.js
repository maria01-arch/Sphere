const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add edit states to GroupChat
code = code.replace(
  `  const [showRequests, setShowRequests] = useState(false)
  const [joinRequests, setJoinRequests] = useState([])
  const [loading, setLoading] = useState(true)`,
  `  const [showRequests, setShowRequests] = useState(false)
  const [joinRequests, setJoinRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [editName, setEditName] = useState(group.name)
  const [editDesc, setEditDesc] = useState(group.description||'')
  const [editJoinMode, setEditJoinMode] = useState(group.join_mode||'open')
  const [editSaving, setEditSaving] = useState(false)
  const [groupAvatar, setGroupAvatar] = useState(group.avatar_url||null)
  const avatarRef = useRef(null)`
);

// Add saveGroupSettings and uploadGroupAvatar functions before leaveGroup
code = code.replace(
  `  const leaveGroup = async () => {`,
  `  const uploadGroupAvatar = async (file) => {
    if(!file||!isCreator) return
    const ext = file.name.split('.').pop()
    const path = 'groups/'+group.id+'.'+ext
    const {error} = await supabase.storage.from('avatars').upload(path,file,{upsert:true})
    if(error){alert('Upload failed: '+error.message);return}
    const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
    const url = urlData.publicUrl
    await supabase.from('groups').update({avatar_url:url}).eq('id',group.id)
    setGroupAvatar(url)
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

  const leaveGroup = async () => {`
);

// Replace settings view with full edit form
code = code.replace(
  `  if(showSettings) return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setShowSettings(false)} style={{background:'none',border:'none',color:'#fff',fontSize:24,cursor:'pointer'}}>‹</button>
        <span style={{fontWeight:700,fontSize:17}}>Group Info</span>
      </div>
      <div style={{padding:20,textAlign:'center'}}>
        <div style={{width:80,height:80,borderRadius:24,background:group.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,fontWeight:800,color:'#fff',margin:'0 auto 12px'}}>{group.name[0]}</div>
        <h2 style={{fontWeight:800,fontSize:22,margin:'0 0 4px'}}>{group.name}</h2>
        {group.description&&<p style={{color:'#888',fontSize:14,margin:'0 0 4px'}}>{group.description}</p>}
        <p style={{color:'#555',fontSize:13}}>{members.length} members · Created {timeAgo(group.created_at)}</p>
      </div>
      <div style={{margin:'0 16px',borderRadius:16,overflow:'hidden',border:'1px solid rgba(255,255,255,0.07)'}}>
        <button onClick={()=>{setShowSettings(false);setShowMembers(true)}} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'none',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'16px',color:'#fff',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between'}}>
          <span>👥 Members</span><span style={{color:'#555'}}>{members.length} ›</span>
        </button>
        <button onClick={leaveGroup} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'none',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'16px',color:'#FF4757',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left'}}>
          🚪 Leave Group
        </button>
        <button onClick={copyInviteLink} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'none',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'16px',color:'#00C9A7',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between'}}>
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
        </button>}
      </div>
    </div>
  )`,
  `  if(showSettings) return (
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
  )`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
