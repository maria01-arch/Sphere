const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add a visible notification status indicator and manual trigger
code = code.replace(
  `<button onClick={testPush} style={{background:'rgba(0,201,167,0.15)',border:'1px solid rgba(0,201,167,0.3)',borderRadius:16,padding:'5px 10px',cursor:'pointer',color:'#00C9A7',fontSize:12,fontWeight:700}}>🔔 Test</button>`,
  `<button onClick={async()=>{
    if(typeof Notification === 'undefined'){alert('Notification API not available in this browser');return}
    alert('Permission: '+Notification.permission)
    if(Notification.permission==='granted'){
      new Notification('🌐 Sphere Test',{body:'Notifications are working!',icon:'/icon-192.png'})
    } else {
      const p = await Notification.requestPermission()
      alert('New permission: '+p)
      if(p==='granted') new Notification('🌐 Sphere',{body:'Notifications enabled!',icon:'/icon-192.png'})
    }
  }} style={{background:'rgba(0,201,167,0.15)',border:'1px solid rgba(0,201,167,0.3)',borderRadius:16,padding:'5px 10px',cursor:'pointer',color:'#00C9A7',fontSize:12,fontWeight:700}}>🔔 Test</button>`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
