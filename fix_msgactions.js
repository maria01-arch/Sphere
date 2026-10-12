const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add edit/delete/reply states to GroupChat
code = code.replace(
  `  const [editName, setEditName] = useState(group.name)
  const [editDesc, setEditDesc] = useState(group.description||'')
  const [editJoinMode, setEditJoinMode] = useState(group.join_mode||'open')
  const [editSaving, setEditSaving] = useState(false)
  const [groupAvatar, setGroupAvatar] = useState(group.avatar_url||null)
  const [groupData, setGroupData] = useState(group)
  const avatarRef = useRef(null)`,
  `  const [editName, setEditName] = useState(group.name)
  const [editDesc, setEditDesc] = useState(group.description||'')
  const [editJoinMode, setEditJoinMode] = useState(group.join_mode||'open')
  const [editSaving, setEditSaving] = useState(false)
  const [groupAvatar, setGroupAvatar] = useState(group.avatar_url||null)
  const [groupData, setGroupData] = useState(group)
  const avatarRef = useRef(null)
  const [selectedMsg, setSelectedMsg] = useState(null)
  const [editingMsg, setEditingMsg] = useState(null)
  const [editText, setEditText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const longPressTimer = useRef(null)`
);

// Add edit/delete/reply functions before leaveGroup in GroupChat
code = code.replace(
  `  const uploadGroupAvatar = async (file) => {`,
  `  const handleLongPress = (msg) => {
    longPressTimer.current = setTimeout(()=>setSelectedMsg(msg), 500)
  }
  const handlePressEnd = () => clearTimeout(longPressTimer.current)

  const deleteGCMsg = async(msg) => {
    setSelectedMsg(null)
    await supabase.from('group_messages').delete().eq('id',msg.id).eq('sender_id',currentUser.id)
    setMessages(prev=>prev.filter(m=>m.id!==msg.id))
  }

  const startEditGCMsg = (msg) => {
    setSelectedMsg(null)
    setEditingMsg(msg.id)
    setEditText(msg.content)
  }

  const saveEditGCMsg = async() => {
    if(!editText.trim()) return
    await supabase.from('group_messages').update({content:editText.trim()}).eq('id',editingMsg).eq('sender_id',currentUser.id)
    setMessages(prev=>prev.map(m=>m.id===editingMsg?{...m,content:editText.trim()}:m))
    setEditingMsg(null); setEditText('')
  }

  const uploadGroupAvatar = async (file) => {`
);

// Replace group message render with long press support + reply display
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
  `        {messages.map(msg=>{
          const own = msg.sender_id===currentUser.id
          return(
            <div key={msg.id} style={{display:'flex',justifyContent:own?'flex-end':'flex-start',gap:8,alignItems:'flex-end'}}>
              {!own&&<Avatar url={msg.sender?.avatar_url} name={msg.sender?.display_name} color={msg.sender?.avatar_color||'#5B9CF6'} size={28}/>}
              <div style={{maxWidth:'75%'}}
                onTouchStart={()=>handleLongPress(msg)}
                onTouchEnd={handlePressEnd}
                onMouseDown={()=>handleLongPress(msg)}
                onMouseUp={handlePressEnd}>
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

// Add sticker button and replyTo display to group chat input
code = code.replace(
  `        <input ref={imgRef} type="file" accept="image/*" onChange={e=>sendImage(e.target.files[0])} style={{display:'none'}}/>
        <button onClick={()=>imgRef.current?.click()} disabled={sendingImg} style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'none',cursor:'pointer',color:'#888',fontSize:18,flexShrink:0}}>{sendingImg?'⏳':'🖼️'}</button>
        <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Message group..." style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:26,padding:'12px 18px',color:'#fff',fontSize:15,outline:'none',fontFamily:'sans-serif'}}/>
        <button onClick={sendMsg} disabled={!msgText.trim()} style={{width:46,height:46,borderRadius:'50%',background:msgText.trim()?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.06)',border:'none',cursor:msgText.trim()?'pointer':'not-allowed',color:msgText.trim()?'#fff':'#333',fontSize:20,flexShrink:0}}>→</button>`,
  `        <input ref={imgRef} type="file" accept="image/*" onChange={e=>sendImage(e.target.files[0])} style={{display:'none'}}/>
        {replyTo&&<div style={{position:'absolute',bottom:'100%',left:0,right:0,background:'rgba(15,17,23,0.98)',padding:'8px 14px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{color:'#888',fontSize:12}}>↩ Replying to: <span style={{color:'#5B9CF6'}}>{replyTo}</span></span>
          <button onClick={()=>setReplyTo(null)} style={{background:'none',border:'none',color:'#555',cursor:'pointer'}}>✕</button>
        </div>}
        <button onClick={()=>imgRef.current?.click()} disabled={sendingImg} style={{width:38,height:38,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'none',cursor:'pointer',color:'#888',fontSize:16,flexShrink:0}}>{sendingImg?'⏳':'🖼️'}</button>
        <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder={replyTo?'Reply...':'Message group...'} style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:26,padding:'12px 18px',color:'#fff',fontSize:15,outline:'none',fontFamily:'sans-serif'}}/>
        <button onClick={sendMsg} disabled={!msgText.trim()} style={{width:46,height:46,borderRadius:'50%',background:msgText.trim()?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.06)',border:'none',cursor:msgText.trim()?'pointer':'not-allowed',color:msgText.trim()?'#fff':'#333',fontSize:20,flexShrink:0}}>→</button>`
);

// Update sendMsg in GroupChat to include replyTo
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
    const text = msgText.trim()
    const reply = replyTo
    setMsgText(''); setReplyTo(null)
    const tempMsg = {id:'temp_'+Date.now(),group_id:group.id,sender_id:currentUser.id,content:text,reply_to:reply,created_at:new Date().toISOString(),sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}}
    setMessages(prev=>[...prev,tempMsg])
    await supabase.from('group_messages').insert({group_id:group.id,sender_id:currentUser.id,content:text,reply_to:reply})
  }`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
