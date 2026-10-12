const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Fix: nav disappears after visiting pulse - viewingPulse check has a bug
// The current code does: if(viewingPulse) { onHideNav(true) } if(viewingPulse) return (
// This runs onHideNav every render when viewingPulse is set, causing issues
// Replace with proper conditional
code = code.replace(
  `  if(viewingPulse) { onHideNav&&onHideNav(true) } if(viewingPulse) return (`,
  `  if(viewingPulse) return (`
);

// Fix viewingGroup - don't call onHideNav during render, use useEffect instead
code = code.replace(
  `  if(viewingGroup) { onHideNav&&onHideNav(true); return <GroupChat group={viewingGroup} currentUser={currentUser} supabase={supabase} onBack={()=>{setViewingGroup(null);onHideNav&&onHideNav(false)}} onUserClick={onUserClick}/> }`,
  `  if(viewingGroup) return <GroupChat group={viewingGroup} currentUser={currentUser} supabase={supabase} onBack={()=>{setViewingGroup(null);onHideNav&&onHideNav(false)}} onUserClick={onUserClick}/>`
);

// Use useEffect to handle nav hiding based on state
code = code.replace(
  `  useEffect(()=>{ loadAll() },[])
  useEffect(()=>{
    if(autoOpenGroup){setViewingGroup(autoOpenGroup);if(onAutoOpenDone)onAutoOpenDone()}
  },[autoOpenGroup])`,
  `  useEffect(()=>{ loadAll() },[])
  useEffect(()=>{
    if(autoOpenGroup){setViewingGroup(autoOpenGroup);if(onAutoOpenDone)onAutoOpenDone()}
  },[autoOpenGroup])
  useEffect(()=>{
    onHideNav&&onHideNav(!!(viewingGroup||viewingPulse||showCreatePulse||showCreateGroup))
  },[viewingGroup,viewingPulse,showCreatePulse,showCreateGroup])`
);

// Also fix stateRef to include hideNav for back button
code = code.replace(
  `    stateRef.current = {viewingUser,showMyProfile,showSettings,tab,dmView}`,
  `    stateRef.current = {viewingUser,showMyProfile,showSettings,tab,dmView,hideNav}`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
