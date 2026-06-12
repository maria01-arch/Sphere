const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

code = code.replace(
  `      {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
        <div onClick={async()=>{
          const p = await Notification.requestPermission()
          if(p==='granted') window.location.reload()
        }} style={{margin:'8px 16px',background:'linear-gradient(135deg,rgba(91,156,246,0.15),rgba(132,94,247,0.15))',border:'1px solid rgba(91,156,246,0.3)',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
          <span style={{fontSize:20}}>🔔</span>
          <div style={{flex:1}}>
            <div style={{color:'#fff',fontWeight:700,fontSize:13}}>Enable Notifications</div>
            <div style={{color:'#888',fontSize:11}}>Get notified about likes, messages and more</div>
          </div>
          <span style={{color:'#5B9CF6',fontSize:13,fontWeight:700}}>Allow</span>
        </div>
      )}`,
  `      {typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
        <div onClick={async()=>{
          if(Notification.permission === 'denied'){
            alert('Notifications are blocked. Please go to your browser settings and allow notifications for this site, then refresh.')
            return
          }
          const p = await Notification.requestPermission()
          if(p==='granted') window.location.reload()
        }} style={{margin:'8px 16px',background:'linear-gradient(135deg,rgba(91,156,246,0.15),rgba(132,94,247,0.15))',border:'1px solid rgba(91,156,246,0.3)',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
          <span style={{fontSize:20}}>🔔</span>
          <div style={{flex:1}}>
            <div style={{color:'#fff',fontWeight:700,fontSize:13}}>{typeof Notification !== 'undefined' && Notification.permission === 'denied' ? 'Notifications Blocked' : 'Enable Notifications'}</div>
            <div style={{color:'#888',fontSize:11}}>Tap to get notified about likes, messages and more</div>
          </div>
          <span style={{color:'#5B9CF6',fontSize:13,fontWeight:700}}>{typeof Notification !== 'undefined' && Notification.permission === 'denied' ? 'Fix →' : 'Allow'}</span>
        </div>
      )}`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
