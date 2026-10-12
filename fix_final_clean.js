const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// 1. Add showLocalNotif function and global listener to SphereApp
code = code.replace(
  `  const handleSignOut = async() => { await supabase.auth.signOut(); window.location.href='/auth' }`,
  `  const showLocalNotif = (title, body) => {
    try {
      if(typeof Notification === 'undefined') return
      if(Notification.permission !== 'granted') return
      setTimeout(()=>{ new Notification(title, {body, icon:'/icon-192.png', tag:Date.now().toString()}) }, 100)
    } catch(e){ console.log('notif error:',e) }
  }

  const handleSignOut = async() => { await supabase.auth.signOut(); window.location.href='/auth' }`
);

// 2. Add global realtime listener
code = code.replace(
  `  useEffect(()=>{
    const presenceChannel = supabase.channel('online_users')`,
  `  useEffect(()=>{
    // Request notification permission
    if(typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    // Global DM notifications
    supabase.from('conversation_participants').select('conversation_id').eq('user_id',currentUser.id).then(({data:convs})=>{
      if(!convs?.length) return
      convs.forEach(({conversation_id})=>{
        supabase.channel('dm_notif_'+conversation_id)
          .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'conversation_id=eq.'+conversation_id},async(payload)=>{
            if(payload.new.sender_id===currentUser.id) return
            const {data:sender} = await supabase.from('profiles').select('display_name').eq('id',payload.new.sender_id).single()
            showLocalNotif('💬 '+(sender?.display_name||'Someone'), payload.new.content?.slice(0,80)||'Sent you a message')
          }).subscribe()
      })
    })
    // Global notification alerts
    supabase.channel('global_notifs_'+currentUser.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+currentUser.id},async(payload)=>{
        const {data:actor} = await supabase.from('profiles').select('display_name').eq('id',payload.new.actor_id).single()
        const info = {like:'❤️ liked your post',comment:'💬 commented on your post',follow:'👤 started following you',repost:'🔁 reposted your sphere'}
        showLocalNotif('🌐 Sphere', (actor?.display_name||'Someone')+' '+(info[payload.new.type]||'sent you a notification'))
      }).subscribe()
  },[])

  useEffect(()=>{
    const presenceChannel = supabase.channel('online_users')`
);

// 3. Fix image posting
code = code.replace(
  `  const sendPost = async() => {
    if(!composeText.trim()) return
    const {data} = await supabase.from('posts').insert({user_id:currentUser.id,content:composeText.trim()}).select('*,author:profiles(*),likes(user_id),reposts(user_id),comments(id)').single()`,
  `  const sendPost = async() => {
    if(!composeText.trim()&&!composeImage) return
    let imageUrl = null
    if(composeImage) {
      const ext = composeImage.name.split('.').pop().toLowerCase()
      const path = 'posts/'+currentUser.id+'_'+Date.now()+'.'+ext
      const {error} = await supabase.storage.from('avatars').upload(path,composeImage,{upsert:true,contentType:composeImage.type})
      if(error){alert('Image upload failed: '+error.message);return}
      const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
      imageUrl = urlData.publicUrl
    }
    const {data} = await supabase.from('posts').insert({user_id:currentUser.id,content:composeText.trim(),image_url:imageUrl}).select('*,author:profiles(*),likes(user_id),reposts(user_id),comments(id)').single()`
);

// 4. Clear image after post
code = code.replace(
  `    if(data){setPosts(p=>[{...data,likes_count:0,reposts_count:0,comments_count:0,user_liked:false,user_reposted:false},...p]);setComposeText('');setShowCompose(false)}`,
  `    if(data){setPosts(p=>[{...data,likes_count:0,reposts_count:0,comments_count:0,user_liked:false,user_reposted:false},...p]);setComposeText('');setComposeImage(null);setComposeImageUrl(null);setShowCompose(false)}`
);

// 5. Add image states
code = code.replace(
  `  const [composeText, setComposeText] = useState('')`,
  `  const [composeText, setComposeText] = useState('')
  const [composeImage, setComposeImage] = useState(null)
  const [composeImageUrl, setComposeImageUrl] = useState(null)
  const composeImgRef = useRef(null)`
);

// 6. Add image picker to compose UI
code = code.replace(
  `              <textarea value={composeText} onChange={e=>setComposeText(e.target.value)} placeholder="What's happening around the world?" autoFocus rows={4} style={{width:'100%',background:'transparent',border:'none',color:'#fff',fontSize:17,resize:'none',outline:'none',lineHeight:1.6,fontFamily:'sans-serif'}}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.07)'}}>
                <span style={{color:composeText.length>250?'#FF4757':'#444',fontSize:13}}>{280-composeText.length}</span>
                <button onClick={sendPost} disabled={!composeText.trim()} style={{background:composeText.trim()?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.07)',border:'none',borderRadius:24,padding:'10px 26px',color:composeText.trim()?'#fff':'#444',fontWeight:700,fontSize:14,cursor:composeText.trim()?'pointer':'not-allowed'}}>Sphere it</button>`,
  `              <textarea value={composeText} onChange={e=>setComposeText(e.target.value)} placeholder="What's happening around the world?" autoFocus rows={3} style={{width:'100%',background:'transparent',border:'none',color:'#fff',fontSize:17,resize:'none',outline:'none',lineHeight:1.6,fontFamily:'sans-serif'}}/>
              {composeImageUrl&&<div style={{position:'relative',marginBottom:8}}>
                <img src={composeImageUrl} style={{width:'100%',maxHeight:200,objectFit:'cover',borderRadius:12}} alt="preview"/>
                <button onClick={()=>{setComposeImage(null);setComposeImageUrl(null)}} style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,0.7)',border:'none',borderRadius:'50%',width:28,height:28,color:'#fff',cursor:'pointer',fontSize:14}}>✕</button>
              </div>}
              <input ref={composeImgRef} type="file" accept="image/*" onChange={e=>{const f=e.target.files[0];if(f){setComposeImage(f);setComposeImageUrl(URL.createObjectURL(f))}}} style={{display:'none'}}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.07)'}}>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <button onClick={()=>composeImgRef.current?.click()} style={{background:'none',border:'none',color:'#5B9CF6',cursor:'pointer',fontSize:22}}>🖼️</button>
                  <span style={{color:composeText.length>250?'#FF4757':'#444',fontSize:13}}>{280-composeText.length}</span>
                </div>
                <button onClick={sendPost} disabled={!composeText.trim()&&!composeImage} style={{background:(composeText.trim()||composeImage)?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.07)',border:'none',borderRadius:24,padding:'10px 26px',color:(composeText.trim()||composeImage)?'#fff':'#444',fontWeight:700,fontSize:14,cursor:(composeText.trim()||composeImage)?'pointer':'not-allowed'}}>Sphere it</button>`
);

// 7. Show image in PostCard
code = code.replace(
  `          <p style={{color:'#ddd',fontSize:15,lineHeight:1.65,marginBottom:12,wordBreak:'break-word'}}>{post.content}</p>
          <div style={{display:'flex'}}>`,
  `          {post.content&&<p style={{color:'#ddd',fontSize:15,lineHeight:1.65,marginBottom:12,wordBreak:'break-word'}}>{post.content}</p>}
          {post.image_url&&<img src={post.image_url} style={{width:'100%',borderRadius:12,marginBottom:12,maxHeight:400,objectFit:'cover'}} alt="post"/>}
          <div style={{display:'flex'}}>`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
