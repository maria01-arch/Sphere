const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add manual notification permission request button in settings
// And fix subscription to re-register on every login
code = code.replace(
  `  useEffect(()=>{
    if(!('serviceWorker' in navigator)||!('PushManager' in window)) return
    navigator.serviceWorker.register('/sw.js').then(async reg=>{
      const permission = await Notification.requestPermission()
      if(permission !== 'granted') return
      const existing = await reg.pushManager.getSubscription()
      const sub = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BPiikDJR1kYnVVizNObctiIofznuYwl0P6tGmViKwqy11Lzq5JJmMQ-tAwc12yx6tHWYrRrVOmNCUhguqjyP5Cs'
      })
      await supabase.from('push_subscriptions').upsert({user_id:currentUser.id,subscription:JSON.parse(JSON.stringify(sub))})
    }).catch(e=>console.log('SW error',e))
  },[])`,
  `  useEffect(()=>{
    const setupPush = async() => {
      if(!('serviceWorker' in navigator)||!('PushManager' in window)) return
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready
        const permission = await Notification.requestPermission()
        if(permission !== 'granted') return
        let sub = await reg.pushManager.getSubscription()
        if(!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: 'BPiikDJR1kYnVVizNObctiIofznuYwl0P6tGmViKwqy11Lzq5JJmMQ-tAwc12yx6tHWYrRrVOmNCUhguqjyP5Cs'
          })
        }
        await supabase.from('push_subscriptions').upsert({
          user_id:currentUser.id,
          subscription:JSON.parse(JSON.stringify(sub))
        },{onConflict:'user_id'})
        console.log('Push subscription saved')
      } catch(e) { console.log('Push setup error',e.message) }
    }
    setupPush()
  },[])`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
