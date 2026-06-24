const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Remove the wrongly placed ads/handleSignOut/useEffect from MyProfileView
code = code.replace(
  `function MyProfileView({ currentUser, supabase, onSettings, onBack, avatarUrl }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const color = currentUser?.avatar_color||'#5B9CF6'
  const inp = {width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',fontFamily:'sans-serif',boxSizing:'border-box'}
  const [ads, setAds] = useState([])
  const handleSignOut = async() => { await supabase.auth.signOut(); window.location.href='/auth' }

  useEffect(()=>{
    supabase.from('ads').select('*').eq('active',true).order('created_at',{ascending:false}).then(({data})=>setAds(data||[]))
  },[])`,
  `function MyProfileView({ currentUser, supabase, onSettings, onBack, avatarUrl }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const color = currentUser?.avatar_color||'#5B9CF6'`
);

// Now add ads correctly using the unique SphereAppInner function declaration as anchor
code = code.replace(
  `function SphereAppInner({ currentUser }) {`,
  `function SphereAppInner({ currentUser }) {
  const [ads, setAds] = useState([])`
);

// Add the ads loading useEffect and handleSignOut right after the tab state (unique to SphereAppInner)
code = code.replace(
  `function SphereAppInner({ currentUser }) {
  const [ads, setAds] = useState([])
  const [tab, setTab] = useState('home')`,
  `function SphereAppInner({ currentUser }) {
  const [ads, setAds] = useState([])
  const [tab, setTab] = useState('home')`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
