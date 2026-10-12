const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

code = code.replace(
  `  // Global listener for push notifications regardless of tab
  useEffect(()=>{
    const ch = supabase.channel('global_notifs_'+currentUser.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'sender_id=neq.'+currentUser.id},async(payload)=>{
        // Check if this message is in a conversation the user is part of
        const {data:conv} = await supabase.from('conversation_participants').select('conversation_id').eq('conversation_id',payload.new.conversation_id).eq('user_id',currentUser.id).maybeSingle()
        if(!conv) return
        const {data:sender} = await supabase.from('profiles').select('display_name').eq('id',payload.new.sender_id).single()
        showLocalNotif('💬 '+(sender?.display_name||'Someone'), payload.new.content?.slice(0,80)||'Sent you a message')
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+currentUser.id},async(payload)=>{
        const {data:actor} = await supabase.from('profiles').select('display_name').eq('id',payload.new.actor_id).single()
        const info = {like:'❤️ liked your post',comment:'💬 commented on your post',follow:'👤 started following you',repost:'🔁 reposted your sphere',follow_accepted:'✅ accepted your follow request'}
        showLocalNotif('🌐 Sphere', (actor?.display_name||'Someone')+' '+(info[payload.new.type]||'sent you a notification'))
      })
      .subscribe()
    return()=>supabase.removeChannel(ch)
  },[])`,
  `  // Global listener for push notifications regardless of tab
  useEffect(()=>{
    const ch = supabase.channel('global_notifs_'+currentUser.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+currentUser.id},async(payload)=>{
        const {data:actor} = await supabase.from('profiles').select('display_name').eq('id',payload.new.actor_id).single()
        const info = {like:'❤️ liked your post',comment:'💬 commented on your post',follow:'👤 started following you',repost:'🔁 reposted your sphere',follow_accepted:'✅ accepted your follow request'}
        showLocalNotif('🌐 Sphere', (actor?.display_name||'Someone')+' '+(info[payload.new.type]||'sent you a notification'))
      })
      .subscribe()

    // Separate channel for DMs - filter by user's conversations
    supabase.from('conversation_participants').select('conversation_id').eq('user_id',currentUser.id).then(({data:convs})=>{
      if(!convs?.length) return
      convs.forEach(({conversation_id})=>{
        supabase.channel('dm_notif_'+conversation_id)
          .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'conversation_id=eq.'+conversation_id},async(payload)=>{
            if(payload.new.sender_id === currentUser.id) return
            const {data:sender} = await supabase.from('profiles').select('display_name').eq('id',payload.new.sender_id).single()
            showLocalNotif('💬 '+(sender?.display_name||'Someone'), payload.new.content?.slice(0,80)||'Sent you a message')
          })
          .subscribe()
      })
    })

    return()=>{ supabase.removeChannel(ch) }
  },[])`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
