const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Fix 1: Clear image state after posting
code = code.replace(
  `    setComposeText(''); setShowCompose(false)
  }

  const deletePost`,
  `    setComposeText(''); setComposeImage(null); setComposeImageUrl(null); setShowCompose(false)
  }

  const deletePost`
);

// Fix 2: Remove duplicate DM notification - sendPush already handles it
// The global listener fires AND sendPush fires = double notification
// Keep only global listener, remove sendPush from sendMsg
code = code.replace(
  `    await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content,reply_to:reply})
    sendPush(selectedConv.other?.id, '💬 '+( currentUser.display_name||'Someone'), content.slice(0,60))
    loadConvos()`,
  `    await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content,reply_to:reply})
    loadConvos()`
);

// Fix 3: Remove duplicate from NotificationsPanel - global listener already handles it
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

// Fix 4: Remove showLocalNotif prop from NotificationsPanel since no longer needed
code = code.replace(
  `function NotificationsPanel({ currentUser, supabase, onUserClick, showLocalNotif }) {`,
  `function NotificationsPanel({ currentUser, supabase, onUserClick }) {`
);

code = code.replace(
  `{tab==='notifications'&&<NotificationsPanel currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick} showLocalNotif={showLocalNotif}/>}`,
  `{tab==='notifications'&&<NotificationsPanel currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick}/>}`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
