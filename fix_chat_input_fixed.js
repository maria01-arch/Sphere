const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Fix DM chat input to be truly fixed at bottom, not sticky
code = code.replace(
  `            <div style={{position:'sticky',bottom:0,background:'#090B10',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              {dmReplyTo&&<div style={{padding:'8px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <span style={{color:'#888',fontSize:12}}>↩ <span style={{color:'#5B9CF6'}}>{dmReplyTo}</span></span>
                <button onClick={()=>setDmReplyTo(null)} style={{background:'none',border:'none',color:'#555',cursor:'pointer',fontSize:18}}>✕</button>
              </div>}
              <div style={{padding:'10px 14px 24px',display:'flex',gap:10,alignItems:'center'}}>
              <input ref={dmImgRef} type="file" accept="image/*" onChange={e=>sendDMImage(e.target.files[0])} style={{display:'none'}}/>
              <button onClick={()=>dmImgRef.current?.click()} disabled={sendingDMImg} style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'none',cursor:'pointer',color:'#888',fontSize:18,flexShrink:0}}>{sendingDMImg?'⏳':'🖼️'}</button>
              <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder={dmReplyTo?'Reply...':'Message...'} style={{...inp,flex:1,borderRadius:26,marginBottom:0,padding:'12px 18px'}}/>
              <button onClick={sendMsg} disabled={!msgText.trim()} style={{width:46,height:46,borderRadius:'50%',background:msgText.trim()?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.06)',border:'none',cursor:msgText.trim()?'pointer':'not-allowed',color:msgText.trim()?'#fff':'#333',fontSize:20,flexShrink:0}}>→</button>
              </div>
            </div>
          </>}
        </>}`,
  `            <div style={{position:'fixed',bottom:0,left:0,right:0,maxWidth:600,margin:'0 auto',background:'#090B10',borderTop:'1px solid rgba(255,255,255,0.07)',zIndex:150}}>
              {dmReplyTo&&<div style={{padding:'8px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <span style={{color:'#888',fontSize:12}}>↩ <span style={{color:'#5B9CF6'}}>{dmReplyTo}</span></span>
                <button onClick={()=>setDmReplyTo(null)} style={{background:'none',border:'none',color:'#555',cursor:'pointer',fontSize:18}}>✕</button>
              </div>}
              <div style={{padding:'10px 14px',paddingBottom:'max(10px, env(safe-area-inset-bottom))',display:'flex',gap:10,alignItems:'center'}}>
              <input ref={dmImgRef} type="file" accept="image/*" onChange={e=>sendDMImage(e.target.files[0])} style={{display:'none'}}/>
              <button onClick={()=>dmImgRef.current?.click()} disabled={sendingDMImg} style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'none',cursor:'pointer',color:'#888',fontSize:18,flexShrink:0}}>{sendingDMImg?'⏳':'🖼️'}</button>
              <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder={dmReplyTo?'Reply...':'Message...'} style={{...inp,flex:1,borderRadius:26,marginBottom:0,padding:'12px 18px'}}/>
              <button onClick={sendMsg} disabled={!msgText.trim()} style={{width:46,height:46,borderRadius:'50%',background:msgText.trim()?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.06)',border:'none',cursor:msgText.trim()?'pointer':'not-allowed',color:msgText.trim()?'#fff':'#333',fontSize:20,flexShrink:0}}>→</button>
              </div>
            </div>
          </>}
        </>}`
);

// Also need bottom padding on message list so messages aren't hidden behind fixed input
code = code.replace(
  `<div style={{minHeight:'60vh',padding:'16px 14px',display:'flex',flexDirection:'column',gap:8,paddingBottom:20}}>`,
  `<div style={{minHeight:'60vh',padding:'16px 14px',display:'flex',flexDirection:'column',gap:8,paddingBottom:90}}>`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
