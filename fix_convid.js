const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

code = code.replace(
  `    if(!msgText.trim()||!convId) return
    const content=msgText.trim(); setMsgText('')
    const tmp={id:'tmp'+Date.now(),sender_id:currentUser.id,content,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    await supabase.from('messages').insert({conversation_id:convId,sender_id:currentUser.id,content})`,
  `    if(!msgText.trim()||!conv?.id) return
    const content=msgText.trim(); setMsgText('')
    const tmp={id:'tmp'+Date.now(),sender_id:currentUser.id,content,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    await supabase.from('messages').insert({conversation_id:conv.id,sender_id:currentUser.id,content})`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
