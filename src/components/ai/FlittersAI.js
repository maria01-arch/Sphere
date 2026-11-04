'use client'
import { useEffect, useRef, useState } from 'react'
import { Brain, Palette, Save, Send, Trash2, X } from 'lucide-react'
import { authJsonHeaders } from '@/lib/api'

export function FlittersAI({ currentUser, onClose }) {
  const STORAGE_KEY = 'flittersai_history_'+(currentUser?.id||'guest')
  const defaultMsg = [{role:'assistant',content:'Hey ' + (currentUser?.display_name?.split(' ')[0]||'there') + '! I\'m Flitters AI. How can I help you today?'}]
  const [messages, setMessages] = useState(()=>{
    try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved) : defaultMsg } catch(e) { return defaultMsg }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [genImg, setGenImg] = useState('')
  const [imgPrompt, setImgPrompt] = useState('')
  const [generatingImg, setGeneratingImg] = useState(false)
  const [showImgGen, setShowImgGen] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [deepThink, setDeepThink] = useState(false)
  const bottomRef = useRef(null)
  const AI_GRADIENT = 'linear-gradient(135deg,#22D3EE,#A855F7,#EC4899)'

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])
  useEffect(()=>{ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)) } catch(e){} },[messages])

  const clearHistory = () => { try { localStorage.removeItem(STORAGE_KEY) } catch(e){} ; setMessages(defaultMsg) }

  const generateImage = async() => {
    if(!imgPrompt.trim()) return
    setGeneratingImg(true)
    setGenImg(null)
    try {
      const res = await fetch('/api/flittersai-image',{method:'POST',headers:await authJsonHeaders(),body:JSON.stringify({prompt:imgPrompt})})
      const data = await res.json()
      if(data.image) setGenImg(data.image)
      else alert(data.error||'Generation failed, try again')
    } catch(e) { alert('Error: '+e.message) }
    setGeneratingImg(false)
  }

  const send = async() => {
    if(!input.trim()||loading) return
    const userMsg = {role:'user',content:input.trim()}
    setMessages(prev=>[...prev,userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/flittersai',{method:'POST',headers:await authJsonHeaders(),body:JSON.stringify({messages:[...messages,userMsg].filter(m=>m.role!=='system'),deepThink})})
      if(!res.body) throw new Error('No response stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let started = false
      while(true) {
        const {done, value} = await reader.read()
        if(done) break
        fullText += decoder.decode(value, {stream:true})
        if(!started) {
          started = true
          setLoading(false)
          setMessages(prev=>[...prev,{role:'assistant',content:fullText}])
        } else {
          setMessages(prev=>{
            const copy=[...prev]
            copy[copy.length-1] = {role:'assistant',content:fullText}
            return copy
          })
        }
      }
      if(!started) setMessages(prev=>[...prev,{role:'assistant',content:fullText||'Sorry, I am having trouble connecting. Please try again.'}])
    } catch(e) {
      setMessages(prev=>[...prev,{role:'assistant',content:'Sorry, I am having trouble connecting. Please try again.'}])
    }
    setLoading(false)
  }

  return (
    <div className="screen-in-safe dk-page" style={{position:'fixed',inset:0,zIndex:500,background:'var(--bg-app)',color:'var(--text-primary)',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border-color)',display:'flex',alignItems:'center',gap:12,background:'rgba(9,11,16,0.98)'}}>
        <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-tertiary)',cursor:'pointer',fontSize:24}}>‹</button>
        <img src="/flitters-ai-icon.png" alt="Flitters AI" style={{width:38,height:38,objectFit:'contain'}} loading="lazy"/>
        <div onClick={()=>setShowAbout(true)} style={{cursor:'pointer'}}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div style={{fontWeight:800,fontSize:16,background:AI_GRADIENT,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Flitters AI</div>
            {deepThink&&<span style={{fontSize:10,background:AI_GRADIENT,color:'var(--text-primary)',borderRadius:6,padding:'1px 6px',fontWeight:700}}>DEEP THINK</span>}
          </div>
          <div style={{color:'var(--repost)',fontSize:11}}>● Always online</div>
        </div>
        <button onClick={()=>setDeepThink(d=>!d)} title="Toggle deep thinking mode" style={{marginLeft:'auto',background:deepThink?AI_GRADIENT:'var(--bg-card)',border:'none',borderRadius:14,padding:'6px 12px',color:'var(--text-primary)',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
          <Brain size={14}/> {deepThink?'Deep':'Fast'}
        </button>
        <button onClick={clearHistory} style={{background:'rgba(var(--danger-rgb),0.1)',border:'1px solid rgba(var(--danger-rgb),0.2)',borderRadius:14,padding:'6px 10px',color:'var(--danger)',fontWeight:700,cursor:'pointer',display:'flex'}}><Trash2 size={14}/></button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'16px 14px',display:'flex',flexDirection:'column',gap:12}}>
        {messages.map((msg,i)=>(
          <div key={i} style={{display:'flex',justifyContent:msg.role==='user'?'flex-end':'flex-start',gap:8,alignItems:'flex-end'}}>
            {msg.role==='assistant'&&<img src="/flitters-ai-icon.png" alt="" style={{width:28,height:28,objectFit:'contain',flexShrink:0}} loading="lazy"/>}
            <div style={{maxWidth:'80%',padding:'11px 15px',borderRadius:msg.role==='user'?'20px 20px 5px 20px':'20px 20px 20px 5px',background:msg.role==='user'?AI_GRADIENT:'var(--bg-card-6)',color:'var(--text-primary)',fontSize:15,lineHeight:1.6,wordBreak:'break-word',whiteSpace:'pre-wrap'}}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading&&<div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
          <img src="/flitters-ai-icon.png" alt="" style={{width:28,height:28,objectFit:'contain'}} loading="lazy"/>
          <div style={{padding:'11px 15px',borderRadius:'20px 20px 20px 5px',background:'var(--bg-card-6)',color:'var(--text-tertiary)',fontSize:15}}>{deepThink?'Thinking deeply...':'Thinking...'}</div>
        </div>}
        <div ref={bottomRef}/>
      </div>

      {showAbout&&<div className="backdrop-in" onClick={()=>setShowAbout(false)} style={{position:'fixed',inset:0,zIndex:20,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
        <div className="sheet-in" onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:380,background:'#12141c',borderRadius:20,padding:'28px 24px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
          <img src="/flitters-ai-logo.png" alt="Flitters AI" style={{width:160,objectFit:'contain',marginBottom:6}} loading="lazy"/>
          <p style={{color:'var(--text-tertiary)',fontSize:13,lineHeight:1.7,marginTop:8}}>
            Flitters AI is built and maintained by <strong style={{color:'var(--text-primary)'}}>Flitters Labs Corp</strong>.
          </p>
          <p style={{color:'var(--text-tertiary)',fontSize:13,lineHeight:1.7}}>
            Founded by <strong style={{color:'var(--text-primary)'}}>Dara Samuel</strong>, popularly known as <strong style={{color:'var(--text-primary)'}}>Samzy Bankz</strong>, with support from <strong style={{color:'var(--text-primary)'}}>Beauty</strong>.
          </p>
          <p style={{color:'var(--text-tertiary)',fontSize:13,lineHeight:1.7}}>
            Logo design by <strong style={{color:'var(--text-primary)'}}>Artist Bigkizz</strong>.
          </p>
          <button onClick={()=>setShowAbout(false)} style={{marginTop:14,background:AI_GRADIENT,border:'none',borderRadius:14,padding:'10px 24px',color:'var(--text-primary)',fontWeight:700,fontSize:14,cursor:'pointer'}}>Close</button>
        </div>
      </div>}

      {showImgGen&&<div className="backdrop-in" style={{position:'fixed',inset:0,zIndex:10,background:'rgba(0,0,0,0.85)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,gap:12}}>
        <div className="sheet-in" style={{width:'100%',maxWidth:400,background:'#1a1d26',borderRadius:20,padding:20,display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontWeight:700,fontSize:17,color:'var(--text-primary)',display:'inline-flex',alignItems:'center',gap:8}}><Palette size={17}/> Image Generator</span>
            <button onClick={()=>{setShowImgGen(false);setGenImg('')}} style={{background:'none',border:'none',color:'var(--text-tertiary)',cursor:'pointer',display:'flex'}}><X size={22}/></button>
          </div>
          <input value={imgPrompt} onChange={e=>setImgPrompt(e.target.value)} placeholder="Describe the image..." style={{background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none'}}/>
          <button onClick={generateImage} disabled={generatingImg||!imgPrompt.trim()} style={{background:AI_GRADIENT,border:'none',borderRadius:12,padding:'12px',color:'var(--text-primary)',fontWeight:700,fontSize:15,cursor:'pointer'}}>{generatingImg?'Generating...':'Generate Image'}</button>
          {genImg&&<img src={genImg} style={{width:'100%',borderRadius:12,marginTop:4}} alt="generated" loading="lazy"/>}
          {genImg&&<button onClick={()=>{
            const a=document.createElement('a')
            a.href=genImg
            a.download='flitters-ai-image-'+Date.now()+'.jpg'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
          }} style={{background:'var(--bg-card)',border:'none',borderRadius:12,padding:'10px',color:'var(--text-primary)',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Save size={15}/> Save Image</button>}
        </div>
      </div>}
      <div style={{flexShrink:0,maxWidth:600,width:'100%',margin:'0 auto',padding:'10px 14px',background:'var(--bg-app)',borderTop:'1px solid var(--border-color)',display:'flex',gap:10,alignItems:'center',paddingBottom:'calc(10px + env(safe-area-inset-bottom,0px))'}}>
        <button onClick={()=>setShowImgGen(true)} style={{width:40,height:40,borderRadius:'50%',background:'var(--bg-card)',border:'none',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><Palette size={18}/></button>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask Flitters AI anything..." style={{flex:1,background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:26,padding:'12px 18px',color:'var(--text-primary)',fontSize:15,outline:'none',fontFamily:'sans-serif'}}/>
        <button onClick={send} disabled={!input.trim()||loading} style={{width:46,height:46,borderRadius:'50%',background:input.trim()&&!loading?AI_GRADIENT:'var(--bg-card-3)',border:'none',cursor:input.trim()&&!loading?'pointer':'not-allowed',color:input.trim()&&!loading?'#fff':'#333',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><Send size={19}/></button>
      </div>
    </div>
  )
}
