const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

const oldQuery = `supabase.from('notifications').select('*,actor:profiles(id,display_name,username,avatar_color,avatar_url)').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(40).then(({data})=>{setNotifs(data||[]);setLoading(false)})`;

const newQuery = `supabase.from('notifications').select('*,actor:profiles(id,display_name,username,avatar_color,avatar_url)').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(40).then(({data,error})=>{setDebugMsg('n:'+(data?data.length:'null')+' e:'+(error?error.message:'ok')+' u:'+currentUser.id.slice(0,6));setNotifs(data||[]);setLoading(false)})`;

const oldEmpty = `{!loading&&notifs.length===0&&<div style={{padding:'50px 20px',textAlign:'center'}}><p style={{fontSize:40}}>🔔</p><p style={{color:'#555',marginTop:8}}>No notifications yet</p></div>}`;

const newEmpty = `<p style={{color:'yellow',fontSize:12,padding:'8px 16px'}}>{debugMsg}</p>
      {!loading&&notifs.length===0&&<div style={{padding:'50px 20px',textAlign:'center'}}><p style={{fontSize:40}}>🔔</p><p style={{color:'#555',marginTop:8}}>No notifications yet</p></div>}`;

const oldState = `  const [loading, setLoading] = useState(true)
  const typeInfo`;
const newState = `  const [loading, setLoading] = useState(true)
  const [debugMsg, setDebugMsg] = useState('...')
  const typeInfo`;

if(code.includes(oldQuery)){code=code.replace(oldQuery,newQuery);console.log('query patched')}else{console.log('query not found')}
if(code.includes(oldEmpty)){code=code.replace(oldEmpty,newEmpty);console.log('empty patched')}else{console.log('empty not found')}
if(code.includes(oldState)){code=code.replace(oldState,newState);console.log('state patched')}else{console.log('state not found')}

fs.writeFileSync('src/components/SphereApp.js', code);
