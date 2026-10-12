const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Replace sendPush with a hybrid approach
code = code.replace(
  `  const sendPush = async(userId, title, body) => {
    try {
      const {data} = await supabase.from('push_subscriptions').select('subscription').eq('user_id',userId).maybeSingle()
      if(!data?.subscription) { console.log('No push sub for user',userId); return }
      const res = await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:data.subscription,title,body,url:'/'})})
      const result = await res.json()
      console.log('Push result:',result)
    } catch(e) { console.log('Push send error',e) }
  }`,
  `  const showLocalNotif = (title, body) => {
    if(typeof Notification === 'undefined') return
    if(Notification.permission === 'granted') {
      new Notification(title, {body, icon:'/icon-192.png'})
    }
  }

  const sendPush = async(userId, title, body) => {
    try {
      const {data} = await supabase.from('push_subscriptions').select('subscription').eq('user_id',userId).maybeSingle()
      if(data?.subscription) {
        fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:data.subscription,title,body,url:'/'})})
      }
    } catch(e) { console.log('Push send error',e) }
  }`
);

// Use local notification for own device (when receiving realtime events)
// Add local notif to realtime DM subscription
code = code.replace(
  `if(data) setMessages(prev=>[...prev.filter(m=>!m.id.toString().startsWith('tmp')),data])
    }).subscribe()
    return()=>supabase.removeChannel(ch)
  },[selectedConv])`,
  `if(data) {
        setMessages(prev=>[...prev.filter(m=>!m.id.toString().startsWith('tmp')),data])
        if(data.sender_id !== currentUser.id) showLocalNotif('💬 New Message', (data.sender?.display_name||'Someone')+': '+data.content?.slice(0,60))
      }
    }).subscribe()
    return()=>supabase.removeChannel(ch)
  },[selectedConv])`
);

// Add local notif to notifications realtime in NotificationsPanel
// Also request permission more aggressively on load
code = code.replace(
  `    const setupPush = async() => {
      try {
        if(!('Notification' in window)) { console.log('No Notification API'); return }`,
  `    const setupPush = async() => {
      try {
        if(!('Notification' in window)) { console.log('No Notification API'); return }
        // Request permission immediately for WebView apps
        if(Notification.permission === 'default') {
          await Notification.requestPermission()
        }`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
