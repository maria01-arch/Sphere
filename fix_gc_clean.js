const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add missing states to GroupChat
code = code.replace(
  `  const [editName, setEditName] = useState(group.name)`,
  `  const [selectedMsg, setSelectedMsg] = useState(null)
  const [editingMsg, setEditingMsg] = useState(null)
  const [editText, setEditText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const longPressTimer = useRef(null)
  const [editName, setEditName] = useState(group.name)`
);

// Fix sendMsg in SphereApp - it was broken by wrong replacement
// Find the sendMsg that uses selectedConv
const oldSendMsg = `  const sendMsg = async()=>{
    if(!msgText.trim()||!selectedConv?.id) return
    const content=msgText.trim()
    const reply = dmReplyTo
    setMsgText(''); setDmReplyTo(null)
    const tmp={id:'tmp'+Date.now(),sender_id:currentUser.id,content,reply_to:reply,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content,reply_to:reply})
  }`;

if(code.includes(oldSendMsg)) {
  console.log('sendMsg found - ok');
} else {
  console.log('sendMsg not found - checking...');
  // Find what sendMsg looks like now
  const idx = code.indexOf('const sendMsg = async');
  console.log('sendMsg at:', idx);
  console.log('snippet:', code.slice(idx, idx+200));
}

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('States added');
