const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add action sheet before the closing of group chat return
code = code.replace(
  `      <div style={{position:'sticky',bottom:0,background:'#090B10',padding:'10px 14px 24px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,alignItems:'center',position:'relative'}}>`,
  `      {selectedMsg&&<div onClick={()=>setSelectedMsg(null)} style={{position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-end'}}>
        <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'#1a1d26',borderRadius:'20px 20px 0 0',padding:'16px 0 32px'}}>
          <div style={{width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.15)',margin:'0 auto 16px'}}/>
          <div style={{padding:'0 8px',display:'flex',justifyContent:'center',gap:8,marginBottom:16,overflowX:'auto'}}>
            {['👍','❤️','😂','😮','😢','🔥','👏','💯'].map(e=>(
              <button key={e} onClick={async()=>{
                await supabase.from('group_messages').update({content:selectedMsg.content+' '+e}).eq('id',selectedMsg.id)
                setMessages(prev=>prev.map(m=>m.id===selectedMsg.id?{...m,content:m.content+' '+e}:m))
                setSelectedMsg(null)
              }} style={{background:'rgba(255,255,255,0.08)',border:'none',borderRadius:12,padding:'8px',fontSize:22,cursor:'pointer'}}>{e}</button>
            ))}
          </div>
          <button onClick={()=>{setReplyTo(selectedMsg.sender?.display_name+': '+selectedMsg.content.slice(0,50));setSelectedMsg(null)}} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'#fff',fontSize:15,cursor:'pointer',textAlign:'left'}}>↩ Reply</button>
          {selectedMsg.sender_id===currentUser.id&&<>
            <button onClick={()=>startEditGCMsg(selectedMsg)} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'#5B9CF6',fontSize:15,cursor:'pointer',textAlign:'left'}}>✏️ Edit</button>
            <button onClick={()=>deleteGCMsg(selectedMsg)} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'#FF4757',fontSize:15,cursor:'pointer',textAlign:'left'}}>🗑️ Delete</button>
          </>}
          {selectedMsg.image_url&&selectedMsg.sender_id===currentUser.id&&<button onClick={()=>deleteGCMsg(selectedMsg)} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px 20px',color:'#FF4757',fontSize:15,cursor:'pointer',textAlign:'left'}}>🗑️ Delete Image</button>}
        </div>
      </div>}
      <div style={{position:'sticky',bottom:0,background:'#090B10',padding:'10px 14px 24px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,alignItems:'center',position:'relative'}}>`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
