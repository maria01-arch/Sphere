const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add inp directly after avatarUrl state in SphereAppInner
code = code.replace(
  `  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url||'')
  const color = currentUser?.avatar_color||'#5B9CF6'`,
  `  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url||'')
  const color = currentUser?.avatar_color||'#5B9CF6'
  const inp = {width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',fontFamily:'sans-serif',boxSizing:'border-box'}`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
