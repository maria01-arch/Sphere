const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Make sphere logo clickable to refresh, remove standalone refresh button
code = code.replace(
  `<span style={{fontWeight:800,fontSize:20,background:'linear-gradient(135deg,#5B9CF6,#845EF7)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>🌐 sphere</span>`,
  `<span onClick={()=>window.location.reload()} style={{fontWeight:800,fontSize:20,background:'linear-gradient(135deg,#5B9CF6,#845EF7)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',cursor:'pointer'}}>🌐 sphere</span>`
);

// Remove the refresh button
code = code.replace(
  `          <button onClick={()=>window.location.reload()} style={{background:'none',border:'none',cursor:'pointer',color:'#666',fontSize:20}}>🔄</button>
          `,
  ``
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
