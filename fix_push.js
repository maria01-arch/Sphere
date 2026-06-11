const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add push notification registration after presence useEffect
code = code.replace(
  `  useEffect(()=>{
    window.history.pushState(null,'',window.location.href)`,
  `  useEffect(()=>{
    if('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then(reg=>{
        console.log('SW registered')
      }).catch(e=>console.log('SW error',e))
    }
  },[])

  useEffect(()=>{
    window.history.pushState(null,'',window.location.href)`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
