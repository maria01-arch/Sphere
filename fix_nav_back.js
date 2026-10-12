const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Fix 1: Add hideNav state to SphereApp
code = code.replace(
  `  const [navVisible, setNavVisible] = useState(true)`,
  `  const [navVisible, setNavVisible] = useState(true)
  const [hideNav, setHideNav] = useState(false)`
);

// Fix 2: Hide nav when nav should be hidden OR in DM chat OR in group chat
code = code.replace(
  `transform:(navVisible&&!(tab==='messages'&&dmView==='chat'))?'translateX(-50%)':'translateX(-50%) translateY(100px)'`,
  `transform:(navVisible&&!(tab==='messages'&&dmView==='chat')&&!hideNav)?'translateX(-50%)':'translateX(-50%) translateY(100px)'`
);

// Fix 3: Pass setHideNav to PulseTab
code = code.replace(
  `{tab==='pulse'&&<PulseTab currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick} autoOpenGroup={autoOpenGroup} onAutoOpenDone={()=>setAutoOpenGroup(null)}/>}`,
  `{tab==='pulse'&&<PulseTab currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick} autoOpenGroup={autoOpenGroup} onAutoOpenDone={()=>setAutoOpenGroup(null)} onHideNav={setHideNav}/>}`
);

// Fix 4: Accept onHideNav in PulseTab
code = code.replace(
  `function PulseTab({ currentUser, supabase, onUserClick, autoOpenGroup, onAutoOpenDone }) {`,
  `function PulseTab({ currentUser, supabase, onUserClick, autoOpenGroup, onAutoOpenDone, onHideNav }) {`
);

// Fix 5: Hide nav when viewingGroup, show when back
code = code.replace(
  `  if(viewingGroup) return <GroupChat group={viewingGroup} currentUser={currentUser} supabase={supabase} onBack={()=>setViewingGroup(null)} onUserClick={onUserClick}/>`,
  `  if(viewingGroup) { onHideNav&&onHideNav(true); return <GroupChat group={viewingGroup} currentUser={currentUser} supabase={supabase} onBack={()=>{setViewingGroup(null);onHideNav&&onHideNav(false)}} onUserClick={onUserClick}/> }`
);

// Fix 6: Also hide nav for pulse viewer
code = code.replace(
  `  if(viewingPulse) return (`,
  `  if(viewingPulse) { onHideNav&&onHideNav(true) } if(viewingPulse) return (`
);

// Fix viewingPulse close button to show nav again
code = code.replace(
  `<button onClick={()=>setViewingPulse(null)} style={{background:'none',border:'none',color:'#fff',fontSize:24,cursor:'pointer'}}>✕</button>`,
  `<button onClick={()=>{setViewingPulse(null);onHideNav&&onHideNav(false)}} style={{background:'none',border:'none',color:'#fff',fontSize:24,cursor:'pointer'}}>✕</button>`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
