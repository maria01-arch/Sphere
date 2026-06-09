const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Remove the old sendMsg in SphereApp (the one without reply support)
code = code.replace(
  `  const sendMsg = async() => {
    if(!msgText.trim()||!selectedConv) return
    const content = msgText.trim(); setMsgText('')
    await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content})
    loadConvos()
  }`,
  ``
);

// Fix the new sendMsg to also update conversations list
code = code.replace(
  `  const sendMsg = async()=>{
    if(!msgText.trim()||!selectedConv?.id) return
    const content=msgText.trim()
    const reply = dmReplyTo
    setMsgText(''); setDmReplyTo(null)
    const tmp={id:'tmp'+Date.now(),sender_id:currentUser.id,content,reply_to:reply,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content,reply_to:reply})
  }`,
  `  const sendMsg = async()=>{
    if(!msgText.trim()||!selectedConv?.id) return
    const content=msgText.trim()
    const reply = dmReplyTo
    setMsgText(''); setDmReplyTo(null)
    const tmp={id:'tmp'+Date.now(),sender_id:currentUser.id,content,reply_to:reply,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content,reply_to:reply})
    loadConvos()
  }`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
