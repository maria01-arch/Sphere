const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Remove dmImgRef and sendingImg from ChatWindow
code = code.replace(
  `  const dmImgRef = useRef(null)
  const [sendingImg, setSendingImg] = useState(false)

  useEffect(()=>{`,
  `  useEffect(()=>{`
);

// Remove sendDMImage from ChatWindow
code = code.replace(
  `  const sendDMImage = async(file)=>{
    if(!file||!conv?.id) return
    setSendingImg(true)
    const ext = file.name.split('.').pop()
    const path = 'chats/dm_'+conv.id+'_'+Date.now()+'.'+ext
    const {error} = await supabase.storage.from('avatars').upload(path,file,{upsert:false})
    if(error){alert('Upload failed: '+error.message);setSendingImg(false);return}
    const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
    const url = urlData.publicUrl
    const tmp={id:'tmp_img'+Date.now(),sender_id:currentUser.id,content:'📷',image_url:url,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    await supabase.from('messages').insert({conversation_id:conv.id,sender_id:currentUser.id,content:'📷',image_url:url})
    setSendingImg(false)
  }

  const deleteMsg`,
  `  const deleteMsg`
);

// Add dmImgRef, sendingDMImg to SphereApp
code = code.replace(
  `  const [msgText, setMsgText] = useState('')
  const [dmView, setDmView] = useState('list')`,
  `  const [msgText, setMsgText] = useState('')
  const [dmView, setDmView] = useState('list')
  const dmImgRef = useRef(null)
  const [sendingDMImg, setSendingDMImg] = useState(false)`
);

// Add sendDMImage to SphereApp
code = code.replace(
  `  const handleSignOut = async() => { await supabase.auth.signOut(); window.location.href='/auth' }`,
  `  const handleSignOut = async() => { await supabase.auth.signOut(); window.location.href='/auth' }

  const sendDMImage = async(file)=>{
    if(!file||!selectedConv?.id) return
    setSendingDMImg(true)
    const ext = file.name.split('.').pop()
    const path = 'chats/dm_'+selectedConv.id+'_'+Date.now()+'.'+ext
    const {error} = await supabase.storage.from('avatars').upload(path,file,{upsert:false})
    if(error){alert('Upload failed: '+error.message);setSendingDMImg(false);return}
    const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
    const url = urlData.publicUrl
    const tmp={id:'tmp_img'+Date.now(),sender_id:currentUser.id,content:'📷',image_url:url,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content:'📷',image_url:url})
    setSendingDMImg(false)
  }`
);

// Fix sendingImg to sendingDMImg in inline DM button
code = code.replace(
  `<button onClick={()=>dmImgRef.current?.click()} disabled={sendingImg} style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'none',cursor:'pointer',color:'#888',fontSize:18,flexShrink:0}}>{sendingImg?'⏳':'🖼️'}</button>`,
  `<button onClick={()=>dmImgRef.current?.click()} disabled={sendingDMImg} style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'none',cursor:'pointer',color:'#888',fontSize:18,flexShrink:0}}>{sendingDMImg?'⏳':'🖼️'}</button>`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
