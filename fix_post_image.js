const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add compose image state
code = code.replace(
  `  const [composeText, setComposeText] = useState('')`,
  `  const [composeText, setComposeText] = useState('')
  const [composeImage, setComposeImage] = useState(null)
  const [composeImageUrl, setComposeImageUrl] = useState(null)
  const composeImgRef = useRef(null)`
);

// Update sendPost to handle image
code = code.replace(
  `  const sendPost = async() => {
    if(!composeText.trim()) return
    const {data} = await supabase.from('posts').insert({user_id:currentUser.id,content:composeText.trim()}).select('*,author:profiles(*),likes(user_id),reposts(user_id),comments(id)').single()`,
  `  const sendPost = async() => {
    if(!composeText.trim()&&!composeImage) return
    let imageUrl = null
    if(composeImage) {
      const ext = composeImage.name.split('.').pop()
      const path = 'posts/'+currentUser.id+'_'+Date.now()+'.'+ext
      const {error} = await supabase.storage.from('avatars').upload(path,composeImage,{upsert:false})
      if(!error) { const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path); imageUrl = urlData.publicUrl }
    }
    const {data} = await supabase.from('posts').insert({user_id:currentUser.id,content:composeText.trim(),image_url:imageUrl}).select('*,author:profiles(*),likes(user_id),reposts(user_id),comments(id)').single()`
);

// Clear compose image after post
code = code.replace(
  `    if(data){setPosts(p=>[{...data,likes_count:0,reposts_count:0,comments_count:0,user_liked:false,user_reposted:false},...p]);setComposeText('');setShowCompose(false)}`,
  `    if(data){setPosts(p=>[{...data,likes_count:0,reposts_count:0,comments_count:0,user_liked:false,user_reposted:false},...p]);setComposeText('');setComposeImage(null);setComposeImageUrl(null);setShowCompose(false)}`
);

// Update compose UI to include image picker and preview
code = code.replace(
  `          <div style={{display:'flex',gap:12}}>
            <Avatar url={avatarUrl} name={currentUser?.display_name} color={color} size={42}/>
            <div style={{flex:1}}>
              <textarea value={composeText} onChange={e=>setComposeText(e.target.value)} placeholder="What's happening around the world?" autoFocus rows={4} style={{width:'100%',background:'transparent',border:'none',color:'#fff',fontSize:17,resize:'none',outline:'none',lineHeight:1.6,fontFamily:'sans-serif'}}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.07)'}}>
                <span style={{color:composeText.length>250?'#FF4757':'#444',fontSize:13}}>{280-composeText.length}</span>
                <button onClick={sendPost} disabled={!composeText.trim()} style={{background:composeText.trim()?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.07)',border:'none',borderRadius:24,padding:'10px 26px',color:composeText.trim()?'#fff':'#444',fontWeight:700,fontSize:14,cursor:composeText.trim()?'pointer':'not-allowed'}}>Sphere it</button>
              </div>
            </div>
          </div>`,
  `          <div style={{display:'flex',gap:12}}>
            <Avatar url={avatarUrl} name={currentUser?.display_name} color={color} size={42}/>
            <div style={{flex:1}}>
              <textarea value={composeText} onChange={e=>setComposeText(e.target.value)} placeholder="What's happening around the world?" autoFocus rows={3} style={{width:'100%',background:'transparent',border:'none',color:'#fff',fontSize:17,resize:'none',outline:'none',lineHeight:1.6,fontFamily:'sans-serif'}}/>
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
                <button onClick={sendPost} disabled={!composeText.trim()&&!composeImage} style={{background:(composeText.trim()||composeImage)?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.07)',border:'none',borderRadius:24,padding:'10px 26px',color:(composeText.trim()||composeImage)?'#fff':'#444',fontWeight:700,fontSize:14,cursor:(composeText.trim()||composeImage)?'pointer':'not-allowed'}}>Sphere it</button>
              </div>
            </div>
          </div>`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
