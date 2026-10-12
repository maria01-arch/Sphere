const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

const groupChat = `
function GroupChat({ group, currentUser, supabase, onBack, onUserClick }) {
  const [messages, setMessages] = useState([])
  const [members, setMembers] = useState([])
  const [msgText, setMsgText] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)
  const myRole = members.find(m=>m.user_id===currentUser.id)?.role||'member'
  const isAdmin = myRole==='admin'
  const isCreator = group.creator_id===currentUser.id

  useEffect(()=>{ loadAll() },[])
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])

  const loadAll = async () => {
    const [{data:msgs},{data:mems}] = await Promise.all([
      supabase.from('group_messages').select('*,sender:profiles(id,display_name,avatar_url,avatar_color)').eq('group_id',group.id).order('created_at',{ascending:true}).limit(100),
      supabase.from('group_members').select('*,profile:profiles(id,display_name,username,avatar_url,avatar_color)').eq('group_id',group.id)
    ])
    setMessages(msgs||[])
    setMembers(mems||[])
    setLoading(false)

    const ch = supabase.channel('gc:'+group.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_messages',filter:'group_id=eq.'+group.id},async(payload)=>{
        const {data} = await supabase.from('group_messages').select('*,sender:profiles(id,display_name,avatar_url,avatar_color)').eq('id',payload.new.id).single()
        if(data) setMessages(prev=>[...prev,data])
      }).subscribe()
    return()=>supabase.removeChannel(ch)
  }

  const sendMsg = async () => {
    if(!msgText.trim()) return
    const text = msgText.trim()
    setMsgText('')
    await supabase.from('group_messages').insert({group_id:group.id,sender_id:currentUser.id,content:text})
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
    await supabase.from('group_members').delete().eq('group_id',group.id).eq('user_id',member.user_id)
    setMembers(prev=>prev.filter(m=>m.user_id!==member.user_id))
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
        {isCreator&&<button onClick={()=>{if(window.confirm('Delete this group? This cannot be undone.'))deleteGroup()}} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'none',padding:'16px',color:'#FF4757',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left'}}>
          🗑️ Delete Group
        </button>}
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff',display:'flex',flexDirection:'column'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'#fff',fontSize:24,cursor:'pointer'}}>‹</button>
        <div onClick={()=>setShowSettings(true)} style={{display:'flex',alignItems:'center',gap:10,flex:1,cursor:'pointer'}}>
          <div style={{width:38,height:38,borderRadius:12,background:group.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:18,color:'#fff'}}>{group.name[0]}</div>
          <div>
            <div style={{fontWeight:700,fontSize:16}}>{group.name}</div>
            <div style={{color:'#555',fontSize:12}}>{members.length} members</div>
          </div>
        </div>
        <button onClick={()=>setShowSettings(true)} style={{background:'none',border:'none',color:'#666',fontSize:22,cursor:'pointer'}}>⚙️</button>
      </div>

      <div style={{flex:1,padding:'16px 14px',display:'flex',flexDirection:'column',gap:8,paddingBottom:90,minHeight:'70vh'}}>
        {loading&&<p style={{textAlign:'center',color:'#444',marginTop:40}}>Loading...</p>}
        {!loading&&messages.length===0&&<div style={{textAlign:'center',marginTop:60}}>
          <p style={{fontSize:40}}>👋</p>
          <p style={{color:'#444',fontSize:14,marginTop:8}}>Say hello to the group!</p>
        </div>}
        {messages.map(msg=>{
          const own = msg.sender_id===currentUser.id
          return(
            <div key={msg.id} style={{display:'flex',justifyContent:own?'flex-end':'flex-start',gap:8,alignItems:'flex-end'}}>
              {!own&&<Avatar url={msg.sender?.avatar_url} name={msg.sender?.display_name} color={msg.sender?.avatar_color||'#5B9CF6'} size={28}/>}
              <div style={{maxWidth:'75%'}}>
                {!own&&<div style={{color:'#5B9CF6',fontSize:11,fontWeight:700,marginBottom:3,paddingLeft:4}}>{msg.sender?.display_name}</div>}
                <div style={{padding:'11px 15px',borderRadius:own?'20px 20px 5px 20px':'20px 20px 20px 5px',background:own?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.09)',color:'#fff',fontSize:15,lineHeight:1.5,wordBreak:'break-word'}}>
                  {msg.content}
                  <div style={{fontSize:10,color:own?'rgba(255,255,255,0.45)':'#444',marginTop:4,textAlign:'right'}}>{timeAgo(msg.created_at)}</div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef}/>
      </div>

      <div style={{position:'sticky',bottom:80,background:'#090B10',padding:'10px 14px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,alignItems:'center'}}>
        <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Message group..." style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:26,padding:'12px 18px',color:'#fff',fontSize:15,outline:'none',fontFamily:'sans-serif'}}/>
        <button onClick={sendMsg} disabled={!msgText.trim()} style={{width:46,height:46,borderRadius:'50%',background:msgText.trim()?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.06)',border:'none',cursor:msgText.trim()?'pointer':'not-allowed',color:msgText.trim()?'#fff':'#333',fontSize:20,flexShrink:0}}>→</button>
      </div>
    </div>
  )
}
`;

// Insert GroupChat before PulseTab
code = code.replace(
  `\nfunction PulseTab(`,
  groupChat + `\nfunction PulseTab(`
);

// Replace the viewingGroup placeholder with GroupChat component
const oldGroupView = `  if(viewingGroup) return (
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
  )`;

const newGroupView = `  if(viewingGroup) return <GroupChat group={viewingGroup} currentUser={currentUser} supabase={supabase} onBack={()=>setViewingGroup(null)} onUserClick={onUserClick}/>`;

if(code.includes(oldGroupView)){code=code.replace(oldGroupView,newGroupView);console.log('Group view replaced')}
else console.log('Group view not found');

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
