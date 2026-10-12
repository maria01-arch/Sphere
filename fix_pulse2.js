const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Fix 1: Header div closing tag
code = code.replace(
  `        <div style={{display:'flex',alignItems:'center',gap:8}}>
        <button onClick={()=>window.location.reload()} style={{background:'none',border:'none',cursor:'pointer',color:'#666',fontSize:20}}>🔄</button>
        <button onClick={()=>setShowSettings(true)} style={{background:'none',border:'none',cursor:'pointer',color:'#666',fontSize:22}}>⚙️</button>
      </div>
      </div>`,
  `        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button onClick={()=>window.location.reload()} style={{background:'none',border:'none',cursor:'pointer',color:'#666',fontSize:20}}>🔄</button>
          <button onClick={()=>setShowSettings(true)} style={{background:'none',border:'none',cursor:'pointer',color:'#666',fontSize:22}}>⚙️</button>
        </div>
      </div>`
);

// Fix 2: Show ALL user's own pulses, not just most recent one
code = code.replace(
  `supabase.from('pulses').select('*,author:profiles(id,display_name,username,avatar_url,avatar_color)').eq('user_id',currentUser.id).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(1).maybeSingle()`,
  `supabase.from('pulses').select('*,author:profiles(id,display_name,username,avatar_url,avatar_color)').eq('user_id',currentUser.id).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false})`
);

// Fix 3: Update setMyPulse to handle array
code = code.replace(
  `setGroups(g||[])
    setPulses((p||[]).filter(x=>x.user_id!==currentUser.id))
    setMyPulse(mp)`,
  `setGroups(g||[])
    setPulses((p||[]).filter(x=>x.user_id!==currentUser.id))
    setMyPulse(mp||[])`
);

// Fix 4: Update myPulse state to array
code = code.replace(
  `  const [myPulse, setMyPulse] = useState(null)`,
  `  const [myPulse, setMyPulse] = useState([])`
);

// Fix 5: Update createPulse to add to array
code = code.replace(
  `    if(data) { setMyPulse(data); setPulseText(''); setShowCreatePulse(false) }`,
  `    if(data) { setMyPulse(prev=>[data,...(Array.isArray(prev)?prev:[])].filter(Boolean)); setPulseText(''); setShowCreatePulse(false) }`
);

// Fix 6: Replace My Pulse section to show all own pulses with delete
code = code.replace(
  `        {myPulse&&<div onClick={()=>setViewingPulse({...myPulse,author:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}})} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,cursor:'pointer',flexShrink:0}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:myPulse.bg_color||'#5B9CF6',border:'3px solid #00C9A7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:'#fff'}}>⚡</div>
          <span style={{color:'#ccc',fontSize:11}}>My Pulse</span>
        </div>}`,
  `        {(Array.isArray(myPulse)?myPulse:[]).map(mp=>(
          <div key={mp.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flexShrink:0,position:'relative'}}>
            <div onClick={()=>setViewingPulse({...mp,author:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}})} style={{width:64,height:64,borderRadius:'50%',background:mp.bg_color||'#5B9CF6',border:'3px solid #00C9A7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:'#fff',cursor:'pointer'}}>⚡</div>
            <button onClick={async(e)=>{e.stopPropagation();await supabase.from('pulses').delete().eq('id',mp.id);setMyPulse(prev=>prev.filter(p=>p.id!==mp.id))}} style={{position:'absolute',top:-4,right:-4,width:20,height:20,borderRadius:'50%',background:'#FF4757',border:'none',color:'#fff',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            <span style={{color:'#ccc',fontSize:11}}>My Pulse</span>
          </div>
        ))}`
);

// Fix 7: Auto-scroll in pulse viewer - add useEffect
code = code.replace(
  `  if(viewingPulse) return (
    <div style={{position:'fixed',inset:0,zIndex:300,background:viewingPulse.bg_color||'#090B10',display:'flex',flexDirection:'column'}}>`,
  `  if(viewingPulse) return (
    <div style={{position:'fixed',inset:0,zIndex:300,background:viewingPulse.bg_color||'#090B10',display:'flex',flexDirection:'column'}} onAnimationEnd={()=>{setTimeout(()=>{const allPulses=[...myPulse,...pulses];const idx=allPulses.findIndex(p=>p.id===viewingPulse.id);if(idx<allPulses.length-1)setViewingPulse(allPulses[idx+1]);else setViewingPulse(null)},5000)}}>
    <style>{'@keyframes shrink{from{width:100%}to{width:0%}}'}</style>`
);

// Fix 8: Progress bar animation triggers auto advance
code = code.replace(
  `<div style={{height:'100%',background:'#fff',borderRadius:2,animation:'progress 5s linear forwards'}}/>`,
  `<div style={{height:'100%',background:'#fff',borderRadius:2,animation:'shrink 5s linear forwards'}} onAnimationEnd={()=>{const allPulses=[...(Array.isArray(myPulse)?myPulse:[]),...pulses];const idx=allPulses.findIndex(p=>p.id===viewingPulse.id);if(idx<allPulses.length-1)setViewingPulse(allPulses[idx+1]);else setViewingPulse(null)}}/>`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
