const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Remove debugMsg state
code = code.replace(`\n  const [debugMsg, setDebugMsg] = useState('')`, '');

// Remove debug display
code = code.replace(`<p style={{color:'yellow',fontSize:12,padding:'8px 16px'}}>{debugMsg}</p>
      `, '');

// Clean up query - remove debug parts
code = code.replace(
  `then(({data,error})=>{setDebugMsg('n:'+(data?data.length:'null')+' e:'+(error?error.message:'ok')+' u:'+currentUser.id.slice(0,6));setNotifs(data||[]);setLoading(false)})`,
  `then(({data})=>{setNotifs(data||[]);setLoading(false)})`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
