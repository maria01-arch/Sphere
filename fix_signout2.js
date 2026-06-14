const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add handleSignOut right after the color definition in SphereAppInner (line ~1434)
// Find the inp definition we added and add handleSignOut after it
code = code.replace(
  `  const inp = {width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',fontFamily:'sans-serif',boxSizing:'border-box'}
  const handleSignOut = async() => { await supabase.auth.signOut(); window.location.href='/auth' }`,
  `  const inp = {width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',fontFamily:'sans-serif',boxSizing:'border-box'}
  const handleSignOut = async() => { await supabase.auth.signOut(); window.location.href='/auth' }`
);

// If not found, add after the inp line
if(!code.includes('const handleSignOut = async() => { await supabase.auth.signOut()')) {
  code = code.replace(
    `  const inp = {width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',fontFamily:'sans-serif',boxSizing:'border-box'}`,
    `  const inp = {width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',fontFamily:'sans-serif',boxSizing:'border-box'}
  const handleSignOut = async() => { await supabase.auth.signOut(); window.location.href='/auth' }`
  );
  console.log('handleSignOut added');
} else {
  console.log('already exists');
}

fs.writeFileSync('src/components/SphereApp.js', code);
