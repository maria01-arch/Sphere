const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

const adCard = `
function AdCard({ ad }) {
  return (
    <div onClick={()=>ad.link_url&&window.open(ad.link_url,'_blank')} style={{padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)',cursor:ad.link_url?'pointer':'default'}}>
      <div style={{display:'flex',gap:12}}>
        <div style={{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,#F7B731,#FF6B35)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:18,color:'#fff',flexShrink:0}}>{ad.advertiser_name?.[0]||'A'}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:2}}>
            <span style={{color:'#fff',fontWeight:700,fontSize:15}}>{ad.advertiser_name}</span>
            <span style={{background:'rgba(247,183,49,0.15)',border:'1px solid rgba(247,183,49,0.3)',borderRadius:6,padding:'1px 6px',fontSize:10,color:'#F7B731',fontWeight:700}}>Sponsored</span>
          </div>
          {ad.content&&<p style={{color:'#ddd',fontSize:15,lineHeight:1.6,marginBottom:10}}>{ad.content}</p>}
          {ad.image_url&&<img src={ad.image_url} style={{width:'100%',borderRadius:12,maxHeight:300,objectFit:'cover'}} alt="ad"/>}
          {ad.link_url&&<div style={{marginTop:10,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'8px 14px',display:'inline-block',color:'#5B9CF6',fontSize:13,fontWeight:700}}>Learn More →</div>}
        </div>
      </div>
    </div>
  )
}
`;

// Insert AdCard before PostCard
code = code.replace(
  `\nfunction PostCard(`,
  adCard + `\nfunction PostCard(`
);

// Add ads state to SphereAppInner
code = code.replace(
  `  const [posts, setPosts] = useState([])`,
  `  const [posts, setPosts] = useState([])
  const [ads, setAds] = useState([])`
);

// Load ads when loading posts - find loadPosts or similar
code = code.replace(
  `  const handleSignOut = async() => { await supabase.auth.signOut(); window.location.href='/auth' }`,
  `  const handleSignOut = async() => { await supabase.auth.signOut(); window.location.href='/auth' }

  useEffect(()=>{
    supabase.from('ads').select('*').eq('active',true).order('created_at',{ascending:false}).then(({data})=>setAds(data||[]))
  },[])`
);

// Inject ads into feed - replace the posts.map render to interleave ads every 4 posts
code = code.replace(
  `          {posts.map(post=><PostCard key={post.id} post={post} currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick} onDelete={deletePost}/>)}`,
  `          {posts.map((post,i)=>(
            <div key={post.id}>
              <PostCard post={post} currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick} onDelete={deletePost}/>
              {ads.length>0&&(i+1)%4===0&&<AdCard ad={ads[Math.floor(i/4)%ads.length]}/>}
            </div>
          ))}`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
