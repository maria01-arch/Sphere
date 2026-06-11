const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

const omnicoreComponent = `
function OmniCoreAI({ currentUser, onClose }) {
  const [messages, setMessages] = useState([{role:'assistant',content:'Hey ' + (currentUser?.display_name?.split(' ')[0]||'there') + '! I am OmniCore AI by OmniSphereLabs. How can I help you today?'}])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])

  const send = async() => {
    if(!input.trim()||loading) return
    const userMsg = {role:'user',content:input.trim()}
    setMessages(prev=>[...prev,userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/omnicore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[...messages,userMsg].filter(m=>m.role!=='system')})})
      const data = await res.json()
      setMessages(prev=>[...prev,{role:'assistant',content:data.reply}])
    } catch(e) {
      setMessages(prev=>[...prev,{role:'assistant',content:'Sorry, I am having trouble connecting. Please try again.'}])
    }
    setLoading(false)
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:500,background:'#090B10',color:'#fff',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',gap:12,background:'rgba(9,11,16,0.98)'}}>
        <button onClick={onClose} style={{background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:24}}>‹</button>
        <div style={{width:38,height:38,borderRadius:12,background:'linear-gradient(135deg,#5B9CF6,#845EF7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🤖</div>
        <div>
          <div style={{fontWeight:800,fontSize:16,background:'linear-gradient(135deg,#5B9CF6,#845EF7)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>OmniCore AI</div>
          <div style={{color:'#00C9A7',fontSize:11}}>● by OmniSphereLabs</div>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'16px 14px',display:'flex',flexDirection:'column',gap:12,paddingBottom:80}}>
        {messages.map((msg,i)=>(
          <div key={i} style={{display:'flex',justifyContent:msg.role==='user'?'flex-end':'flex-start',gap:8,alignItems:'flex-end'}}>
            {msg.role==='assistant'&&<div style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#5B9CF6,#845EF7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>🤖</div>}
            <div style={{maxWidth:'80%',padding:'11px 15px',borderRadius:msg.role==='user'?'20px 20px 5px 20px':'20px 20px 20px 5px',background:msg.role==='user'?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.08)',color:'#fff',fontSize:15,lineHeight:1.6,wordBreak:'break-word',whiteSpace:'pre-wrap'}}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading&&<div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
          <div style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#5B9CF6,#845EF7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>🤖</div>
          <div style={{padding:'11px 15px',borderRadius:'20px 20px 20px 5px',background:'rgba(255,255,255,0.08)',color:'#888',fontSize:15}}>Thinking...</div>
        </div>}
        <div ref={bottomRef}/>
      </div>

      <div style={{position:'fixed',bottom:0,left:0,right:0,maxWidth:600,margin:'0 auto',padding:'10px 14px 24px',background:'#090B10',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,alignItems:'center'}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask OmniCore anything..." style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:26,padding:'12px 18px',color:'#fff',fontSize:15,outline:'none',fontFamily:'sans-serif'}}/>
        <button onClick={send} disabled={!input.trim()||loading} style={{width:46,height:46,borderRadius:'50%',background:input.trim()&&!loading?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.06)',border:'none',cursor:input.trim()&&!loading?'pointer':'not-allowed',color:input.trim()&&!loading?'#fff':'#333',fontSize:20,flexShrink:0}}>→</button>
      </div>
    </div>
  )
}
`;

// Insert before export default
code = code.replace(
  `export default function SphereApp`,
  omnicoreComponent + `export default function SphereApp`
);

// Add showOmniCore state
code = code.replace(
  `  const [hideNav, setHideNav] = useState(false)`,
  `  const [hideNav, setHideNav] = useState(false)
  const [showOmniCore, setShowOmniCore] = useState(false)`
);

// Add OmniCore render before the main return
code = code.replace(
  `  if(showSettings) return <SettingsView`,
  `  if(showOmniCore) return <OmniCoreAI currentUser={currentUser} onClose={()=>setShowOmniCore(false)}/>
  if(showSettings) return <SettingsView`
);

// Add OmniCore button to header
code = code.replace(
  `          <button onClick={()=>window.location.reload()} style={{background:'none',border:'none',cursor:'pointer',color:'#666',fontSize:20}}>🔄</button>`,
  `          <button onClick={()=>setShowOmniCore(true)} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:16,padding:'5px 10px',cursor:'pointer',color:'#fff',fontSize:12,fontWeight:700}}>🤖 AI</button>
          <button onClick={()=>window.location.reload()} style={{background:'none',border:'none',cursor:'pointer',color:'#666',fontSize:20}}>🔄</button>`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
