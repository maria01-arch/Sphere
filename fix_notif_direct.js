const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Fix showLocalNotif to work in WebView - use setTimeout to escape gesture context
code = code.replace(
  `  const showLocalNotif = (title, body) => {
    if(typeof Notification === 'undefined') return
    if(Notification.permission === 'granted') {
      new Notification(title, {body, icon:'/icon-192.png'})
    }
  }`,
  `  const showLocalNotif = (title, body) => {
    try {
      if(typeof Notification === 'undefined') return
      if(Notification.permission !== 'granted') return
      setTimeout(()=>{
        try { new Notification(title, {body, icon:'/icon-192.png', tag:Date.now().toString()}) }
        catch(e){ console.log('Notif error:',e.message) }
      }, 100)
    } catch(e){ console.log('showLocalNotif error:',e) }
  }`
);

// Fix test button to show notification directly
code = code.replace(
  `    if(Notification.permission==='granted'){
      new Notification('🌐 Sphere Test',{body:'Notifications are working!',icon:'/icon-192.png'})
    } else {
      const p = await Notification.requestPermission()
      alert('New permission: '+p)
      if(p==='granted') new Notification('🌐 Sphere',{body:'Notifications enabled!',icon:'/icon-192.png'})
    }`,
  `    if(Notification.permission==='granted'){
      try {
        const n = new Notification('🌐 Sphere Test',{body:'Notifications are working!',icon:'/icon-192.png',tag:'test'})
        alert('Notification fired! Check your notification bar')
        n.onerror = (e) => alert('Notif error: '+e)
      } catch(e){ alert('Error: '+e.message) }
    } else {
      const p = await Notification.requestPermission()
      alert('New permission: '+p)
      if(p==='granted'){
        try { new Notification('🌐 Sphere',{body:'Notifications enabled!',icon:'/icon-192.png'}) }
        catch(e){ alert('Error: '+e.message) }
      }
    }`
);

// Wire showLocalNotif to notifications realtime panel
code = code.replace(
  `function NotificationsPanel({ currentUser, supabase, onUserClick }) {`,
  `function NotificationsPanel({ currentUser, supabase, onUserClick, showLocalNotif }) {`
);

// Pass showLocalNotif to NotificationsPanel
code = code.replace(
  `{tab==='notifications'&&<NotificationsPanel currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick}/>}`,
  `{tab==='notifications'&&<NotificationsPanel currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick} showLocalNotif={showLocalNotif}/>}`
);

// Add realtime notification in NotificationsPanel
code = code.replace(
  `if(data) setNotifs(prev=>[data,...prev])`,
  `if(data) {
        setNotifs(prev=>[data,...prev])
        if(showLocalNotif) {
          const info = {like:'❤️ liked your post',comment:'💬 commented on your post',follow:'👤 started following you',repost:'🔁 reposted your sphere'}
          showLocalNotif('🌐 Sphere', (data.actor?.display_name||'Someone')+' '+(info[data.type]||'sent you a notification'))
        }
      }`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
