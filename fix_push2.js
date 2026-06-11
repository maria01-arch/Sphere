const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Replace old SW registration with full push setup
code = code.replace(
  `  useEffect(()=>{
    if('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then(reg=>{
        console.log('SW registered')
      }).catch(e=>console.log('SW error',e))
    }
  },[])`,
  `  useEffect(()=>{
    if(!('serviceWorker' in navigator)||!('PushManager' in window)) return
    navigator.serviceWorker.register('/sw.js').then(async reg=>{
      const permission = await Notification.requestPermission()
      if(permission !== 'granted') return
      const existing = await reg.pushManager.getSubscription()
      const sub = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: '${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}'
      })
      await supabase.from('push_subscriptions').upsert({user_id:currentUser.id,subscription:JSON.parse(JSON.stringify(sub))})
    }).catch(e=>console.log('SW error',e))
  },[])`
);

// Add sendPushToUser helper function before handleSignOut
code = code.replace(
  `  const handleSignOut = async() => {`,
  `  const sendPush = async(userId, title, body) => {
    try {
      const {data} = await supabase.from('push_subscriptions').select('subscription').eq('user_id',userId).maybeSingle()
      if(!data?.subscription) return
      await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:data.subscription,title,body,url:'/'})})
    } catch(e) { console.log('Push send error',e) }
  }

  const handleSignOut = async() => {`
);

// Add push to like notification
code = code.replace(
  `      else if (post.user_id !== currentUser.id) await supabase.from('notifications').insert({user_id:post.user_id,actor_id:currentUser.id,type:'like',post_id:post.id})`,
  `      else if (post.user_id !== currentUser.id) {
        await supabase.from('notifications').insert({user_id:post.user_id,actor_id:currentUser.id,type:'like',post_id:post.id})
        sendPush(post.user_id, '❤️ New Like', (currentUser.display_name||'Someone')+' liked your post')
      }`
);

// Add push to comment notification
code = code.replace(
  `      if (post.user_id !== currentUser.id) await supabase.from('notifications').insert({user_id:post.user_id,actor_id:currentUser.id,type:'comment',post_id:post.id})`,
  `      if (post.user_id !== currentUser.id) {
        await supabase.from('notifications').insert({user_id:post.user_id,actor_id:currentUser.id,type:'comment',post_id:post.id})
        sendPush(post.user_id, '💬 New Comment', (currentUser.display_name||'Someone')+' commented on your post')
      }`
);

// Add push to DM
code = code.replace(
  `    await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content,reply_to:reply})
    loadConvos()`,
  `    await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content,reply_to:reply})
    sendPush(selectedConv.other?.id, '💬 '+( currentUser.display_name||'Someone'), content.slice(0,60))
    loadConvos()`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
