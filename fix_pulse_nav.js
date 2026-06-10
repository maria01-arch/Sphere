const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Replace the entire viewingPulse viewer with proper navigation
code = code.replace(
  `  if(viewingPulse) return (
    <div style={{position:'fixed',inset:0,zIndex:300,background:viewingPulse.bg_color||'#090B10',display:'flex',flexDirection:'column'}} onAnimationEnd={()=>{setTimeout(()=>{const allPulses=[...myPulse,...pulses];const idx=allPulses.findIndex(p=>p.id===viewingPulse.id);if(idx<allPulses.length-1)setViewingPulse(allPulses[idx+1]);else setViewingPulse(null)},5000)}}>
    <style>{'@keyframes shrink{from{width:100%}to{width:0%}}'}</style>
      <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'rgba(255,255,255,0.2)',borderRadius:2}}>
        <div style={{height:'100%',background:'#fff',borderRadius:2,animation:'shrink 5s linear forwards'}} onAnimationEnd={()=>{const allPulses=[...(Array.isArray(myPulse)?myPulse:[]),...pulses];const idx=allPulses.findIndex(p=>p.id===viewingPulse.id);if(idx<allPulses.length-1)setViewingPulse(allPulses[idx+1]);else setViewingPulse(null)}}/>
      </div>`,
  `  if(viewingPulse) {
    const allPulses=[...(Array.isArray(myPulse)?myPulse:[]),...pulses]
    const currentIdx=allPulses.findIndex(p=>p.id===viewingPulse.id)
    const goNext=()=>{ if(currentIdx<allPulses.length-1)setViewingPulse(allPulses[currentIdx+1]); else{setViewingPulse(null);onHideNav&&onHideNav(false)} }
    const goPrev=()=>{ if(currentIdx>0)setViewingPulse(allPulses[currentIdx-1]) }
  return (
    <div style={{position:'fixed',inset:0,zIndex:300,background:viewingPulse.bg_color||'#090B10',display:'flex',flexDirection:'column'}}>
    <style>{'@keyframes shrink{from{width:100%}to{width:0%}}'}</style>
      <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',gap:2,padding:'4px 8px',zIndex:10}}>
        {allPulses.map((p,i)=>(
          <div key={p.id} style={{flex:1,height:3,borderRadius:2,background:'rgba(255,255,255,0.2)',overflow:'hidden'}}>
            <div style={{height:'100%',background:'#fff',borderRadius:2,animation:i===currentIdx?'shrink 5s linear forwards':'none',width:i<currentIdx?'100%':'0%'}} onAnimationEnd={goNext}/>
          </div>
        ))}
      </div>`
);

// Fix closing of viewingPulse return - add tap zones and close the extra brace
code = code.replace(
  `      <div style={{padding:'0 16px 40px',display:'flex',gap:10}}>
        <button onClick={()=>onUserClick(viewingPulse.author)} style={{flex:1,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:24,padding:'12px',color:'#fff',fontWeight:700,cursor:'pointer'}}>View Profile</button>
      </div>
    </div>
  )`,
  `      <div style={{position:'absolute',top:60,left:0,bottom:80,width:'40%'}} onClick={goPrev}/>
      <div style={{position:'absolute',top:60,right:0,bottom:80,width:'40%'}} onClick={goNext}/>
      <div style={{padding:'0 16px 40px',display:'flex',gap:10}}>
        <button onClick={()=>onUserClick(viewingPulse.author)} style={{flex:1,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:24,padding:'12px',color:'#fff',fontWeight:700,cursor:'pointer'}}>View Profile</button>
      </div>
    </div>
  )}` 
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
