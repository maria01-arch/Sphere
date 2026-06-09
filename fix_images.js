const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Fix 1: Non-members can't open group chat - check in joinGroup
code = code.replace(
  `  const joinGroup = async (group) => {
    const isMember = group.group_members?.some(m=>m.user_id===currentUser.id)
    if(isMember){setViewingGroup(group);return}
    if(group.join_mode==='open'){
      await supabase.from('group_members').insert({group_id:group.id,user_id:currentUser.id})
      setGroups(g=>g.map(x=>x.id===group.id?{...x,group_members:[...(x.group_members||[]),{user_id:currentUser.id}]}:x))
      setViewingGroup({...group,group_members:[...(group.group_members||[]),{user_id:currentUser.id}]})
    } else {
      const {error} = await supabase.from('group_join_requests').insert({group_id:group.id,user_id:currentUser.id})
      if(!error) alert('Join request sent! Waiting for admin approval.')
      else alert('Request already sent or you are already a member.')
    }
    loadAll()
  }`,
  `  const joinGroup = async (group) => {
    const isMember = group.group_members?.some(m=>m.user_id===currentUser.id)
    if(isMember){setViewingGroup(group);return}
    if(group.join_mode==='open'){
      await supabase.from('group_members').insert({group_id:group.id,user_id:currentUser.id})
      setGroups(g=>g.map(x=>x.id===group.id?{...x,group_members:[...(x.group_members||[]),{user_id:currentUser.id}]}:x))
      setViewingGroup({...group,group_members:[...(group.group_members||[]),{user_id:currentUser.id}]})
    } else {
      const {error} = await supabase.from('group_join_requests').insert({group_id:group.id,user_id:currentUser.id})
      if(!error) alert('Join request sent! Waiting for admin approval.')
      else alert('Request already sent.')
    }
    loadAll()
  }

  const tryOpenGroup = (group) => {
    const isMember = group.group_members?.some(m=>m.user_id===currentUser.id)
    if(!isMember){
      alert('You must join this group first to view it.')
      return
    }
    setViewingGroup(group)
  }`
);

// Fix 2: Add image upload state to GroupChat
code = code.replace(
  `  const [editName, setEditName] = useState(group.name)`,
  `  const [editName, setEditName] = useState(group.name)
  const [sendingImg, setSendingImg] = useState(false)
  const imgRef = useRef(null)`
);

// Fix 3: Add image send function to GroupChat before sendMsg
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
    setMsgText('')
    const tempMsg = {id:'temp_'+Date.now(),group_id:group.id,sender_id:currentUser.id,content:text,created_at:new Date().toISOString(),sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}}
    setMessages(prev=>[...prev,tempMsg])
    await supabase.from('group_messages').insert({group_id:group.id,sender_id:currentUser.id,content:text})
  }

  const sendImage = async (file) => {
    if(!file) return
    setSendingImg(true)
    const ext = file.name.split('.').pop()
    const path = 'chats/gc_'+group.id+'_'+Date.now()+'.'+ext
    const {error} = await supabase.storage.from('avatars').upload(path,file,{upsert:false})
    if(error){alert('Image upload failed: '+error.message);setSendingImg(false);return}
    const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
    const url = urlData.publicUrl
    const tempMsg = {id:'temp_img_'+Date.now(),group_id:group.id,sender_id:currentUser.id,content:'📷 [image]',image_url:url,created_at:new Date().toISOString(),sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}}
    setMessages(prev=>[...prev,tempMsg])
    await supabase.from('group_messages').insert({group_id:group.id,sender_id:currentUser.id,content:'📷',image_url:url})
    setSendingImg(false)
  }`
);

// Fix 4: Add image_url column display in group messages
code = code.replace(
  `                <div style={{padding:'11px 15px',borderRadius:own?'20px 20px 5px 20px':'20px 20px 20px 5px',background:own?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.09)',color:'#fff',fontSize:15,lineHeight:1.5,wordBreak:'break-word'}}>
                  {msg.content}
                  <div style={{fontSize:10,color:own?'rgba(255,255,255,0.45)':'#444',marginTop:4,textAlign:'right'}}>{timeAgo(msg.created_at)}</div>
                </div>`,
  `                <div style={{padding:msg.image_url?'6px':'11px 15px',borderRadius:own?'20px 20px 5px 20px':'20px 20px 20px 5px',background:own?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.09)',color:'#fff',fontSize:15,lineHeight:1.5,wordBreak:'break-word',overflow:'hidden'}}>
                  {msg.image_url?<img src={msg.image_url} style={{maxWidth:220,maxHeight:220,borderRadius:14,display:'block'}} alt="img"/>:msg.content}
                  <div style={{fontSize:10,color:own?'rgba(255,255,255,0.45)':'#444',marginTop:4,textAlign:'right',padding:msg.image_url?'0 8px 6px':'0'}}>{timeAgo(msg.created_at)}</div>
                </div>`
);

// Fix 5: Add image button to group chat input
code = code.replace(
  `        <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Message group..." style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:26,padding:'12px 18px',color:'#fff',fontSize:15,outline:'none',fontFamily:'sans-serif'}}/>
        <button onClick={sendMsg} disabled={!msgText.trim()} style={{width:46,height:46,borderRadius:'50%',background:msgText.trim()?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.06)',border:'none',cursor:msgText.trim()?'pointer':'not-allowed',color:msgText.trim()?'#fff':'#333',fontSize:20,flexShrink:0}}>→</button>`,
  `        <input ref={imgRef} type="file" accept="image/*" onChange={e=>sendImage(e.target.files[0])} style={{display:'none'}}/>
        <button onClick={()=>imgRef.current?.click()} disabled={sendingImg} style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'none',cursor:'pointer',color:'#888',fontSize:18,flexShrink:0}}>{sendingImg?'⏳':'🖼️'}</button>
        <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Message group..." style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:26,padding:'12px 18px',color:'#fff',fontSize:15,outline:'none',fontFamily:'sans-serif'}}/>
        <button onClick={sendMsg} disabled={!msgText.trim()} style={{width:46,height:46,borderRadius:'50%',background:msgText.trim()?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.06)',border:'none',cursor:msgText.trim()?'pointer':'not-allowed',color:msgText.trim()?'#fff':'#333',fontSize:20,flexShrink:0}}>→</button>`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
