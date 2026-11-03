'use client'
import { useEffect, useRef, useState } from 'react'
import { Smile, X } from 'lucide-react'
import { StickerMedia } from '@/components/chat/StickerMedia'
import { EmojiGrid } from '@/components/common/EmojiGrid'
import { STICKER_MAX_SECONDS } from '@/lib/constants'
import { isMissingColumnError } from '@/lib/dbUtils'
import { trimVideoToBlob } from '@/lib/media/trimVideo'
import { uploadToR2 } from '@/lib/media/upload'

export function VideoTrimModal({ file, onCancel, onConfirm }) {
  const videoRef = useRef(null)
  const [url] = useState(()=>URL.createObjectURL(file))
  const [duration, setDuration] = useState(0)
  const [start, setStart] = useState(0)
  const [length, setLength] = useState(STICKER_MAX_SECONDS)
  const [ready, setReady] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(()=>()=>URL.revokeObjectURL(url),[url])

  const onLoadedMeta = () => {
    const d = videoRef.current.duration || 0
    setDuration(d)
    setLength(Math.min(STICKER_MAX_SECONDS, d))
    setReady(true)
  }

  // keep the preview looping over just [start, start+length]
  useEffect(()=>{
    const v = videoRef.current
    if(!v || !ready) return
    v.currentTime = start
    v.play().catch(()=>{})
    const onTime = () => { if(v.currentTime >= start+length) v.currentTime = start }
    v.addEventListener('timeupdate', onTime)
    return ()=>v.removeEventListener('timeupdate', onTime)
  },[start,length,ready])

  const changeStart = (v) => {
    const s = Math.max(0, Math.min(v, duration-0.2))
    const maxLen = Math.min(STICKER_MAX_SECONDS, duration-s)
    setStart(s)
    setLength(prev=>Math.min(prev, maxLen))
  }
  const changeLength = (v) => {
    const maxLen = Math.min(STICKER_MAX_SECONDS, duration-start)
    setLength(Math.max(0.5, Math.min(v, maxLen)))
  }

  const confirm = async () => {
    setProcessing(true)
    setError(null)
    try {
      const blob = await trimVideoToBlob(videoRef.current, start, start+length)
      onConfirm(blob)
    } catch(e) {
      console.error('Video trim failed:', e)
      setError("Couldn't process that clip — try a shorter or smaller video.")
      setProcessing(false)
    }
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:700,background:'rgba(0,0,0,0.92)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20,gap:16}}>
      <video ref={videoRef} src={url} muted playsInline onLoadedMetadata={onLoadedMeta} style={{maxWidth:'100%',maxHeight:'55vh',borderRadius:16,background:'#000'}}/>
      {ready?(
        <div style={{width:'100%',maxWidth:420,display:'flex',flexDirection:'column',gap:14}}>
          <div>
            <div style={{color:'var(--text-secondary,#aaa)',fontSize:12,marginBottom:4,display:'flex',justifyContent:'space-between'}}>
              <span>Start</span><span>{start.toFixed(1)}s</span>
            </div>
            <input type="range" min={0} max={Math.max(0,duration-0.5)} step={0.1} value={start} onChange={e=>changeStart(parseFloat(e.target.value))} style={{width:'100%'}}/>
          </div>
          <div>
            <div style={{color:'var(--text-secondary,#aaa)',fontSize:12,marginBottom:4,display:'flex',justifyContent:'space-between'}}>
              <span>Length (max {STICKER_MAX_SECONDS}s)</span><span>{length.toFixed(1)}s</span>
            </div>
            <input type="range" min={0.5} max={Math.min(STICKER_MAX_SECONDS,duration)} step={0.1} value={length} onChange={e=>changeLength(parseFloat(e.target.value))} style={{width:'100%'}}/>
          </div>
          {error&&<p style={{color:'var(--danger)',fontSize:13}}>{error}</p>}
          <div style={{display:'flex',gap:10}}>
            <button onClick={onCancel} disabled={processing} style={{flex:1,padding:'12px',borderRadius:14,border:'none',background:'var(--bg-card,#222)',color:'var(--text-primary,#fff)',fontWeight:700,cursor:'pointer'}}>Cancel</button>
            <button onClick={confirm} disabled={processing} style={{flex:1,padding:'12px',borderRadius:14,border:'none',background:'var(--primary)',color:'#fff',fontWeight:700,cursor:'pointer'}}>{processing?'Processing…':'Use this clip'}</button>
          </div>
        </div>
      ):<p style={{color:'var(--text-subtle)',fontSize:13}}>Loading video…</p>}
    </div>
  )
}

// Save-step shown after picking (and, for video, trimming) a sticker: lets
// the user drop it into an existing pack of theirs, or type a custom new
// pack name to create on the spot. Defaults to their first/only pack so the
// common case (one pack) is just tap-to-save.
export function StickerSaveModal({ packs, defaultPackId, onCancel, onConfirm, saving }) {
  const [choice, setChoice] = useState(defaultPackId||'__new__')
  const [newName, setNewName] = useState('')
  const confirm = () => {
    if(choice==='__new__'){
      if(!newName.trim()) return
      onConfirm({newPackName:newName.trim()})
    } else {
      onConfirm({packId:choice})
    }
  }
  return (
    <div style={{position:'fixed',inset:0,zIndex:701,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{width:'100%',maxWidth:420,background:'var(--bg-app)',borderRadius:'20px 20px 0 0',padding:'20px 20px calc(20px + env(safe-area-inset-bottom,0px))',display:'flex',flexDirection:'column',gap:12}}>
        <div style={{fontWeight:700,fontSize:15,color:'var(--text-primary)'}}>Save sticker to...</div>
        {packs.map(p=>(
          <label key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:12,background:choice===p.id?'rgba(var(--primary-rgb),0.15)':'var(--bg-card)',cursor:'pointer'}}>
            <input type="radio" name="pack" checked={choice===p.id} onChange={()=>setChoice(p.id)}/>
            <span style={{color:'var(--text-primary)',fontSize:14,fontWeight:600}}>{p.name}</span>
          </label>
        ))}
        <label style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:12,background:choice==='__new__'?'rgba(var(--primary-rgb),0.15)':'var(--bg-card)',cursor:'pointer'}}>
          <input type="radio" name="pack" checked={choice==='__new__'} onChange={()=>setChoice('__new__')}/>
          <input value={newName} onChange={e=>{setNewName(e.target.value);setChoice('__new__')}} placeholder="Custom pack name..." style={{flex:1,background:'none',border:'none',outline:'none',color:'var(--text-primary)',fontSize:14,fontWeight:600}}/>
        </label>
        <div style={{display:'flex',gap:10,marginTop:6}}>
          <button onClick={onCancel} disabled={saving} style={{flex:1,padding:'12px',borderRadius:14,border:'none',background:'var(--bg-card)',color:'var(--text-primary)',fontWeight:700,cursor:'pointer'}}>Cancel</button>
          <button onClick={confirm} disabled={saving||(choice==='__new__'&&!newName.trim())} style={{flex:1,padding:'12px',borderRadius:14,border:'none',background:'var(--primary)',color:'#fff',fontWeight:700,cursor:'pointer'}}>{saving?'Saving…':'Save'}</button>
        </div>
      </div>
    </div>
  )
}

export function StickerTray({ currentUser, supabase, onSelect, onEmojiSelect, onClose }) {
  const [mode, setMode] = useState('emoji') // 'emoji' | 'sticker' — emoji first since it's the more universal default
  const [packs, setPacks] = useState([])
  const [activePack, setActivePack] = useState(null)
  const [stickers, setStickers] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [setupError, setSetupError] = useState(null)
  const [trimFile, setTrimFile] = useState(null)
  const [pendingUpload, setPendingUpload] = useState(null) // File ready to save, once pack is chosen
  const fileRef = useRef(null)

  const pickFile = (file) => {
    if(!file) return
    if(file.type.startsWith('video/')) setTrimFile(file) // adjust start/length first
    else setPendingUpload(file) // images go straight to the pack picker
  }

  useEffect(()=>{ loadPacks() },[])

  // Only the current user's own packs — stickers used to be browsable across
  // every user's packs, which cluttered the tray with one tab per person.
  // Now it's just your own pack(s), defaulting to a single "My Stickers".
  const loadPacks = async () => {
    setLoading(true)
    setSetupError(null)
    let {data:myPacks, error:myPackErr} = await supabase.from('sticker_packs').select('id,name,owner_id').eq('owner_id',currentUser.id).order('created_at',{ascending:true})
    if(myPackErr && isMissingColumnError(myPackErr)) {
      setSetupError("Stickers aren't set up yet — ask your dev to run supabase_migration_reply_and_stickers.sql in Supabase.")
      setLoading(false)
      return
    }
    if(!myPacks?.length){
      const {data:created, error:createErr} = await supabase.from('sticker_packs').insert({owner_id:currentUser.id,name:'My Stickers'}).select('id,name,owner_id').single()
      if(createErr) { console.error('Failed to create sticker pack:', createErr); setSetupError('Could not set up your sticker pack: '+createErr.message); setLoading(false); return }
      myPacks = [created]
    }
    setPacks(myPacks)
    setActivePack(prev=>prev||myPacks[0]?.id||null)
    setLoading(false)
  }

  useEffect(()=>{ if(activePack) loadStickers(activePack) },[activePack])
  const loadStickers = async (packId) => {
    const {data} = await supabase.from('stickers').select('id,media_url').eq('pack_id',packId).order('created_at',{ascending:true})
    setStickers(data||[])
  }

  const handleUpload = async (file, {packId, newPackName}) => {
    if(!file) return
    setUploading(true)
    let targetPack = packs.find(p=>p.id===packId)
    if(newPackName){
      const {data:created, error:createErr} = await supabase.from('sticker_packs').insert({owner_id:currentUser.id,name:newPackName}).select('id,name,owner_id').single()
      if(createErr){ alert('Could not create pack: '+createErr.message); setUploading(false); return }
      targetPack = created
      setPacks(prev=>[...prev,created])
    }
    if(!targetPack) { alert("Couldn't find that sticker pack — try reopening the sticker tray."); setUploading(false); return }
    const ext = file.name.split('.').pop()
    const path = 'stickers/'+currentUser.id+'_'+Date.now()+'.'+ext
    let urlData
    try { urlData = await uploadToR2(file, path) }
    catch(err) { alert('Sticker upload failed: '+err.message); setUploading(false); return }
    const {data:inserted, error:insertErr} = await supabase.from('stickers').insert({pack_id:targetPack.id,media_url:urlData.publicUrl}).select('id,media_url').single()
    if(inserted){
      setActivePack(targetPack.id)
      setStickers(prev=>targetPack.id===activePack?[...prev,inserted]:prev)
    } else {
      alert('Could not save sticker: '+(insertErr?.message||'unknown error'))
    }
    setUploading(false)
    setPendingUpload(null)
  }

  return (
    <div style={{position:'fixed',left:0,right:0,bottom:0,maxWidth:600,margin:'0 auto',background:'var(--bg-app)',borderTop:'1px solid var(--border-color)',zIndex:160,height:280,display:'flex',flexDirection:'column',paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',overflowX:'auto',borderBottom:'1px solid var(--border-color)',flexShrink:0}}>
        <button onClick={()=>setMode('emoji')} style={{flexShrink:0,padding:'6px 12px',borderRadius:14,border:'none',background:mode==='emoji'?'rgba(var(--primary-rgb),0.2)':'var(--bg-card)',color:mode==='emoji'?'var(--primary)':'var(--text-secondary)',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}><Smile size={14}/> Emoji</button>
        <button onClick={()=>setMode('sticker')} style={{flexShrink:0,padding:'6px 12px',borderRadius:14,border:'none',background:mode==='sticker'?'rgba(var(--primary-rgb),0.2)':'var(--bg-card)',color:mode==='sticker'?'var(--primary)':'var(--text-secondary)',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}><span style={{fontSize:14,lineHeight:1}}>🖼️</span> Stickers</button>
        {mode==='sticker'&&packs.length>1&&packs.map(p=>(
          <button key={p.id} onClick={()=>setActivePack(p.id)} style={{flexShrink:0,padding:'6px 12px',borderRadius:14,border:'none',background:activePack===p.id?'rgba(var(--primary-rgb),0.2)':'var(--bg-card)',color:activePack===p.id?'var(--primary)':'var(--text-secondary)',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>{p.name}</button>
        ))}
        <button onClick={onClose} style={{marginLeft:'auto',background:'none',border:'none',color:'var(--text-secondary)',cursor:'pointer',flexShrink:0,display:'flex'}}><X size={18}/></button>
      </div>
      {mode==='emoji' ? (
        <EmojiGrid onSelect={onEmojiSelect}/>
      ) : (
      <div style={{flex:1,overflowY:'auto',padding:12,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,alignContent:'start'}}>
        {setupError?(
          <p style={{gridColumn:'span 4',color:'var(--danger)',fontSize:13,lineHeight:1.5}}>{setupError}</p>
        ):(<>
        <input ref={fileRef} type="file" accept="image/*,video/webm,video/mp4,video/quicktime" onChange={e=>{pickFile(e.target.files[0]);e.target.value=''}} style={{display:'none'}}/>
        <button onClick={()=>fileRef.current?.click()} disabled={uploading} style={{aspectRatio:'1',borderRadius:12,border:'2px dashed var(--border-color-2)',background:'none',color:'var(--text-tertiary)',fontSize:26,cursor:'pointer'}}>{uploading?'⏳':'+'}</button>
        {stickers.map(s=>(
          <button key={s.id} onClick={()=>onSelect(s.media_url)} style={{aspectRatio:'1',borderRadius:12,border:'none',background:'var(--bg-card)',padding:4,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
            <StickerMedia url={s.media_url} size={'100%'}/>
          </button>
        ))}
        {!loading&&stickers.length===0&&<p style={{gridColumn:'span 3',color:'var(--text-quaternary)',fontSize:12,alignSelf:'center'}}>No stickers here yet — tap + to add your own image or short video clip.</p>}
        </>)}
      </div>
      )}
      {trimFile&&<VideoTrimModal file={trimFile}
        onCancel={()=>setTrimFile(null)}
        onConfirm={(blob)=>{
          setTrimFile(null)
          setPendingUpload(new File([blob],'sticker_'+Date.now()+'.webm',{type:'video/webm'}))
        }}
      />}
      {pendingUpload&&<StickerSaveModal packs={packs} defaultPackId={activePack} saving={uploading}
        onCancel={()=>setPendingUpload(null)}
        onConfirm={(dest)=>handleUpload(pendingUpload,dest)}
      />}
    </div>
  )
}
