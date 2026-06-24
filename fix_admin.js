const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

const adminPanel = `
function AdminPanel({ currentUser, supabase, onBack }) {
  const [ads, setAds] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [advertiserName, setAdvertiserName] = useState('')
  const [content, setContent] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [adType, setAdType] = useState('post')
  const [mediaFile, setMediaFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  useEffect(()=>{ loadAds() },[])

  const loadAds = async() => {
    const {data} = await supabase.from('ads').select('*').order('created_at',{ascending:false})
    setAds(data||[])
  }

  const createAd = async() => {
    if(!advertiserName.trim()) { alert('Advertiser name required'); return }
    setSaving(true)
    let imageUrl = null, videoUrl = null
    if(mediaFile) {
      const ext = mediaFile.name.split('.').pop()
      const path = 'ads/'+Date.now()+'.'+ext
      const {error} = await supabase.storage.from('avatars').upload(path,mediaFile,{upsert:false,contentType:mediaFile.type})
      if(error) { alert('Upload failed: '+error.message); setSaving(false); return }
      const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
      if(adType==='reel') videoUrl = urlData.publicUrl
      else imageUrl = urlData.publicUrl
    }
    const {error} = await supabase.from('ads').insert({
      advertiser_name: advertiserName.trim(),
      content: content.trim(),
      image_url: imageUrl,
      video_url: videoUrl,
      link_url: linkUrl.trim()||null,
      type: adType,
      active: true
    })
    if(error) alert('Error: '+error.message)
    else {
      setAdvertiserName(''); setContent(''); setLinkUrl(''); setMediaFile(null); setShowForm(false)
      loadAds()
    }
    setSaving(false)
  }

  const toggleActive = async(ad) => {
    await supabase.from('ads').update({active:!ad.active}).eq('id',ad.id)
    setAds(prev=>prev.map(a=>a.id===ad.id?{...a,active:!a.active}:a))
  }

  const deleteAd = async(ad) => {
    if(!window.confirm('Delete this ad?')) return
    await supabase.from('ads').delete().eq('id',ad.id)
    setAds(prev=>prev.filter(a=>a.id!==ad.id))
  }

  if(showForm) return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setShowForm(false)} style={{background:'none',border:'none',color:'#fff',fontSize:24,cursor:'pointer'}}>‹</button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>New Ad</span>
        <button onClick={createAd} disabled={saving} style={{background:'linear-gradient(135deg,#F7B731,#FF6B35)',border:'none',borderRadius:20,padding:'8px 18px',color:'#fff',fontWeight:700,cursor:'pointer'}}>{saving?'Saving...':'Create'}</button>
      </div>
      <div style={{padding:20,display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setAdType('post')} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid '+(adType==='post'?'#F7B731':'rgba(255,255,255,0.1)'),background:adType==='post'?'rgba(247,183,49,0.15)':'transparent',color:adType==='post'?'#F7B731':'#888',fontWeight:700,cursor:'pointer'}}>📝 Feed Post</button>
          <button onClick={()=>setAdType('reel')} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid '+(adType==='reel'?'#F7B731':'rgba(255,255,255,0.1)'),background:adType==='reel'?'rgba(247,183,49,0.15)':'transparent',color:adType==='reel'?'#F7B731':'#888',fontWeight:700,cursor:'pointer'}}>🎬 Reel Video</button>
        </div>
        <input value={advertiserName} onChange={e=>setAdvertiserName(e.target.value)} placeholder="Advertiser/Brand name" style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none'}}/>
        <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Ad text/caption" rows={3} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none',resize:'none',fontFamily:'sans-serif'}}/>
        <input value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} placeholder="Link URL (optional)" style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 16px',color:'#fff',fontSize:15,outline:'none'}}/>
        <div onClick={()=>fileRef.current?.click()} style={{height:120,background:'rgba(255,255,255,0.05)',border:'2px dashed rgba(255,255,255,0.15)',borderRadius:16,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',gap:6}}>
          {mediaFile?<span style={{color:'#00C9A7',fontSize:13}}>{mediaFile.name}</span>:<><span style={{fontSize:28}}>{adType==='reel'?'📹':'🖼️'}</span><span style={{color:'#555',fontSize:13}}>Tap to select {adType==='reel'?'video':'image'} (optional)</span></>}
        </div>
        <input ref={fileRef} type="file" accept={adType==='reel'?'video/*':'image/*'} onChange={e=>setMediaFile(e.target.files[0])} style={{display:'none'}}/>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'rgba(9,11,16,0.95)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'#fff',fontSize:24,cursor:'pointer'}}>‹</button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>Ad Manager</span>
        <button onClick={()=>setShowForm(true)} style={{background:'linear-gradient(135deg,#F7B731,#FF6B35)',border:'none',borderRadius:20,padding:'8px 16px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>+ New</button>
      </div>
      {ads.length===0&&<div style={{padding:'60px 20px',textAlign:'center'}}><p style={{fontSize:48}}>📢</p><p style={{color:'#555',marginTop:8}}>No ads yet</p></div>}
      {ads.map(ad=>(
        <div key={ad.id} style={{padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
            <div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontWeight:700,fontSize:15}}>{ad.advertiser_name}</span>
                <span style={{background:ad.type==='reel'?'rgba(255,71,87,0.15)':'rgba(91,156,246,0.15)',borderRadius:6,padding:'1px 6px',fontSize:10,color:ad.type==='reel'?'#FF4757':'#5B9CF6',fontWeight:700}}>{ad.type==='reel'?'🎬 REEL':'📝 POST'}</span>
              </div>
              <span style={{color:ad.active?'#00C9A7':'#555',fontSize:12}}>{ad.active?'● Active':'○ Inactive'}</span>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>toggleActive(ad)} style={{background:'rgba(255,255,255,0.07)',border:'none',borderRadius:10,padding:'6px 12px',color:'#fff',fontSize:12,cursor:'pointer'}}>{ad.active?'Pause':'Activate'}</button>
              <button onClick={()=>deleteAd(ad)} style={{background:'rgba(255,71,87,0.1)',border:'none',borderRadius:10,padding:'6px 12px',color:'#FF4757',fontSize:12,cursor:'pointer'}}>Delete</button>
            </div>
          </div>
          {ad.content&&<p style={{color:'#aaa',fontSize:13,margin:0}}>{ad.content}</p>}
        </div>
      ))}
    </div>
  )
}
`;

// Insert AdminPanel before SphereAppInner
code = code.replace(
  `function SphereAppInner({ currentUser }) {`,
  adminPanel + `\nfunction SphereAppInner({ currentUser }) {`
);

// Add showAdmin state and render
code = code.replace(
  `  const [ads, setAds] = useState([])`,
  `  const [ads, setAds] = useState([])
  const [showAdmin, setShowAdmin] = useState(false)
  const ADMIN_ID = 'b29fa752-34f5-4a3e-a3e7-8178c2b176ae'`
);

code = code.replace(
  `  if(showSettings) return <SettingsView`,
  `  if(showAdmin) return <AdminPanel currentUser={currentUser} supabase={supabase} onBack={()=>setShowAdmin(false)}/>
  if(showSettings) return <SettingsView`
);

// Add admin button to header (only visible to admin)
code = code.replace(
  `<button onClick={()=>setShowOmniCore(true)} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:16,padding:'5px 10px',cursor:'pointer',color:'#fff',fontSize:12,fontWeight:700}}>🤖 AI</button>`,
  `{currentUser?.id===ADMIN_ID&&<button onClick={()=>setShowAdmin(true)} style={{background:'linear-gradient(135deg,#F7B731,#FF6B35)',border:'none',borderRadius:16,padding:'5px 10px',cursor:'pointer',color:'#fff',fontSize:12,fontWeight:700}}>📢 Ads</button>}
          <button onClick={()=>setShowOmniCore(true)} style={{background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:16,padding:'5px 10px',cursor:'pointer',color:'#fff',fontSize:12,fontWeight:700}}>🤖 AI</button>`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
