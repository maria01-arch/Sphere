const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

const pulseComponent = `
function PulseTab({ currentUser, supabase, onUserClick }) {
  const [groups, setGroups] = useState([])
  const [pulses, setPulses] = useState([])
  const [myPulse, setMyPulse] = useState(null)
  const [viewingPulse, setViewingPulse] = useState(null)
  const [viewingGroup, setViewingGroup] = useState(null)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showCreatePulse, setShowCreatePulse] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [pulseText, setPulseText] = useState('')
  const [pulseBg, setPulseBg] = useState('#5B9CF6')
  const [saving, setSaving] = useState(false)
  const COLORS = ['#5B9CF6','#845EF7','#FF6B35','#00C9A7','#FF4757','#F7B731','#FD79A8','#A29BFE']

  useEffect(()=>{ loadAll() },[])

  const loadAll = async () => {
    const [{data:g},{data:p},{data:mp}] = await Promise.all([
      supabase.from('groups').select('*,group_members(user_id)').order('created_at',{ascending:false}),
      supabase.from('pulses').select('*,author:profiles(id,display_name,username,avatar_url,avatar_color)').order('created_at',{ascending:false}),
      supabase.from('pulses').select('*').eq('user_id',currentUser.id).gt('expires_at',new Date().toISOString()).maybeSingle()
    ])
    setGroups(g||[])
    setPulses((p||[]).filter(x=>x.user_id!==currentUser.id))
    setMyPulse(mp)
  }

  const createGroup = async () => {
    if(!groupName.trim()) return
    setSaving(true)
    const {data} = await supabase.from('groups').insert({name:groupName.trim(),description:groupDesc.trim(),creator_id:currentUser.id,cover_color:pulseBg}).select().single()
    if(data) {
      await supabase.from('group_members').insert({group_id:data.id,user_id:currentUser.id})
      setGroups(g=>[{...data,group_members:[{user_id:currentUser.id}]},...g])
      setGroupName(''); setGroupDesc(''); setShowCreateGroup(false)
    }
    setSaving(false)
  }

  const createPulse = async () => {
    if(!pulseText.trim()) return
    setSaving(true)
    const {data} = await supabase.from('pulses').insert({user_id:currentUser.id,content:pulseText.trim(),bg_color:pulseBg}).select('*,author:profiles(id,display_name,username,avatar_url,avatar_color)').single()
    if(data) { setMyPulse(data); setPulseText(''); setShowCreatePulse(false) }
    setSaving(false)
  }

  const joinGroup = async (group) => {
    const isMember = group.group_members?.some(m=>m.user_id===currentUser.id)
    if(isMember) { setViewingGroup(group); return }
    await supabase.from('group_members').insert({group_id:group.id,user_id:currentUser.id})
    setGroups(g=>g.map(x=>x.id===group.id?{...x,group_members:[...(x.group_members||[]),{user_id:currentUser.id}]}:x))
    setViewingGroup({...group,group_members:[...(group.group_members||[]),{user_id:currentUser.id}]})
  }

  if(viewingPulse) return (
    <div style={{position:'fixed',inset:0,zIndex:300,background:viewingPulse.bg_color||'#090B10',display:'flex',flexDirection:'column'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'rgba(255,255,255,0.2)',borderRadius:2}}>
        <div style={{height:'100%',background:'#fff',borderRadius:2,animation:'progress 5s linear forwards'}}/>
      </div>
      <style>{'@keyframes progress{from{width:0}to{width:100%}}'}</style>
      <div style={{padding:'20px 16px 8px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setViewingPulse(null)} style={{background:'none',border:'none',color:'#fff',fontSize:24,cursor:'pointer'}}>✕</button>
        <Avatar url={viewingPulse.author?.avatar_url} name={viewingPulse.author?.display_name} color={viewingPulse.author?.avatar_color||'#5B9CF6'} size={38}/>
        <div>
          <div style={{color:'#fff',fontWeight:700,fontSize:15}}>{viewingPulse.author?.display_name}</div>
          <div style={{color:'rgba(255,255,255,0.6)',fontSize:12}}>{timeAgo(viewingPulse.created_at)}</div>
        </div>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
        <p style={{color:'#fff',fontSize:24,fontWeight:700,textAlign:'center',lineHeight:1.5}}>{viewingPulse.content}</p>
      </div>
      <div style={{padding:'0 16px 40px',display:'flex',gap:10}}>
        <button onClick={()=>onUserClick(viewingPulse.author)} style={{flex:1,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:24,padding:'12px',color:'#fff',fontWeight:700,cursor:'pointer'}}>View Profile</button>
      </div>
    </div>
  )

  if(viewingGroup) return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setViewingGroup(null)} style={{background:'none',border:'none',color:'#fff',fontSize:24,cursor:'pointer'}}>‹</button>
        <div style={{width:36,height:36,borderRadius:12,background:viewingGroup.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:'#fff'}}>{viewingGroup.name[0]}</div>
        <div>
          <div style={{fontWeight:700,fontSize:17}}>{viewingGroup.name}</div>
          <div style={{color:'#555',fontSize:12}}>{viewingGroup.group_members?.length||0} members</div>
        </div>
      </div>
      <div style={{padding:'40px 20px',textAlign:'center'}}>
        <p style={{fontSize:48}}>💬</p>
        <p style={{color:'#666',fontSize:16,marginTop:8}}>Group chat coming soon</p>
        {viewingGroup.description&&<p style={{color:'#555',fontSize:14,marginTop:8}}>{viewingGroup.description}</p>}
      </div>
    </div>
  )

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
        <textarea value={groupDesc} onChange={e=>setGroupDesc(e.target.value)} placeholder="Description (optional)" rows={3} style={{width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',resize:'none',fontFamily:'sans-serif',boxSizing:'border-box'}}/>
      </div>
    </div>
  )

  return (
    <div style={{paddingBottom:20}}>
      <div style={{padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontWeight:800,fontSize:18}}>Pulse ⚡</span>
        <button onClick={()=>setShowCreateGroup(true)} style={{background:'rgba(91,156,246,0.1)',border:'1px solid rgba(91,156,246,0.2)',borderRadius:12,padding:'6px 14px',color:'#5B9CF6',cursor:'pointer',fontWeight:700,fontSize:13}}>+ Group</button>
      </div>

      {groups.length>0&&<>
        <p style={{padding:'0 16px 8px',color:'#555',fontSize:13,fontWeight:600}}>GROUPS</p>
        <div style={{display:'flex',gap:12,padding:'0 16px 16px',overflowX:'auto',scrollbarWidth:'none'}}>
          {groups.map(g=>(
            <div key={g.id} onClick={()=>joinGroup(g)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,cursor:'pointer',flexShrink:0}}>
              <div style={{width:60,height:60,borderRadius:18,background:g.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:800,color:'#fff',border:g.group_members?.some(m=>m.user_id===currentUser.id)?'2px solid #5B9CF6':'2px solid transparent'}}>{g.name[0]}</div>
              <span style={{color:'#ccc',fontSize:11,maxWidth:60,textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.name}</span>
            </div>
          ))}
        </div>
      </>}

      <p style={{padding:'0 16px 8px',color:'#555',fontSize:13,fontWeight:600}}>PULSES</p>
      <div style={{display:'flex',gap:12,padding:'0 16px 20px',overflowX:'auto',scrollbarWidth:'none'}}>
        <div onClick={()=>myPulse?setViewingPulse({...myPulse,author:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}}):setShowCreatePulse(true)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,cursor:'pointer',flexShrink:0}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:myPulse?myPulse.bg_color:'rgba(255,255,255,0.07)',border:myPulse?'3px solid #5B9CF6':'2px dashed #444',display:'flex',alignItems:'center',justifyContent:'center',fontSize:myPulse?20:28,color:myPulse?'#fff':'#555'}}>
            {myPulse?'⚡':'＋'}
          </div>
          <span style={{color:'#ccc',fontSize:11}}>My Pulse</span>
        </div>
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
`;

// Insert PulseTab component before SphereApp
code = code.replace(
  `export default function SphereApp`,
  pulseComponent + `export default function SphereApp`
);

// Replace pulse placeholder with real component
code = code.replace(
  `{tab==='pulse'&&<div style={{padding:'60px 20px',textAlign:'center'}}><p style={{fontSize:48}}>⚡</p><p style={{color:'#666',fontSize:16,marginTop:8}}>Pulse stories coming soon</p></div>}`,
  `{tab==='pulse'&&<PulseTab currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick}/>}`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
