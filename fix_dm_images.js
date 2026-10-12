const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add imgRef and sendingImg state to ChatWindow
code = code.replace(
  `function ChatWindow({ conv, currentUser, supabase, onBack, onOpenProfile }) {
  const [messages, setMessages] = useState([])
  const [msgText, setMsgText] = useState('')
  const bottomRef = useRef(null)`,
  `function ChatWindow({ conv, currentUser, supabase, onBack, onOpenProfile }) {
  const [messages, setMessages] = useState([])
  const [msgText, setMsgText] = useState('')
  const bottomRef = useRef(null)
  const dmImgRef = useRef(null)
  const [sendingImg, setSendingImg] = useState(false)`
);

// Add sendImage function before deleteMsg
code = code.replace(
  `  const deleteMsg = async(id)=>{`,
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

  const deleteMsg = async(id)=>{`
);

// Find the DM message input and add image button
code = code.replace(
  `<div style={{position:'sticky',bottom:0,background:'#090B10',padding:'10px 14px 24px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,alignItems:'center'}}>
              <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Message..."`,
  `<div style={{position:'sticky',bottom:0,background:'#090B10',padding:'10px 14px 24px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,alignItems:'center'}}>
              <input ref={dmImgRef} type="file" accept="image/*" onChange={e=>sendDMImage(e.target.files[0])} style={{display:'none'}}/>
              <button onClick={()=>dmImgRef.current?.click()} disabled={sendingImg} style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'none',cursor:'pointer',color:'#888',fontSize:18,flexShrink:0}}>{sendingImg?'⏳':'🖼️'}</button>
              <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Message..."`
);

// Show images in DM messages - find the message bubble render
code = code.replace(
  `<div style={{maxWidth:'75%',padding:'11px 15px',borderRadius:own?'20px 20px 5px 20px':'20px 20px 20px 5px',background:own?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.09)',color:'#fff',fontSize:15,lineHeight:1.5,wordBreak:'break-word'}}>
                    {msg.content}
                    <div style={{fontSize:10,color:own?'rgba(255,255,255,0.45)':'#444',marginTop:4,textAlign:'right'}}>{timeAgo(msg.created_at)}</div>`,
  `<div style={{maxWidth:'75%',padding:msg.image_url?'6px':'11px 15px',borderRadius:own?'20px 20px 5px 20px':'20px 20px 20px 5px',background:own?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.09)',color:'#fff',fontSize:15,lineHeight:1.5,wordBreak:'break-word',overflow:'hidden'}}>
                    {msg.image_url?<img src={msg.image_url} style={{maxWidth:220,maxHeight:220,borderRadius:14,display:'block'}} alt="img"/>:msg.content}
                    <div style={{fontSize:10,color:own?'rgba(255,255,255,0.45)':'#444',marginTop:4,textAlign:'right',padding:msg.image_url?'0 8px 6px':'0'}}>{timeAgo(msg.created_at)}</div>`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
