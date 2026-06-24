const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

code = code.replace(
  `  const handleSignOut = async() => { await supabase.auth.signOut(); window.location.href='/auth' }`,
  `  const handleSignOut = async() => { await supabase.auth.signOut(); window.location.href='/auth' }

  useEffect(()=>{
    supabase.from('ads').select('*').eq('active',true).eq('type','post').order('created_at',{ascending:false}).then(({data})=>setAds(data||[]))
  },[])`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
