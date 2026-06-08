const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add opengroup URL param handler after supabase client line
code = code.replace(
  `  const [tab, setTab] = useState('home')`,
  `  const [tab, setTab] = useState('home')
  const [autoOpenGroup, setAutoOpenGroup] = useState(null)`
);

// Add useEffect to handle ?opengroup= param - place after other useEffects near top of SphereApp
code = code.replace(
  `  const [followed, setFollowed] = useState({})`,
  `  const [followed, setFollowed] = useState({})
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search)
    const gid = params.get('opengroup')
    if(gid){
      supabase.from('groups').select('*,group_members(user_id)').eq('id',gid).single().then(({data})=>{
        if(data){setTab('pulse');setAutoOpenGroup(data)}
      })
      window.history.replaceState({},'',window.location.pathname)
    }
  },[])`
);

// Pass autoOpenGroup to PulseTab
code = code.replace(
  `{tab==='pulse'&&<PulseTab currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick}/>}`,
  `{tab==='pulse'&&<PulseTab currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick} autoOpenGroup={autoOpenGroup} onAutoOpenDone={()=>setAutoOpenGroup(null)}/>}`
);

// Accept autoOpenGroup in PulseTab props
code = code.replace(
  `function PulseTab({ currentUser, supabase, onUserClick }) {`,
  `function PulseTab({ currentUser, supabase, onUserClick, autoOpenGroup, onAutoOpenDone }) {`
);

// Add useEffect in PulseTab to handle autoOpenGroup
code = code.replace(
  `  useEffect(()=>{ loadAll() },[])`,
  `  useEffect(()=>{ loadAll() },[])
  useEffect(()=>{
    if(autoOpenGroup){setViewingGroup(autoOpenGroup);onAutoOpenDone&&onAutoOpenDone()}
  },[autoOpenGroup])`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
