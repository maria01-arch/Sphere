const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Fix 1: Change emoji reaction to store in reactions array, not append to content
code = code.replace(
  `{['👍','❤️','😂','😮','😢',' 🔥','👏','💯'].map(e=>(
                      <button key={e} onClick={async()=>{await supabase.from('messages').update({content:selectedDMMsg.content+' '+e}).eq('id',selectedDMMsg.id);setMessages(prev=>prev.map(m=>m.id===selectedDMMsg.id?{...m,content:m.content+' '+e}:m));setSelectedDMMsg(null)}} style={{background:'rgba(255,255,255,0.08)',border:'none',borderRadius:12,padding:'8px',fontSize:22,cursor:'pointer'}}>{e}</button>
                    ))}`,
  `{['👍','❤️','😂','😮','😢','🔥','👏','💯'].map(e=>(
                      <button key={e} onClick={async()=>{
                        const newReactions = [...(selectedDMMsg.reactions||[]),{emoji:e,user_id:currentUser.id}]
                        await supabase.from('messages').update({reactions:newReactions}).eq('id',selectedDMMsg.id)
                        setMessages(prev=>prev.map(m=>m.id===selectedDMMsg.id?{...m,reactions:newReactions}:m))
                        setSelectedDMMsg(null)
                      }} style={{background:'rgba(255,255,255,0.08)',border:'none',borderRadius:12,padding:'8px',fontSize:22,cursor:'pointer'}}>{e}</button>
                    ))}`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
