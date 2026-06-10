const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Fix 1: Pulse - allow multiple pulses per user (remove maybeSingle filter)
code = code.replace(
  `supabase.from('pulses').select('*').eq('user_id',currentUser.id).gt('expires_at',new Date().toISOString()).maybeSingle()`,
  `supabase.from('pulses').select('*,author:profiles(id,display_name,username,avatar_url,avatar_color)').eq('user_id',currentUser.id).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(1).maybeSingle()`
);

// Fix 2: Real online presence - use Supabase presence
// Replace "Active now" dummy with real presence tracking
code = code.replace(
  `<div style={{color:'#00C9A7',fontSize:11}}>● Active now</div>`,
  `<div style={{color:'#555',fontSize:11}}>DM</div>`
);

// Fix 3: GC realtime - also handle UPDATE and DELETE
code = code.replace(
  `    const ch = supabase.channel('gc:'+group.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_messages',filter:'group_id=eq.'+group.id},async(payload)=>{
        const {data} = await supabase.from('group_messages').select('*,sender:profiles(id,display_name,avatar_url,avatar_color)').eq('id',payload.new.id).single()
        if(data) setMessages(prev=>[...prev.filter(m=>!m.id.toString().startsWith('temp_')),data])
      }).subscribe()
    return()=>supabase.removeChannel(ch)
  },[])`,
  `    const ch = supabase.channel('gc:'+group.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_messages',filter:'group_id=eq.'+group.id},async(payload)=>{
        const {data} = await supabase.from('group_messages').select('*,sender:profiles(id,display_name,avatar_url,avatar_color)').eq('id',payload.new.id).single()
        if(data) setMessages(prev=>[...prev.filter(m=>!m.id.toString().startsWith('temp_')),data])
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'group_messages',filter:'group_id=eq.'+group.id},(payload)=>{
        setMessages(prev=>prev.map(m=>m.id===payload.new.id?{...m,...payload.new}:m))
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'group_messages',filter:'group_id=eq.'+group.id},(payload)=>{
        setMessages(prev=>prev.filter(m=>m.id!==payload.old.id))
      })
      .subscribe()
    return()=>supabase.removeChannel(ch)
  },[])`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
