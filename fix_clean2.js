const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Remove ChatWindow entirely
const start = code.indexOf('\nfunction ChatWindow(');
const end = code.indexOf('\nfunction NotificationsPanel(');
if(start !== -1 && end !== -1) {
  code = code.slice(0, start) + code.slice(end);
  console.log('ChatWindow removed');
} else {
  console.log('ChatWindow not found');
}

// Add DM states to SphereApp
code = code.replace(
  `  const [followed, setFollowed] = useState({})`,
  `  const [followed, setFollowed] = useState({})
  const [selectedDMMsg, setSelectedDMMsg] = useState(null)
  const [editingDMMsg, setEditingDMMsg] = useState(null)
  const [editDMText, setEditDMText] = useState('')
  const [dmReplyTo, setDmReplyTo] = useState(null)
  const dmLongPressTimer = useRef(null)
  const dmImgRef = useRef(null)
  const [sendingDMImg, setSendingDMImg] = useState(false)`
);

// Fix sendMsg in SphereApp
code = code.replace(
  `  const sendMsg = async() => {
    if(!msgText.trim()||!selectedConv) return
    const content = msgText.trim(); setMsgText('')
    await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content})
    loadConvos()
  }`,
  `  const sendMsg = async() => {
    if(!msgText.trim()||!selectedConv?.id) return
    const content=msgText.trim(); const reply=dmReplyTo
    setMsgText(''); setDmReplyTo(null)
    const tmp={id:'tmp'+Date.now(),sender_id:currentUser.id,content,reply_to:reply,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content,reply_to:reply})
    loadConvos()
  }`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('All done');
