const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add DM action states to SphereApp
code = code.replace(
  `  const dmImgRef = useRef(null)
  const [sendingDMImg, setSendingDMImg] = useState(false)`,
  `  const dmImgRef = useRef(null)
  const [sendingDMImg, setSendingDMImg] = useState(false)
  const [selectedDMMsg, setSelectedDMMsg] = useState(null)
  const [editingDMMsg, setEditingDMMsg] = useState(null)
  const [editDMText, setEditDMText] = useState('')
  const [dmReplyTo, setDmReplyTo] = useState(null)
  const dmLongPressTimer = useRef(null)`
);

// Add DM edit/delete functions near sendDMImage
code = code.replace(
  `  const sendDMImage = async(file)=>{`,
  `  const handleDMLongPress = (msg) => {
    dmLongPressTimer.current = setTimeout(()=>setSelectedDMMsg(msg), 500)
  }
  const handleDMPressEnd = () => clearTimeout(dmLongPressTimer.current)

  const deleteDMMsg = async(msg) => {
    setSelectedDMMsg(null)
    await supabase.from('messages').delete().eq('id',msg.id).eq('sender_id',currentUser.id)
    setMessages(prev=>prev.filter(m=>m.id!==msg.id))
  }

  const saveDMEdit = async() => {
    if(!editDMText.trim()) return
    await supabase.from('messages').update({content:editDMText.trim()}).eq('id',editingDMMsg).eq('sender_id',currentUser.id)
    setMessages(prev=>prev.map(m=>m.id===editingDMMsg?{...m,content:editDMText.trim()}:m))
    setEditingDMMsg(null); setEditDMText('')
  }

  const sendDMImage = async(file)=>{`
);

// Replace DM message render with long press + edit/reply support
code = code.replace(
  `              {messages.map(msg=>{
                const own = msg.sender_id===currentUser.id
                return(<div key={msg.id} style={{display:'flex',justifyContent:own?'flex-end':'flex-start',gap:8,alignItems:'flex-end'}}>
                  {!own&&<Avatar url={msg.sender?.avatar_url} name={msg.sender?.display_name} color={msg.sender?.avatar_color||'#5B9CF6'} size={28}/>}
                  <div style={{maxWidth:'75%',padding:msg.image_url?'6px':'11px 15px',borderRadius:own?'20px 20px 5px 20px':'20px 20px 20px 5px',background:own?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.09)',color:'#fff',fontSize:15,lineHeight:1.5,wordBreak:'break-word',overflow:'hidden'}}>
                    {msg.image_url?<img src={msg.image_url} style={{maxWidth:220,maxHeight:220,borderRadius:14,display:'block'}} alt="img"/>:msg.content}
                    <div style={{fontSize:10,color:own?'rgba(255,255,255,0.45)':'#444',marginTop:4,textAlign:'right',padding:msg.image_url?'0 8px 6px':'0'}}>{timeAgo(msg.created_at)}</div>
                  </div>
                </div>)
              })}`,
  `              {selectedDMMsg&&<div onClick={()=>setSelectedDMMsg(null)} style={{position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-end'}}>
                <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'#1a1d26',borderRadius:'20px 20px 0 0',padding:'16px 0 32px'}}>
                  <div style={{width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.15)',margin:'0 auto 16px'}}/>
                  <div style={{padding:'0 8px',display:'flex',justifyContent:'center',gap:8,marginBottom:16}}>
                    {['👍','❤️','😂','😮','😢','🔥','👏','💯'].map(e=>(
                      <button key={e} onClick={async()=>{
                        await supabase.from('messages').update({content:selectedDMMsg.content+' '+e}).eq('id',selectedDMMsg.id)
                        setMessages(prev=>prev.map(m=>m.id===selectedDMMsg.id?{...m,content:m.content+' '+e}:m))
                        setSelectedDMMsg(null)
                      }} style={{background:'rgba(255,255,255,0.08)',border:'none',borderRadius:12,padding:'8px',fontSize:22,cursor:'pointer'}}>{e}</button>
                    ))}
                  </div>
                  <button onClick={()=>{setDmReplyTo(selectedDMMsg.sender?.display_name+': '+selectedDMMsg.content?.slice(0,50));setSelectedDMMsg(null)}} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'#fff',fontSize:15,cursor:'pointer',textAlign:'left'}}>↩ Reply</button>
                  {selectedDMMsg.sender_id===currentUser.id&&<>
                    <button onClick={()=>{setEditingDMMsg(selectedDMMsg.id);setEditDMText(selectedDMMsg.content);setSelectedDMMsg(null)}} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'#5B9CF6',fontSize:15,cursor:'pointer',textAlign:'left'}}>✏️ Edit</button>
                    <button onClick={()=>deleteDMMsg(selectedDMMsg)} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'#FF4757',fontSize:15,cursor:'pointer',textAlign:'left'}}>🗑️ Delete</button>
                  </>}
                </div>
              </div>}
              {messages.map(msg=>{
                const own = msg.sender_id===currentUser.id
                return(<div key={msg.id} style={{display:'flex',justifyContent:own?'flex-end':'flex-start',gap:8,alignItems:'flex-end'}}
                  onTouchStart={()=>handleDMLongPress(msg)}
                  onTouchEnd={handleDMPressEnd}
                  onMouseDown={()=>handleDMLongPress(msg)}
                  onMouseUp={handleDMPressEnd}>
                  {!own&&<Avatar url={msg.sender?.avatar_url} name={msg.sender?.display_name} color={msg.sender?.avatar_color||'#5B9CF6'} size={28}/>}
                  <div style={{maxWidth:'75%'}}>
                    {msg.reply_to&&<div style={{background:'rgba(255,255,255,0.05)',borderLeft:'3px solid #5B9CF6',borderRadius:8,padding:'6px 10px',marginBottom:4,fontSize:12,color:'#888'}}>↩ {msg.reply_to}</div>}
                    {editingDMMsg===msg.id?(
                      <div style={{display:'flex',gap:6}}>
                        <input value={editDMText} onChange={e=>setEditDMText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveDMEdit()} style={{flex:1,background:'rgba(255,255,255,0.1)',border:'1px solid #5B9CF6',borderRadius:16,padding:'8px 12px',color:'#fff',fontSize:14,outline:'none'}}/>
                        <button onClick={saveDMEdit} style={{background:'#5B9CF6',border:'none',borderRadius:16,padding:'8px 12px',color:'#fff',cursor:'pointer'}}>✓</button>
                        <button onClick={()=>setEditingDMMsg(null)} style={{background:'rgba(255,255,255,0.1)',border:'none',borderRadius:16,padding:'8px 12px',color:'#fff',cursor:'pointer'}}>✕</button>
                      </div>
                    ):(
                      <div style={{padding:msg.image_url?'6px':'11px 15px',borderRadius:own?'20px 20px 5px 20px':'20px 20px 20px 5px',background:own?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.09)',color:'#fff',fontSize:15,lineHeight:1.5,wordBreak:'break-word',overflow:'hidden'}}>
                        {msg.image_url?<img src={msg.image_url} style={{maxWidth:220,maxHeight:220,borderRadius:14,display:'block'}} alt="img"/>:msg.content}
                        <div style={{fontSize:10,color:own?'rgba(255,255,255,0.45)':'#444',marginTop:4,textAlign:'right',padding:msg.image_url?'0 8px 6px':'0'}}>{timeAgo(msg.created_at)}</div>
                      </div>
                    )}
                  </div>
                </div>)
              })}`
);

// Add reply indicator and dmReplyTo to DM input
code = code.replace(
  `            <div style={{position:'sticky',bottom:0,background:'#090B10',padding:'10px 14px 24px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,alignItems:'center'}}>
              <input ref={dmImgRef} type="file" accept="image/*" onChange={e=>sendDMImage(e.target.files[0])} style={{display:'none'}}/>
              <button onClick={()=>dmImgRef.current?.click()} disabled={sendingDMImg} style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'none',cursor:'pointer',color:'#888',fontSize:18,flexShrink:0}}>{sendingDMImg?'⏳':'🖼️'}</button>
              <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Message..." style={{...inp,flex:1,borderRadius:26,marginBottom:0,padding:'12px 18px'}}/>
              <button onClick={sendMsg} disabled={!msgText.trim()} style={{width:46,height:46,borderRadius:'50%',background:msgText.trim()?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.06)',border:'none',cursor:msgText.trim()?'pointer':'not-allowed',color:msgText.trim()?'#fff':'#333',fontSize:20,flexShrink:0}}>→</button>`,
  `            <div style={{position:'sticky',bottom:0,background:'#090B10',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              {dmReplyTo&&<div style={{padding:'8px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <span style={{color:'#888',fontSize:12}}>↩ <span style={{color:'#5B9CF6'}}>{dmReplyTo}</span></span>
                <button onClick={()=>setDmReplyTo(null)} style={{background:'none',border:'none',color:'#555',cursor:'pointer'}}>✕</button>
              </div>}
              <div style={{padding:'10px 14px 24px',display:'flex',gap:10,alignItems:'center'}}>
              <input ref={dmImgRef} type="file" accept="image/*" onChange={e=>sendDMImage(e.target.files[0])} style={{display:'none'}}/>
              <button onClick={()=>dmImgRef.current?.click()} disabled={sendingDMImg} style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'none',cursor:'pointer',color:'#888',fontSize:18,flexShrink:0}}>{sendingDMImg?'⏳':'🖼️'}</button>
              <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder={dmReplyTo?'Reply...':'Message...'} style={{...inp,flex:1,borderRadius:26,marginBottom:0,padding:'12px 18px'}}/>
              <button onClick={sendMsg} disabled={!msgText.trim()} style={{width:46,height:46,borderRadius:'50%',background:msgText.trim()?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.06)',border:'none',cursor:msgText.trim()?'pointer':'not-allowed',color:msgText.trim()?'#fff':'#333',fontSize:20,flexShrink:0}}>→</button>
              </div>`
);

// Update sendMsg in SphereApp to include dmReplyTo
code = code.replace(
  `  const sendMsg = async()=>{
    if(!msgText.trim()||!conv?.id) return
    const content=msgText.trim(); setMsgText('')
    const tmp={id:'tmp'+Date.now(),sender_id:currentUser.id,content,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    await supabase.from('messages').insert({conversation_id:conv.id,sender_id:currentUser.id,content})
  }`,
  `  const sendMsg = async()=>{
    if(!msgText.trim()||!selectedConv?.id) return
    const content=msgText.trim()
    const reply = dmReplyTo
    setMsgText(''); setDmReplyTo(null)
    const tmp={id:'tmp'+Date.now(),sender_id:currentUser.id,content,reply_to:reply,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content,reply_to:reply})
  }`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
