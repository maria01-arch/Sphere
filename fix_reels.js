const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

const reelsComponent = `
function ReelsView({ currentUser, supabase, onUserClick, onClose }) {
  const [reels, setReels] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [caption, setCaption] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [liked, setLiked] = useState({})
  const [likes, setLikes] = useState({})
  const [playing, setPlaying] = useState(true)
  const videoRef = useRef(null)
  const fileRef = useRef(null)
  const touchStart = useRef(null)

  useEffect(()=>{ loadReels() },[])
  useEffect(()=>{ if(videoRef.current){ videoRef.current.currentTime=0; playing?videoRef.current.play().catch(()=>{}):videoRef.current.pause() } },[currentIdx,playing])

  const loadReels = async() => {
    const {data} = await supabase.from('reels').select('*,author:profiles(id,display_name,username,avatar_url,avatar_color),reel_likes(user_id)').order('created_at',{ascending:false}).limit(20)
    if(!data) return
    setReels(data)
    const likedMap={}, likesMap={}
    data.forEach(r=>{ likedMap[r.id]=r.reel_likes?.some(l=>l.user_id===currentUser.id); likesMap[r.id]=r.reel_likes?.length||0 })
    setLiked(likedMap); setLikes(likesMap)
  }

  const toggleLike = async(reel) => {
    const isLiked = liked[reel.id]
    setLiked(p=>({...p,[reel.id]:!isLiked}))
    setLikes(p=>({...p,[reel.id]:(p[reel.id]||0)+(isLiked?-1:1)}))
    if(isLiked) await supabase.from('reel_likes').delete().eq('reel_id',reel.id).eq('user_id',currentUser.id)
    else await supabase.from('reel_likes').insert({reel_id:reel.id,user_id:currentUser.id})
  }

  const uploadReel = async() => {
    if(!videoFile) return
    setUploading(true)
    const ext = videoFile.name.split('.').pop()
    const path = 'reels/'+currentUser.id+'_'+Date.now()+'.'+ext
    const {error} = await supabase.storage.from('avatars').upload(path,videoFile,{upsert:false})
    if(error){alert('Upload failed: '+error.message);setUploading(false);return}
    const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
    const {data:reel} = await supabase.from('reels').insert({user_id:currentUser.id,video_url:urlData.publicUrl,caption:caption.trim()}).select('*,author:profiles(id,display_name,username,avatar_url,avatar_color)').single()
    if(reel){ setReels(prev=>[reel,...prev]); setLikes(p=>({...p,[reel.id]:0})); setLiked(p=>({...p,[reel.id]:false})) }
    setVideoFile(null); setCaption(''); setShowUpload(false); setUploading(false)
  }

  const deleteReel = async(reel) => {
    await supabase.from('reels').delete().eq('id',reel.id)
    const newReels = reels.filter(r=>r.id!==reel.id)
    setReels(newReels)
    if(currentIdx>=newReels.length) setCurrentIdx(Math.max(0,newReels.length-1))
  }

  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientY }
  const handleTouchEnd = (e) => {
    if(!touchStart.current) return
    const diff = touchStart.current - e.changedTouches[0].clientY
    if(Math.abs(diff)>50){ if(diff>0&&currentIdx<reels.length-1) setCurrentIdx(i=>i+1); else if(diff<0&&currentIdx>0) setCurrentIdx(i=>i-1) }
    touchStart.current = null
  }

  const reel = reels[currentIdx]

  if(showUpload) return (
    <div style={{position:'fixed',inset:0,zIndex:400,background:'#090B10',color:'#fff',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'16px',display:'flex',alignItems:'center',gap:12,borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        <button onClick={()=>setShowUpload(false)} style={{background:'none',border:'none',color:'#fff',fontSize:24,cursor:'pointer'}}>✕</button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>New Reel</span>
        <button onClick={uploadReel} disabled={!videoFile||uploading} style={{background:videoFile?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.1)',border:'none',borderRadius:20,padding:'8px 20px',color:'#fff',fontWeight:700,cursor:'pointer'}}>{uploading?'Uploading...':'Post'}</button>
      </div>
      <div style={{flex:1,padding:20,display:'flex',flexDirection:'column',gap:16}}>
        <div onClick={()=>fileRef.current?.click()} style={{height:200,background:'rgba(255,255,255,0.05)',border:'2px dashed rgba(255,255,255,0.15)',borderRadius:16,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',gap:8}}>
          {videoFile?<><span style={{fontSize:40}}>🎬</span><span style={{color:'#00C9A7',fontSize:14}}>{videoFile.name}</span></>:<><span style={{fontSize:40}}>📹</span><span style={{color:'#555',fontSize:14}}>Tap to select video</span></>}
        </div>
        <input ref={fileRef} type="file" accept="video/*" onChange={e=>setVideoFile(e.target.files[0])} style={{display:'none'}}/>
        <textarea value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Write a caption..." rows={3} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',resize:'none',fontFamily:'sans-serif'}}/>
      </div>
    </div>
  )

  return (
    <div style={{position:'fixed',inset:0,zIndex:400,background:'#000'}}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <button onClick={onClose} style={{position:'absolute',top:16,left:16,zIndex:10,background:'rgba(0,0,0,0.5)',border:'none',borderRadius:'50%',width:36,height:36,color:'#fff',fontSize:20,cursor:'pointer'}}>✕</button>
      <button onClick={()=>setShowUpload(true)} style={{position:'absolute',top:16,right:16,zIndex:10,background:'rgba(0,0,0,0.5)',border:'none',borderRadius:20,padding:'8px 14px',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>+ Reel</button>

      {reels.length===0&&<div style={{height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,color:'#fff'}}>
        <p style={{fontSize:48}}>🎬</p>
        <p style={{fontSize:18,fontWeight:700}}>No reels yet</p>
        <button onClick={()=>setShowUpload(true)} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:24,padding:'12px 28px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer'}}>Post First Reel</button>
      </div>}

      {reel&&<>
        <video ref={videoRef} src={reel.video_url} style={{width:'100%',height:'100%',objectFit:'cover'}} loop playsInline onClick={()=>setPlaying(p=>!p)} autoPlay muted={false}/>
        {!playing&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}><div style={{width:72,height:72,borderRadius:'50%',background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>▶️</div></div>}

        <div style={{position:'absolute',bottom:100,left:16,right:80,color:'#fff'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,cursor:'pointer'}} onClick={()=>onUserClick(reel.author)}>
            <Avatar url={reel.author?.avatar_url} name={reel.author?.display_name} color={reel.author?.avatar_color||'#5B9CF6'} size={36}/>
            <div>
              <div style={{fontWeight:700,fontSize:15,textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>{reel.author?.display_name}</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.7)'}}>@{reel.author?.username}</div>
            </div>
          </div>
          {reel.caption&&<p style={{fontSize:14,lineHeight:1.5,textShadow:'0 1px 4px rgba(0,0,0,0.8)',margin:0}}>{reel.caption}</p>}
        </div>

        <div style={{position:'absolute',bottom:120,right:12,display:'flex',flexDirection:'column',alignItems:'center',gap:20}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer'}} onClick={()=>toggleLike(reel)}>
            <span style={{fontSize:30}}>{liked[reel.id]?'❤️':'🤍'}</span>
            <span style={{color:'#fff',fontSize:13,fontWeight:700,textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>{likes[reel.id]||0}</span>
          </div>
          {reel.user_id===currentUser.id&&<div style={{cursor:'pointer'}} onClick={()=>deleteReel(reel)}>
            <span style={{fontSize:28}}>🗑️</span>
          </div>}
        </div>

        <div style={{position:'absolute',bottom:40,left:'50%',transform:'translateX(-50%)',display:'flex',gap:6}}>
          {reels.map((_,i)=><div key={i} style={{width:i===currentIdx?20:6,height:6,borderRadius:3,background:i===currentIdx?'#fff':'rgba(255,255,255,0.4)',transition:'width 0.2s'}}/>)}
        </div>
      </>}
    </div>
  )
}
`;

// Insert ReelsView before PulseTab
code = code.replace(
  `\nfunction PulseTab(`,
  reelsComponent + `\nfunction PulseTab(`
);

// Add reels state and button to PulseTab
code = code.replace(
  `  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showCreatePulse, setShowCreatePulse] = useState(false)`,
  `  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showCreatePulse, setShowCreatePulse] = useState(false)
  const [showReels, setShowReels] = useState(false)`
);

// Add ReelsView render in PulseTab
code = code.replace(
  `  if(viewingPulse) {`,
  `  if(showReels) return <ReelsView currentUser={currentUser} supabase={supabase} onUserClick={onUserClick} onClose={()=>{setShowReels(false);onHideNav&&onHideNav(false)}}/>

  if(viewingPulse) {`
);

// Add Reels button to Pulse header
code = code.replace(
  `      <div style={{padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontWeight:800,fontSize:18}}>Pulse ⚡</span>
        <button onClick={()=>setShowCreateGroup(true)} style={{background:'rgba(91,156,246,0.1)',border:'1px solid rgba(91,156,246,0.2)',borderRadius:12,padding:'6px 14px',color:'#5B9CF6',cursor:'pointer',fontWeight:700,fontSize:13}}>+ Group</button>
      </div>`,
  `      <div style={{padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontWeight:800,fontSize:18}}>Pulse ⚡</span>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>{setShowReels(true);onHideNav&&onHideNav(true)}} style={{background:'rgba(255,71,87,0.1)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:12,padding:'6px 14px',color:'#FF4757',cursor:'pointer',fontWeight:700,fontSize:13}}>🎬 Reels</button>
          <button onClick={()=>setShowCreateGroup(true)} style={{background:'rgba(91,156,246,0.1)',border:'1px solid rgba(91,156,246,0.2)',borderRadius:12,padding:'6px 14px',color:'#5B9CF6',cursor:'pointer',fontWeight:700,fontSize:13}}>+ Group</button>
        </div>
      </div>`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
