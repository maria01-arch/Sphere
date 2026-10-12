const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add missing states to GroupChat
code = code.replace(
  `  const [editName, setEditName] = useState(group.name)`,
  `  const [selectedMsg, setSelectedMsg] = useState(null)
  const [editingMsg, setEditingMsg] = useState(null)
  const [editText, setEditText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const longPressTimer = useRef(null)
  const [editName, setEditName] = useState(group.name)`
);

// Add GC action functions before uploadGroupAvatar
code = code.replace(
  `  const uploadGroupAvatar = async (file) => {`,
  `  const handleLongPress = (msg) => { longPressTimer.current = setTimeout(()=>setSelectedMsg(msg),500) }
  const handlePressEnd = () => clearTimeout(longPressTimer.current)
  const deleteGCMsg = async(msg) => { setSelectedMsg(null); await supabase.from('group_messages').delete().eq('id',msg.id).eq('sender_id',currentUser.id); setMessages(prev=>prev.filter(m=>m.id!==msg.id)) }
  const startEditGCMsg = (msg) => { setSelectedMsg(null); setEditingMsg(msg.id); setEditText(msg.content) }
  const saveEditGCMsg = async() => { if(!editText.trim()) return; await supabase.from('group_messages').update({content:editText.trim()}).eq('id',editingMsg).eq('sender_id',currentUser.id); setMessages(prev=>prev.map(m=>m.id===editingMsg?{...m,content:editText.trim()}:m)); setEditingMsg(null); setEditText('') }

  const uploadGroupAvatar = async (file) => {`
);

// Add long press to GC message render
code = code.replace(
  `        {messages.map(msg=>{
          const own = msg.sender_id===currentUser.id
          return(
            <div key={msg.id} style={{display:'flex',justifyContent:own?'flex-end':'flex-start',gap:8,alignItems:'flex-end'}}>
              {!own&&<Avatar url={msg.sender?.avatar_url} name={msg.sender?.display_name} color={msg.sender?.avatar_color||'#5B9CF6'} size={28}/>}
              <div style={{maxWidth:'75%'}}>
                {!own&&<div style={{color:'#5B9CF6',fontSize:11,fontWeight:700,marginBottom:3,paddingLeft:4}}>{msg.sender?.display_name}</div>}
                <div style={{padding:msg.image_url?'6px':'11px 15px',borderRadius:own?'20px 20px 5px 20px':'20px 20px 20px 5px',background:own?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.09)',color:'#fff',fontSize:15,lineHeight:1.5,wordBreak:'break-word',overflow:'hidden'}}>
                  {msg.image_url?<img src={msg.image_url} style={{maxWidth:220,maxHeight:220,borderRadius:14,display:'block'}} alt="img"/>:msg.content}
                  <div style={{fontSize:10,color:own?'rgba(255,255,255,0.45)':'#444',marginTop:4,textAlign:'right',padding:msg.image_url?'0 8px 6px':'0'}}>{timeAgo(msg.created_at)}</div>
                </div>
              </div>
            </div>
          )
        })}`,
  `        {selectedMsg&&<div onClick={()=>setSelectedMsg(null)} style={{position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-end'}}>
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
        })}`
);

// Update GC sendMsg to include replyTo
code = code.replace(
  `  const sendMsg = async () => {
    if(!msgText.trim()) return
    const text = msgText.trim()
    setMsgText('')
    const tempMsg = {id:'temp_'+Date.now(),group_id:group.id,sender_id:currentUser.id,content:text,created_at:new Date().toISOString(),sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}}
    setMessages(prev=>[...prev,tempMsg])
    await supabase.from('group_messages').insert({group_id:group.id,sender_id:currentUser.id,content:text})
  }`,
  `  const sendMsg = async () => {
    if(!msgText.trim()) return
    const text=msgText.trim(); const reply=replyTo
    setMsgText(''); setReplyTo(null)
    const tempMsg = {id:'temp_'+Date.now(),group_id:group.id,sender_id:currentUser.id,content:text,reply_to:reply,created_at:new Date().toISOString(),sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}}
    setMessages(prev=>[...prev,tempMsg])
    await supabase.from('group_messages').insert({group_id:group.id,sender_id:currentUser.id,content:text,reply_to:reply})
  }`
);

// Add reply indicator above GC input
code = code.replace(
  `        <input ref={imgRef} type="file" accept="image/*" onChange={e=>sendImage(e.target.files[0])} style={{display:'none'}}/>`,
  `        {replyTo&&<div style={{padding:'8px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <span style={{color:'#888',fontSize:12}}>↩ <span style={{color:'#5B9CF6'}}>{replyTo}</span></span>
          <button onClick={()=>setReplyTo(null)} style={{background:'none',border:'none',color:'#555',cursor:'pointer',fontSize:18}}>✕</button>
        </div>}
        <input ref={imgRef} type="file" accept="image/*" onChange={e=>sendImage(e.target.files[0])} style={{display:'none'}}/>`
);

// Fix GC realtime to avoid doubles
code = code.replace(
  `if(data) setMessages(prev=>[...prev,data])
      }).subscribe()
    return()=>supabase.removeChannel(ch)
  },[])`,
  `if(data) setMessages(prev=>[...prev.filter(m=>!m.id.toString().startsWith('temp_')),data])
      }).subscribe()
    return()=>supabase.removeChannel(ch)
  },[])`
);

// Add delete policy for group_messages in code (already done in SQL, just verify function)
fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
