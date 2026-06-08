const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

code = code.replace(
  `  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)`,
  `  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [debugMsg, setDebugMsg] = useState('')`
);

code = code.replace(
  `supabase.from('notifications').select('*,actor:profiles(id,display_name,username,avatar_color,avatar_url)').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(40).then(({data,error})=>{console.log('NOTIFS DATA:',data,'ERROR:',error,'USER:',currentUser.id);setNotifs(data||[]);setLoading(false)})`,
  `supabase.from('notifications').select('*,actor:profiles(id,display_name,username,avatar_color,avatar_url)').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(40).then(({data,error})=>{setDebugMsg('count:'+(data?.length||0)+' err:'+(error?.message||'none')+' uid:'+currentUser.id?.slice(0,8));setNotifs(data||[]);setLoading(false)})`
);

code = code.replace(
  `{!loading&&notifs.length===0&&<div style={{padding:'50px 20px',textAlign:'center'}}><p style={{fontSize:40}}>🔔</p><p style={{color:'#555',marginTop:8}}>No notifications yet</p></div>}`,
  `<p style={{color:'#ff0',fontSize:11,padding:'4px 16px'}}>{debugMsg}</p>
      {!loading&&notifs.length===0&&<div style={{padding:'50px 20px',textAlign:'center'}}><p style={{fontSize:40}}>🔔</p><p style={{color:'#555',marginTop:8}}>No notifications yet</p></div>}`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
