const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add refresh button to the main header next to settings
code = code.replace(
  `<button onClick={()=>setShowSettings(true)} style={{background:'none',border:'none',cursor:'pointer',color:'#666',fontSize:22}}>⚙️</button>`,
  `<div style={{display:'flex',alignItems:'center',gap:8}}>
        <button onClick={()=>window.location.reload()} style={{background:'none',border:'none',cursor:'pointer',color:'#666',fontSize:20}}>🔄</button>
        <button onClick={()=>setShowSettings(true)} style={{background:'none',border:'none',cursor:'pointer',color:'#666',fontSize:22}}>⚙️</button>
      </div>`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
