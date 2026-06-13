const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

code = code.replace(
  `      if(data) {
        setNotifs(prev=>[data,...prev])
        if(showLocalNotif) {
          const info = {like:'❤️ liked your post',comment:'💬 commented on your post',follow:'👤 started following you',repost:'🔁 reposted your sphere'}
          showLocalNotif('🌐 Sphere', (data.actor?.display_name||'Someone')+' '+(info[data.type]||'sent you a notification'))
        }
      }`,
  `      if(data) setNotifs(prev=>[data,...prev])`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
