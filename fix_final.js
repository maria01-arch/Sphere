const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Fix 1: Show groupAvatar in group chat header
code = code.replace(
  `<div style={{width:38,height:38,borderRadius:12,background:group.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:18,color:'#fff'}}>{group.name[0]}</div>`,
  `<div style={{width:38,height:38,borderRadius:12,background:group.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:18,color:'#fff',overflow:'hidden'}}>
            {groupAvatar?<img src={groupAvatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:group.name[0]}
          </div>`
);

// Fix 2: Show groupAvatar in PulseTab group circles
code = code.replace(
  `<div style={{width:60,height:60,borderRadius:18,background:g.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:800,color:'#fff',border:g.group_members?.some(m=>m.user_id===currentUser.id)?'2px solid #5B9CF6':'2px solid transparent'}}>{g.name[0]}</div>`,
  `<div style={{width:60,height:60,borderRadius:18,background:g.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:800,color:'#fff',border:g.group_members?.some(m=>m.user_id===currentUser.id)?'2px solid #5B9CF6':'2px solid transparent',overflow:'hidden'}}>
              {g.avatar_url?<img src={g.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:g.name[0]}
            </div>`
);

// Fix 3: Back button - use refs to track current state
code = code.replace(
  `  useEffect(()=>{
    window.history.pushState(null,'',window.location.href)
    const handlePop = () => {
      window.history.pushState(null,'',window.location.href)
      if(viewingUser){setViewingUser(null);return}
      if(showMyProfile){setShowMyProfile(false);return}
      if(showSettings){setShowSettings(false);return}
    }
    window.addEventListener('popstate',handlePop)
    return()=>window.removeEventListener('popstate',handlePop)
  },[])`,
  `  const stateRef = useRef({})
  useEffect(()=>{
    stateRef.current = {viewingUser,showMyProfile,showSettings,tab,dmView}
  },[viewingUser,showMyProfile,showSettings,tab,dmView])

  useEffect(()=>{
    window.history.pushState(null,'',window.location.href)
    const handlePop = () => {
      window.history.pushState(null,'',window.location.href)
      const s = stateRef.current
      if(s.viewingUser){setViewingUser(null);return}
      if(s.showMyProfile){setShowMyProfile(false);return}
      if(s.showSettings){setShowSettings(false);return}
      if(s.dmView==='chat'){setDmView('list');setSelectedConv(null);return}
      if(s.tab!=='home'){setTab('home');return}
    }
    window.addEventListener('popstate',handlePop)
    return()=>window.removeEventListener('popstate',handlePop)
  },[])`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
