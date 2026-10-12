const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

code = code.replace(
  `        <div style={{display:'flex',alignItems:'center',gap:8}}>

          <button onClick={()=>setShowOmniCore(true)} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:16,padding:'5px 10px',cursor:'pointer',color:'#fff',fontSize:12,fontWeight:700}}>🤖 AI</button>
<button onClick={()=>setShowSettings(true)} style={{background:'none',border:'none',cursor:'pointer',color:'#666',fontSize:22}}>⚙️</button>
        </div>`,
  `        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button onClick={()=>setShowOmniCore(true)} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:16,padding:'5px 10px',cursor:'pointer',color:'#fff',fontSize:12,fontWeight:700}}>🤖 AI</button>
          <button onClick={()=>setShowSettings(true)} style={{background:'none',border:'none',cursor:'pointer',color:'#666',fontSize:22}}>⚙️</button>
        </div>`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
