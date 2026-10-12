const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add test push button to settings or make sendPush log errors visibly
code = code.replace(
  `  const sendPush = async(userId, title, body) => {
    try {
      const {data} = await supabase.from('push_subscriptions').select('subscription').eq('user_id',userId).maybeSingle()
      if(!data?.subscription) return
      await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:data.subscription,title,body,url:'/'})})
    } catch(e) { console.log('Push send error',e) }
  }`,
  `  const sendPush = async(userId, title, body) => {
    try {
      const {data} = await supabase.from('push_subscriptions').select('subscription').eq('user_id',userId).maybeSingle()
      if(!data?.subscription) { console.log('No push sub for user',userId); return }
      const res = await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:data.subscription,title,body,url:'/'})})
      const result = await res.json()
      console.log('Push result:',result)
    } catch(e) { console.log('Push send error',e) }
  }

  const testPush = async() => {
    try {
      const {data} = await supabase.from('push_subscriptions').select('subscription').eq('user_id',currentUser.id).maybeSingle()
      if(!data?.subscription) { alert('No subscription found - try refreshing and allowing notifications'); return }
      const res = await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:data.subscription,title:'🌐 Test from Sphere',body:'Push notifications are working!',url:'/'})})
      const result = await res.json()
      alert('Push result: '+JSON.stringify(result))
    } catch(e) { alert('Error: '+e.message) }
  }`
);

// Add test push button to OmniCore or settings - add to header temporarily
code = code.replace(
  `<button onClick={()=>setShowOmniCore(true)} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:16,padding:'5px 10px',cursor:'pointer',color:'#fff',fontSize:12,fontWeight:700}}>🤖 AI</button>`,
  `<button onClick={testPush} style={{background:'rgba(0,201,167,0.15)',border:'1px solid rgba(0,201,167,0.3)',borderRadius:16,padding:'5px 10px',cursor:'pointer',color:'#00C9A7',fontSize:12,fontWeight:700}}>🔔 Test</button>
          <button onClick={()=>setShowOmniCore(true)} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:16,padding:'5px 10px',cursor:'pointer',color:'#fff',fontSize:12,fontWeight:700}}>🤖 AI</button>`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
