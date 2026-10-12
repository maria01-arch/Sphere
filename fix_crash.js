const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Remove remaining showLocalNotif reference in NotificationsPanel
code = code.replace(
  `if(data) {
        setNotifs(prev=>[data,...prev])
        if(showLocalNotif) {
          const info = {like:'❤️ liked your post',comment:'💬 commented on your post',follow:'👤 started following you',repost:'🔁 reposted your sphere',follow_accepted:'✅ accepted your follow request'}
          showLocalNotif('🌐 Sphere', (data.actor?.display_name||'Someone')+' '+(info[data.type]||'sent you a notification'))
        }
      }`,
  `if(data) setNotifs(prev=>[data,...prev])`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
