const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Remove the wrongly placed ads state in UserProfileView
code = code.replace(
  `function UserProfileView({ user, currentUser, supabase, onBack, onMessage }) {
  const [posts, setPosts] = useState([])
  const [ads, setAds] = useState([])`,
  `function UserProfileView({ user, currentUser, supabase, onBack, onMessage }) {
  const [posts, setPosts] = useState([])`
);

// Add ads state correctly in SphereAppInner (after the handleSignOut+inp area)
code = code.replace(
  `  const handleSignOut = async() => { await supabase.auth.signOut(); window.location.href='/auth' }

  useEffect(()=>{
    supabase.from('ads').select('*').eq('active',true).order('created_at',{ascending:false}).then(({data})=>setAds(data||[]))
  },[])`,
  `  const [ads, setAds] = useState([])
  const handleSignOut = async() => { await supabase.auth.signOut(); window.location.href='/auth' }

  useEffect(()=>{
    supabase.from('ads').select('*').eq('active',true).order('created_at',{ascending:false}).then(({data})=>setAds(data||[]))
  },[])`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
