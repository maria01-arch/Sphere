const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// 1. Add groupTag and joinMode state to PulseTab
code = code.replace(
  `  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')`,
  `  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [groupTag, setGroupTag] = useState('')
  const [joinMode, setJoinMode] = useState('open')
  const [groupSearch, setGroupSearch] = useState('')
  const [searchedGroups, setSearchedGroups] = useState([])`
);

// 2. Update createGroup to include tag and join_mode
code = code.replace(
  `const {data} = await supabase.from('groups').insert({name:groupName.trim(),description:groupDesc.trim(),creator_id:currentUser.id,cover_color:pulseBg}).select().single()`,
  `const tag = groupTag.trim().toLowerCase().replace(/[^a-z0-9_]/g,'')
    if(!tag){setSaving(false);alert('Please enter a valid group tag');return}
    const {data} = await supabase.from('groups').insert({name:groupName.trim(),description:groupDesc.trim(),creator_id:currentUser.id,cover_color:pulseBg,tag,join_mode:joinMode}).select().single()`
);

// 3. Update createGroup reset
code = code.replace(
  `setGroupName(''); setGroupDesc(''); setShowCreateGroup(false)`,
  `setGroupName(''); setGroupDesc(''); setGroupTag(''); setJoinMode('open'); setShowCreateGroup(false)`
);

// 4. Add searchGroups function after loadAll
code = code.replace(
  `  const createGroup = async () => {`,
  `  const searchGroups = async (q) => {
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

  const createGroup = async () => {`
);

// 5. Replace createGroup form UI to include tag and join mode
code = code.replace(
  `        <input value={groupName} onChange={e=>setGroupName(e.target.value)} placeholder="Group name" style={{width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',boxSizing:'border-box',marginBottom:12}}/>
        <textarea value={groupDesc} onChange={e=>setGroupDesc(e.target.value)} placeholder="Description (optional)" rows={3} style={{width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',resize:'none',fontFamily:'sans-serif',boxSizing:'border-box'}}/>`,
  `        <input value={groupName} onChange={e=>setGroupName(e.target.value)} placeholder="Group name" style={{width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',boxSizing:'border-box',marginBottom:12}}/>
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
        </div>`
);

// 6. Add search bar to Pulse main view and update group display
code = code.replace(
  `      <div style={{padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontWeight:800,fontSize:18}}>Pulse ⚡</span>
        <button onClick={()=>setShowCreateGroup(true)} style={{background:'rgba(91,156,246,0.1)',border:'1px solid rgba(91,156,246,0.2)',borderRadius:12,padding:'6px 14px',color:'#5B9CF6',cursor:'pointer',fontWeight:700,fontSize:13}}>+ Group</button>
      </div>`,
  `      <div style={{padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontWeight:800,fontSize:18}}>Pulse ⚡</span>
        <button onClick={()=>setShowCreateGroup(true)} style={{background:'rgba(91,156,246,0.1)',border:'1px solid rgba(91,156,246,0.2)',borderRadius:12,padding:'6px 14px',color:'#5B9CF6',cursor:'pointer',fontWeight:700,fontSize:13}}>+ Group</button>
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
      </div>`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
