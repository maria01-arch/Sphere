const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add DM helper functions before handleSignOut
code = code.replace(
  `  const handleSignOut = async() => {`,
  `  const handleDMLongPress = (msg) => { dmLongPressTimer.current = setTimeout(()=>setSelectedDMMsg(msg),500) }
  const handleDMPressEnd = () => clearTimeout(dmLongPressTimer.current)

  const deleteDMMsg = async(msg) => {
    setSelectedDMMsg(null)
    await supabase.from('messages').delete().eq('id',msg.id).eq('sender_id',currentUser.id)
    setMessages(prev=>prev.filter(m=>m.id!==msg.id))
  }

  const saveDMEdit = async() => {
    if(!editDMText.trim()) return
    await supabase.from('messages').update({content:editDMText.trim()}).eq('id',editingDMMsg).eq('sender_id',currentUser.id)
    setMessages(prev=>prev.map(m=>m.id===editingDMMsg?{...m,content:editDMText.trim()}:m))
    setEditingDMMsg(null); setEditDMText('')
  }

  const sendDMImage = async(file)=>{
    if(!file||!selectedConv?.id) return
    setSendingDMImg(true)
    const ext=file.name.split('.').pop()
    const path='chats/dm_'+selectedConv.id+'_'+Date.now()+'.'+ext
    const {error}=await supabase.storage.from('avatars').upload(path,file,{upsert:false})
    if(error){alert('Upload failed: '+error.message);setSendingDMImg(false);return}
    const {data:urlData}=supabase.storage.from('avatars').getPublicUrl(path)
    const url=urlData.publicUrl
    const tmp={id:'tmp_img'+Date.now(),sender_id:currentUser.id,content:'📷',image_url:url,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content:'📷',image_url:url})
    setSendingDMImg(false)
  }

  const handleSignOut = async() => {`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
