const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add friendsSubTab state
code = code.replace(
  `  const [followed, setFollowed] = useState({})`,
  `  const [followed, setFollowed] = useState({})
  const [friendsSubTab, setFriendsSubTab] = useState('friends')`
);

// Replace the friends tab render
code = code.replace(
  `        {tab==='friends'&&<>
          <div style={{padding:'16px 16px 8px',fontWeight:800,fontSize:20}}>People 👥</div>
          <p style={{color:'#555',fontSize:14,padding:'0 16px 12px'}}>Discover people on Sphere</p>
          {people.map((u,i)=>(
            <div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
              <button onClick={()=>handleUserClick(u)} style={{background:'none',border:'none',padding:0,cursor:'pointer'}}>
                <Avatar url={u.avatar_url} name={u.display_name} color={u.avatar_color||COLORS[i%COLORS.length]} size={48}/>
              </button>
              <button onClick={()=>handleUserClick(u)} style={{flex:1,minWidth:0,background:'none',border:'none',cursor:'pointer',textAlign:'left',padding:0,color:'#fff'}}>
                <div style={{fontWeight:700,fontSize:15}}>{u.display_name}</div>
                <div style={{color:'#555',fontSize:13}}>@{u.username}</div>
                {u.bio&&<div style={{color:'#666',fontSize:12,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.bio}</div>}
              </button>
              <button onClick={()=>toggleFollow(u)} style={{background:followed[u.id]?'rgba(255,255,255,0.07)':'linear-gradient(135deg,#5B9CF6,#845EF7)',border:followed[u.id]?'1px solid rgba(255,255,255,0.12)':'none',borderRadius:20,padding:'8px 16px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0}}>
                {followed[u.id]?'Following':'Follow'}
              </button>
            </div>
          ))}
          {!people.length&&<p style={{padding:'40px',textAlign:'center',color:'#444'}}>No other users yet</p>}
        </>}`,
  `        {tab==='friends'&&<>
          <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.07)',position:'sticky',top:58,zIndex:5,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(12px)'}}>
            <button onClick={()=>setFriendsSubTab('friends')} style={{flex:1,padding:'14px 0',background:'none',border:'none',borderBottom:friendsSubTab==='friends'?'2px solid #5B9CF6':'2px solid transparent',color:friendsSubTab==='friends'?'#fff':'#555',fontWeight:friendsSubTab==='friends'?700:500,fontSize:14,cursor:'pointer'}}>👥 Friends</button>
            <button onClick={()=>setFriendsSubTab('explore')} style={{flex:1,padding:'14px 0',background:'none',border:'none',borderBottom:friendsSubTab==='explore'?'2px solid #5B9CF6':'2px solid transparent',color:friendsSubTab==='explore'?'#fff':'#555',fontWeight:friendsSubTab==='explore'?700:500,fontSize:14,cursor:'pointer'}}>🔭 Explore</button>
          </div>
          {friendsSubTab==='friends'&&<>
            {people.filter(u=>followed[u.id]).length===0&&<div style={{padding:'50px 20px',textAlign:'center'}}><p style={{fontSize:40}}>👥</p><p style={{color:'#555',marginTop:8}}>You are not following anyone yet</p><p style={{color:'#444',fontSize:13,marginTop:4}}>Go to Explore to find people</p></div>}
            {people.filter(u=>followed[u.id]).map((u,i)=>(
              <div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                <button onClick={()=>handleUserClick(u)} style={{background:'none',border:'none',padding:0,cursor:'pointer'}}>
                  <Avatar url={u.avatar_url} name={u.display_name} color={u.avatar_color||COLORS[i%COLORS.length]} size={48}/>
                </button>
                <button onClick={()=>handleUserClick(u)} style={{flex:1,minWidth:0,background:'none',border:'none',cursor:'pointer',textAlign:'left',padding:0,color:'#fff'}}>
                  <div style={{fontWeight:700,fontSize:15}}>{u.display_name}</div>
                  <div style={{color:'#555',fontSize:13}}>@{u.username}</div>
                  {u.bio&&<div style={{color:'#666',fontSize:12,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.bio}</div>}
                </button>
                <button onClick={()=>toggleFollow(u)} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:20,padding:'8px 16px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0}}>Following</button>
              </div>
            ))}
          </>}
          {friendsSubTab==='explore'&&<>
            <p style={{color:'#555',fontSize:13,padding:'12px 16px 4px'}}>People you might know</p>
            {people.filter(u=>!followed[u.id]).map((u,i)=>(
              <div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                <button onClick={()=>handleUserClick(u)} style={{background:'none',border:'none',padding:0,cursor:'pointer'}}>
                  <Avatar url={u.avatar_url} name={u.display_name} color={u.avatar_color||COLORS[i%COLORS.length]} size={48}/>
                </button>
                <button onClick={()=>handleUserClick(u)} style={{flex:1,minWidth:0,background:'none',border:'none',cursor:'pointer',textAlign:'left',padding:0,color:'#fff'}}>
                  <div style={{fontWeight:700,fontSize:15}}>{u.display_name}</div>
                  <div style={{color:'#555',fontSize:13}}>@{u.username}</div>
                  {u.bio&&<div style={{color:'#666',fontSize:12,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.bio}</div>}
                </button>
                <button onClick={()=>toggleFollow(u)} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:20,padding:'8px 16px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0}}>Follow</button>
              </div>
            ))}
            {!people.filter(u=>!followed[u.id]).length&&<p style={{padding:'40px',textAlign:'center',color:'#444'}}>You follow everyone on Sphere!</p>}
          </>}
        </>}`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
