const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add ads loading to ReelsView
code = code.replace(
  `function ReelsView({ currentUser, supabase, onUserClick, onClose }) {
  const [reels, setReels] = useState([])`,
  `function ReelsView({ currentUser, supabase, onUserClick, onClose }) {
  const [reels, setReels] = useState([])
  const [reelAds, setReelAds] = useState([])`
);

// Load video ads
code = code.replace(
  `  useEffect(()=>{ loadReels() },[])`,
  `  useEffect(()=>{ loadReels() },[])
  useEffect(()=>{
    supabase.from('ads').select('*').eq('active',true).eq('type','reel').then(({data})=>setReelAds(data||[]))
  },[])`
);

// Mix ads into the reels array - modify loadReels to interleave
code = code.replace(
  `  const loadReels = async() => {
    const {data} = await supabase.from('reels').select('*,author:profiles(id,display_name,username,avatar_url,avatar_color),reel_likes(user_id)').order('created_at',{ascending:false}).limit(20)
    if(!data) return
    setReels(data)`,
  `  const loadReels = async() => {
    const {data} = await supabase.from('reels').select('*,author:profiles(id,display_name,username,avatar_url,avatar_color),reel_likes(user_id)').order('created_at',{ascending:false}).limit(20)
    if(!data) return
    setReels(data)`
);

// Modify reel variable to inject ad every 5 reels
code = code.replace(
  `  const reel = reels[currentIdx]`,
  `  const isAdSlot = reelAds.length>0 && (currentIdx+1)%5===0
  const currentAd = isAdSlot ? reelAds[Math.floor(currentIdx/5)%reelAds.length] : null
  const reel = reels[currentIdx]`
);

// Render ad reel when isAdSlot is true - insert before the regular reel&&<> block
code = code.replace(
  `      {reel&&<>
        <video ref={videoRef} src={reel.video_url}`,
  `      {isAdSlot&&currentAd&&<>
        <video src={currentAd.video_url} style={{width:'100%',height:'100%',objectFit:'cover'}} loop playsInline autoPlay muted={false}/>
        <div style={{position:'absolute',bottom:100,left:16,right:80,color:'#fff'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#F7B731,#FF6B35)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:'#fff'}}>{currentAd.advertiser_name?.[0]||'A'}</div>
            <div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <span style={{fontWeight:700,fontSize:15,textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>{currentAd.advertiser_name}</span>
                <span style={{background:'rgba(247,183,49,0.2)',border:'1px solid rgba(247,183,49,0.4)',borderRadius:6,padding:'1px 6px',fontSize:10,color:'#F7B731',fontWeight:700}}>Sponsored</span>
              </div>
            </div>
          </div>
          {currentAd.content&&<p style={{fontSize:14,lineHeight:1.5,textShadow:'0 1px 4px rgba(0,0,0,0.8)',margin:0}}>{currentAd.content}</p>}
          {currentAd.link_url&&<button onClick={()=>window.open(currentAd.link_url,'_blank')} style={{marginTop:10,background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:20,padding:'10px 20px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>Learn More</button>}
        </div>
        <div style={{position:'absolute',bottom:40,left:'50%',transform:'translateX(-50%)',display:'flex',gap:6}}>
          {reels.map((_,i)=><div key={i} style={{width:i===currentIdx?20:6,height:6,borderRadius:3,background:i===currentIdx?'#fff':'rgba(255,255,255,0.4)',transition:'width 0.2s'}}/>)}
        </div>
      </>}
      {!isAdSlot&&reel&&<>
        <video ref={videoRef} src={reel.video_url}`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
