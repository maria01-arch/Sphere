const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add image generation to OmniCoreAI
code = code.replace(
  `  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])

  const send = async() => {`,
  `  const [loading, setLoading] = useState(false)
  const [genImg, setGenImg] = useState('')
  const [imgPrompt, setImgPrompt] = useState('')
  const [generatingImg, setGeneratingImg] = useState(false)
  const [showImgGen, setShowImgGen] = useState(false)
  const bottomRef = useRef(null)

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])

  const generateImage = async() => {
    if(!imgPrompt.trim()) return
    setGeneratingImg(true)
    const url = 'https://image.pollinations.ai/prompt/'+encodeURIComponent(imgPrompt+', high quality, detailed')+'?width=512&height=512&nologo=true'
    setGenImg(url)
    setGeneratingImg(false)
  }

  const send = async() => {`
);

// Add image gen UI inside OmniCore before closing div
code = code.replace(
  `      <div style={{position:'fixed',bottom:0,left:0,right:0,maxWidth:600,margin:'0 auto',padding:'10px 14px 24px',background:'#090B10',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,alignItems:'center'}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask OmniCore anything..." style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:26,padding:'12px 18px',color:'#fff',fontSize:15,outline:'none',fontFamily:'sans-serif'}}/>
        <button onClick={send} disabled={!input.trim()||loading} style={{width:46,height:46,borderRadius:'50%',background:input.trim()&&!loading?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.06)',border:'none',cursor:input.trim()&&!loading?'pointer':'not-allowed',color:input.trim()&&!loading?'#fff':'#333',fontSize:20,flexShrink:0}}>→</button>
      </div>`,
  `      {showImgGen&&<div style={{position:'fixed',inset:0,zIndex:10,background:'rgba(0,0,0,0.85)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,gap:12}}>
        <div style={{width:'100%',maxWidth:400,background:'#1a1d26',borderRadius:20,padding:20,display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontWeight:700,fontSize:17,color:'#fff'}}>🎨 Image Generator</span>
            <button onClick={()=>{setShowImgGen(false);setGenImg('')}} style={{background:'none',border:'none',color:'#888',fontSize:22,cursor:'pointer'}}>✕</button>
          </div>
          <input value={imgPrompt} onChange={e=>setImgPrompt(e.target.value)} placeholder="Describe the image..." style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none'}}/>
          <button onClick={generateImage} disabled={generatingImg||!imgPrompt.trim()} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:12,padding:'12px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer'}}>{generatingImg?'Generating...':'Generate Image'}</button>
          {genImg&&<img src={genImg} style={{width:'100%',borderRadius:12,marginTop:4}} alt="generated"/>}
          {genImg&&<button onClick={()=>window.open(genImg,'_blank')} style={{background:'rgba(255,255,255,0.07)',border:'none',borderRadius:12,padding:'10px',color:'#fff',fontSize:13,cursor:'pointer'}}>💾 Open / Save Image</button>}
        </div>
      </div>}
      <div style={{position:'fixed',bottom:0,left:0,right:0,maxWidth:600,margin:'0 auto',padding:'10px 14px 24px',background:'#090B10',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,alignItems:'center'}}>
        <button onClick={()=>setShowImgGen(true)} style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'none',cursor:'pointer',fontSize:18,flexShrink:0}}>🎨</button>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask OmniCore anything..." style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:26,padding:'12px 18px',color:'#fff',fontSize:15,outline:'none',fontFamily:'sans-serif'}}/>
        <button onClick={send} disabled={!input.trim()||loading} style={{width:46,height:46,borderRadius:'50%',background:input.trim()&&!loading?'linear-gradient(135deg,#5B9CF6,#845EF7)':'rgba(255,255,255,0.06)',border:'none',cursor:input.trim()&&!loading?'pointer':'not-allowed',color:input.trim()&&!loading?'#fff':'#333',fontSize:20,flexShrink:0}}>→</button>
      </div>`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
