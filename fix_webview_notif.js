const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Make notification setup more aggressive for WebView
code = code.replace(
  `    const setupPush = async() => {
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
    setupPush()`,
  `    const setupPush = async() => {
      try {
        if(!('Notification' in window)) { console.log('No Notification API'); return }
        if(!('serviceWorker' in navigator)) { console.log('No SW'); return }
        if(!('PushManager' in window)) { console.log('No PushManager'); return }
        const reg = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready
        let permission = Notification.permission
        if(permission === 'default') permission = await Notification.requestPermission()
        if(permission !== 'granted') { console.log('Permission:',permission); return }
        let sub = await reg.pushManager.getSubscription()
        if(!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: 'BPiikDJR1kYnVVizNObctiIofznuYwl0P6tGmViKwqy11Lzq5JJmMQ-tAwc12yx6tHWYrRrVOmNCUhguqjyP5Cs'
          })
        }
        const {error} = await supabase.from('push_subscriptions').upsert({
          user_id:currentUser.id,
          subscription:JSON.parse(JSON.stringify(sub))
        },{onConflict:'user_id'})
        if(error) console.log('Sub save error:',error.message)
        else console.log('Push ready!')
      } catch(e) { console.log('Push setup error:',e.message) }
    }
    setupPush()`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
