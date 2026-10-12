const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Find the second occurrence and add inp after it
const marker = `  const color = currentUser?.avatar_color||'#5B9CF6'\n  const inp`;
if(code.includes(marker)) {
  console.log('inp already added');
} else {
  // Add after the second color definition (in SphereAppInner)
  const parts = code.split(`  const color = currentUser?.avatar_color||'#5B9CF6'`);
  // parts[0] = before first, parts[1] = between first and second, parts[2] = after second
  code = parts[0] + 
    `  const color = currentUser?.avatar_color||'#5B9CF6'` + 
    parts[1] + 
    `  const color = currentUser?.avatar_color||'#5B9CF6'\n  const inp = {width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',fontFamily:'sans-serif',boxSizing:'border-box'}` + 
    parts[2];
  console.log('inp added');
}

fs.writeFileSync('src/components/SphereApp.js', code);
