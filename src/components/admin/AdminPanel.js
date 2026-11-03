'use client'
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Clapperboard, FileText, Image as ImageIcon, Megaphone, Video } from 'lucide-react'
import { authJsonHeaders } from '@/lib/api'
import { REPORT_REASONS } from '@/lib/constants'
import { uploadToR2, uploadVideoChunked } from '@/lib/media/upload'
import { timeAgo } from '@/lib/timeAgo'

export function AdminPanel({ currentUser, supabase, onBack }) {
  const [adminTab, setAdminTab] = useState('ads') // 'ads' | 'announcements' | 'reports'
  const [reports, setReports] = useState([])
  const [reportsFilter, setReportsFilter] = useState('pending') // 'pending' | 'all'
  const [ads, setAds] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [advertiserName, setAdvertiserName] = useState('')
  const [content, setContent] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [adCtaText, setAdCtaText] = useState('')
  const [adType, setAdType] = useState('post')
  const [mediaFile, setMediaFile] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const avatarRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  // Moderation state: which reports have their content previewed, which has
  // its ban-duration picker open, and the offender's id once the content is
  // gone (so a post can be deleted AND its author still banned).
  const [previews, setPreviews] = useState({})
  const [banFor, setBanFor] = useState(null)
  const [offenders, setOffenders] = useState({})

  const [announcements, setAnnouncements] = useState([])
  const [annMessage, setAnnMessage] = useState('')
  const [annDescription, setAnnDescription] = useState('')
  const [annButtonText, setAnnButtonText] = useState('')
  const [annButtonUrl, setAnnButtonUrl] = useState('')
  const [annDurationHours, setAnnDurationHours] = useState(24)
  const [annSaving, setAnnSaving] = useState(false)

  useEffect(()=>{ loadAds(); loadAnnouncements(); loadReports() },[])

  const loadReports = async () => {
    const {data} = await supabase.from('reports').select('*,reporter:profiles!reporter_id(display_name,username),reported_user:profiles!reported_user_id(display_name,username)').order('created_at',{ascending:false})
    setReports(data||[])
  }

  const callModerate = async (body) => {
    const res = await fetch('/api/admin/moderate',{method:'POST',headers:await authJsonHeaders(),body:JSON.stringify(body)})
    const j = await res.json().catch(()=>({}))
    if(!res.ok) throw new Error(j.error||('Error '+res.status))
    return j
  }

  // Fetches whatever the report points at, for the preview box.
  const loadReportTarget = async (r) => {
    if(r.reported_post_id){
      const {data} = await supabase.from('posts').select('id,user_id,content,image_url,video_url,created_at,author:profiles(display_name,username)').eq('id',r.reported_post_id).maybeSingle()
      return data ? {kind:'Post',...data} : {kind:'Post',missing:true}
    }
    if(r.reported_reel_id){
      const {data} = await supabase.from('reels').select('id,user_id,video_url,caption,created_at,author:profiles(display_name,username)').eq('id',r.reported_reel_id).maybeSingle()
      return data ? {kind:'Reel',content:data.caption,...data} : {kind:'Reel',missing:true}
    }
    if(r.reported_comment_id){
      const {data} = await supabase.from('comments').select('id,user_id,content,created_at,author:profiles!comments_user_id_fkey(display_name,username)').eq('id',r.reported_comment_id).maybeSingle()
      return data ? {kind:'Comment',...data} : {kind:'Comment',missing:true}
    }
    return null
  }

  const previewReport = async (r) => {
    if(previews[r.id]){ setPreviews(prev=>{const n={...prev};delete n[r.id];return n}); return }
    const t = await loadReportTarget(r)
    if(t) setPreviews(prev=>({...prev,[r.id]:t}))
  }

  const offenderOf = async (r) => {
    if(r.reported_user_id) return r.reported_user_id
    if(offenders[r.id]) return offenders[r.id]
    const t = previews[r.id] || await loadReportTarget(r)
    return t?.user_id || null
  }

  const deleteReportedPost = async (r) => {
    if(!window.confirm('Delete this post for everyone? This cannot be undone.')) return
    try {
      const j = await callModerate({action:'delete_post',postId:r.reported_post_id})
      setReports(prev=>prev.map(x=>x.reported_post_id===r.reported_post_id?{...x,status:'actioned'}:x))
      setOffenders(prev=>{const n={...prev}; reports.filter(x=>x.reported_post_id===r.reported_post_id).forEach(x=>{n[x.id]=j.userId}); return n})
      setPreviews(prev=>({...prev,[r.id]:{kind:'Post',missing:true,deleted:true}}))
    } catch(err){ alert('Could not delete: '+err.message) }
  }

  const banOffender = async (r, hours, label) => {
    const userId = await offenderOf(r)
    if(!userId){ alert('Could not work out who posted this (it may already be deleted). Ban from a report on their profile instead.'); return }
    if(!window.confirm('Ban this user for '+label+'? They will not be able to sign in until the ban ends.')) return
    try {
      await callModerate({action:'ban_user',userId,hours})
      await markReportStatus(r,'actioned')
      setBanFor(null)
      alert('User banned for '+label+'.')
    } catch(err){ alert('Could not ban: '+err.message) }
  }

  const markReportStatus = async (report, status) => {
    await supabase.from('reports').update({status, reviewed_at:new Date().toISOString()}).eq('id',report.id)
    setReports(prev=>prev.map(r=>r.id===report.id?{...r,status}:r))
  }

  const loadAnnouncements = async() => {
    const {data} = await supabase.from('announcements').select('*').order('created_at',{ascending:false})
    setAnnouncements(data||[])
  }

  const createAnnouncement = async() => {
    if(!annMessage.trim()) { alert('Headline required'); return }
    if((annButtonText.trim() && !annButtonUrl.trim()) || (!annButtonText.trim() && annButtonUrl.trim())) {
      alert('Fill in both the button text and its link, or leave both empty'); return
    }
    setAnnSaving(true)
    const expiresAt = new Date(Date.now() + annDurationHours*60*60*1000).toISOString()
    const {error} = await supabase.from('announcements').insert({
      message: annMessage.trim(),
      description: annDescription.trim()||null,
      button_text: annButtonText.trim()||null,
      button_url: annButtonUrl.trim()||null,
      expires_at: expiresAt,
      created_by: currentUser.id
    })
    if(error) alert('Error: '+error.message)
    else { setAnnMessage(''); setAnnDescription(''); setAnnButtonText(''); setAnnButtonUrl(''); loadAnnouncements() }
    setAnnSaving(false)
  }

  const endAnnouncementNow = async(ann) => {
    await supabase.from('announcements').update({expires_at: new Date().toISOString()}).eq('id',ann.id)
    loadAnnouncements()
  }

  const deleteAnnouncement = async(ann) => {
    if(!window.confirm('Delete this announcement?')) return
    await supabase.from('announcements').delete().eq('id',ann.id)
    setAnnouncements(prev=>prev.filter(a=>a.id!==ann.id))
  }

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
      let urlData
      try { urlData = mediaFile.type.startsWith('video/') ? await uploadVideoChunked(mediaFile, path, {maxDurationSeconds:300, maxSizeBytes:200*1024*1024}) : await uploadToR2(mediaFile, path) }
      catch(err) { alert('Upload failed: '+err.message); setSaving(false); return }
      if(adType==='reel') videoUrl = urlData.publicUrl
      else imageUrl = urlData.publicUrl
    }
    let avatarUrl = null
    if(avatarFile) {
      try { avatarUrl = (await uploadToR2(avatarFile, 'ads/avatar_'+Date.now()+'.'+avatarFile.name.split('.').pop())).publicUrl }
      catch(err) { alert('Profile picture upload failed: '+err.message); setSaving(false); return }
    }
    const {error} = await supabase.from('ads').insert({
      ...(avatarUrl?{advertiser_avatar_url:avatarUrl}:{}),
      advertiser_name: advertiserName.trim(),
      content: content.trim(),
      image_url: imageUrl,
      video_url: videoUrl,
      link_url: linkUrl.trim()||null,
      cta_text: adCtaText.trim()||null,
      type: adType,
      active: true
    })
    if(error) alert('Error: '+error.message)
    else {
      setAdvertiserName(''); setContent(''); setLinkUrl(''); setAdCtaText(''); setMediaFile(null); setAvatarFile(null); setShowForm(false)
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
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'calc(12px + env(safe-area-inset-top)) 16px 12px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setShowForm(false)} style={{background:'none',border:'none',color:'var(--text-primary)',fontSize:24,cursor:'pointer'}}>‹</button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>New Ad</span>
        <button onClick={createAd} disabled={saving} style={{background:'linear-gradient(135deg,#F7B731,#FF6B35)',border:'none',borderRadius:20,padding:'8px 18px',color:'var(--text-primary)',fontWeight:700,cursor:'pointer'}}>{saving?'Saving...':'Create'}</button>
      </div>
      <div style={{padding:20,display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setAdType('post')} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid '+(adType==='post'?'#F7B731':'var(--bg-card-2)'),background:adType==='post'?'rgba(247,183,49,0.15)':'transparent',color:adType==='post'?'#F7B731':'var(--text-tertiary)',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><FileText size={15}/> Feed Post</button>
          <button onClick={()=>setAdType('reel')} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid '+(adType==='reel'?'#F7B731':'var(--bg-card-2)'),background:adType==='reel'?'rgba(247,183,49,0.15)':'transparent',color:adType==='reel'?'#F7B731':'var(--text-tertiary)',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Clapperboard size={15}/> Reel Video</button>
        </div>
 <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div onClick={()=>avatarRef.current?.click()} style={{width:56,height:56,borderRadius:'50%',overflow:'hidden',flexShrink:0,cursor:'pointer',background:'var(--bg-card-4)',border:'2px dashed rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {avatarFile?<img src={URL.createObjectURL(avatarFile)} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<ImageIcon size={22}/>}
          </div>
          <span style={{color:'var(--text-secondary)',fontSize:13}}>{avatarFile?avatarFile.name:'Profile picture (optional — shown instead of the first letter)'}</span>
          <input ref={avatarRef} type="file" accept="image/*" onChange={e=>setAvatarFile(e.target.files[0]||null)} style={{display:'none'}}/>
        </div>
        <input value={advertiserName} onChange={e=>setAdvertiserName(e.target.value)} placeholder="Advertiser/Brand name" style={{background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none'}}/>
        <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Ad text/caption" rows={3} style={{background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none',resize:'none',fontFamily:'sans-serif'}}/>
        <input value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} placeholder="Link URL (optional)" style={{background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none'}}/>
        <input value={adCtaText} onChange={e=>setAdCtaText(e.target.value)} placeholder="Button text (default: Learn More)" style={{background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none'}}/>
        <div onClick={()=>fileRef.current?.click()} style={{height:120,background:'var(--bg-card-4)',border:'2px dashed rgba(255,255,255,0.15)',borderRadius:16,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',gap:6}}>
          {mediaFile?<span style={{color:'var(--repost)',fontSize:13}}>{mediaFile.name}</span>:<>{adType==='reel'?<Video size={26}/>:<ImageIcon size={26}/>}<span style={{color:'var(--text-secondary)',fontSize:13}}>Tap to select {adType==='reel'?'video':'image'} (optional)</span></>}
        </div>
        <input ref={fileRef} type="file" accept={adType==='reel'?'video/*':'image/*'} onChange={e=>setMediaFile(e.target.files[0])} style={{display:'none'}}/>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'calc(12px + env(safe-area-inset-top)) 16px 12px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'var(--text-primary)',fontSize:24,cursor:'pointer'}}>‹</button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>{adminTab==='ads'?'Ad Manager':adminTab==='announcements'?'Announcements':'Reports'}</span>
        {adminTab==='ads'&&<button onClick={()=>setShowForm(true)} style={{background:'linear-gradient(135deg,#F7B731,#FF6B35)',border:'none',borderRadius:20,padding:'8px 16px',color:'var(--text-primary)',fontWeight:700,fontSize:13,cursor:'pointer'}}>+ New</button>}
      </div>
      <div style={{display:'flex',borderBottom:'1px solid var(--border-color)'}}>
        <button onClick={()=>setAdminTab('ads')} style={{flex:1,padding:'12px 0',background:'none',border:'none',borderBottom:adminTab==='ads'?'2px solid #F7B731':'2px solid transparent',color:adminTab==='ads'?'var(--text-primary)':'var(--text-secondary)',fontWeight:adminTab==='ads'?700:500,fontSize:14,cursor:'pointer'}}>Ads</button>
        <button onClick={()=>setAdminTab('announcements')} style={{flex:1,padding:'12px 0',background:'none',border:'none',borderBottom:adminTab==='announcements'?'2px solid #F7B731':'2px solid transparent',color:adminTab==='announcements'?'var(--text-primary)':'var(--text-secondary)',fontWeight:adminTab==='announcements'?700:500,fontSize:14,cursor:'pointer'}}>Announcements</button>
        <button onClick={()=>setAdminTab('reports')} style={{flex:1,padding:'12px 0',background:'none',border:'none',borderBottom:adminTab==='reports'?'2px solid #F7B731':'2px solid transparent',color:adminTab==='reports'?'var(--text-primary)':'var(--text-secondary)',fontWeight:adminTab==='reports'?700:500,fontSize:14,cursor:'pointer',position:'relative'}}>
          Reports
          {reports.filter(r=>r.status==='pending').length>0&&<span style={{position:'absolute',top:6,right:'calc(50% - 34px)',minWidth:16,height:16,borderRadius:8,background:'var(--danger)',color:'#fff',fontSize:10,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px'}}>{reports.filter(r=>r.status==='pending').length}</span>}
        </button>
      </div>

      {adminTab==='ads'&&<>
      {ads.length===0&&<div style={{padding:'60px 20px',textAlign:'center'}}><div style={{display:'flex',justifyContent:'center',color:'var(--text-quaternary)'}}><Megaphone size={44}/></div><p style={{color:'var(--text-secondary)',marginTop:8}}>No ads yet</p></div>}
      {ads.map(ad=>(
        <div key={ad.id} style={{padding:'14px 16px',borderBottom:'1px solid var(--border-color)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
            <div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontWeight:700,fontSize:15}}>{ad.advertiser_name}</span>
                <span style={{background:ad.type==='reel'?'rgba(var(--danger-rgb),0.15)':'rgba(var(--primary-rgb),0.15)',borderRadius:6,padding:'1px 6px',fontSize:10,color:ad.type==='reel'?'var(--danger)':'var(--primary)',fontWeight:700,display:'inline-flex',alignItems:'center',gap:3}}>{ad.type==='reel'?<><Clapperboard size={10}/> REEL</>:<><FileText size={10}/> POST</>}</span>
              </div>
              <span style={{color:ad.active?'var(--repost)':'var(--text-secondary)',fontSize:12}}>{ad.active?'● Active':'○ Inactive'}</span>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>toggleActive(ad)} style={{background:'var(--bg-card)',border:'none',borderRadius:10,padding:'6px 12px',color:'var(--text-primary)',fontSize:12,cursor:'pointer'}}>{ad.active?'Pause':'Activate'}</button>
              <button onClick={()=>deleteAd(ad)} style={{background:'rgba(var(--danger-rgb),0.1)',border:'none',borderRadius:10,padding:'6px 12px',color:'var(--danger)',fontSize:12,cursor:'pointer'}}>Delete</button>
            </div>
          </div>
          {ad.content&&<p style={{color:'var(--text-subtle)',fontSize:13,margin:0}}>{ad.content}</p>}
        </div>
      ))}
      </>}

      {adminTab==='announcements'&&<>
        <div style={{padding:16,display:'flex',flexDirection:'column',gap:10,borderBottom:'1px solid var(--border-color)'}}>
          <input value={annMessage} onChange={e=>setAnnMessage(e.target.value)} placeholder="Headline — e.g. See posts in any language" style={{background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none'}}/>
          <textarea value={annDescription} onChange={e=>setAnnDescription(e.target.value)} placeholder="Description (optional) — e.g. Update your settings to add any language you want." rows={2} style={{background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:14,outline:'none',resize:'none',fontFamily:'sans-serif'}}/>
          <div style={{display:'flex',gap:10}}>
            <input value={annButtonText} onChange={e=>setAnnButtonText(e.target.value)} placeholder="Button text (optional)" style={{flex:1,background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:14,outline:'none',minWidth:0}}/>
            <input value={annButtonUrl} onChange={e=>setAnnButtonUrl(e.target.value)} placeholder="Button link (optional)" style={{flex:1,background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:14,outline:'none',minWidth:0}}/>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <span style={{color:'var(--text-tertiary)',fontSize:13}}>Show for</span>
            <select value={annDurationHours} onChange={e=>setAnnDurationHours(Number(e.target.value))} style={{background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:10,padding:'8px 10px',color:'var(--text-primary)',fontSize:14}}>
              <option value={1}>1 hour</option>
              <option value={6}>6 hours</option>
              <option value={24}>1 day</option>
              <option value={72}>3 days</option>
              <option value={168}>7 days</option>
            </select>
            <button onClick={createAnnouncement} disabled={annSaving||!annMessage.trim()} style={{marginLeft:'auto',background:annMessage.trim()?'linear-gradient(135deg,#F7B731,#FF6B35)':'var(--bg-card-3)',border:'none',borderRadius:20,padding:'8px 18px',color:annMessage.trim()?'var(--text-primary)':'var(--text-quaternary)',fontWeight:700,cursor:annMessage.trim()?'pointer':'default'}}>{annSaving?'Posting...':'Post'}</button>
          </div>
          {(annMessage.trim()||annDescription.trim())&&(
            <div style={{background:'var(--primary)',borderRadius:12,padding:'14px 16px'}}>
              <p style={{color:'rgba(255,255,255,0.7)',fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:'uppercase',margin:'0 0 8px'}}>Preview</p>
              <h3 style={{color:'#fff',fontSize:16,fontWeight:800,margin:'0 0 4px',lineHeight:1.25}}>{annMessage||'Headline goes here'}</h3>
              {annDescription&&<p style={{color:'rgba(255,255,255,0.85)',fontSize:13,lineHeight:1.4,margin:'0 0 10px'}}>{annDescription}</p>}
              {annButtonText&&annButtonUrl&&<span style={{display:'inline-block',background:'#fff',color:'#111',fontWeight:700,fontSize:12.5,padding:'7px 16px',borderRadius:20}}>{annButtonText}</span>}
            </div>
          )}
        </div>
        {announcements.length===0&&<div style={{padding:'60px 20px',textAlign:'center'}}><div style={{display:'flex',justifyContent:'center',color:'var(--text-quaternary)'}}><Megaphone size={44}/></div><p style={{color:'var(--text-secondary)',marginTop:8}}>No announcements yet</p></div>}
        {announcements.map(ann=>{
          const isLive = new Date(ann.expires_at) > new Date()
          return (
            <div key={ann.id} style={{padding:'14px 16px',borderBottom:'1px solid var(--border-color)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6,gap:10}}>
                <span style={{color:isLive?'var(--repost)':'var(--text-secondary)',fontSize:12,flexShrink:0}}>{isLive?'● Live until '+new Date(ann.expires_at).toLocaleString():'○ Ended'}</span>
                <div style={{display:'flex',gap:8,flexShrink:0}}>
                  {isLive&&<button onClick={()=>endAnnouncementNow(ann)} style={{background:'var(--bg-card)',border:'none',borderRadius:10,padding:'6px 12px',color:'var(--text-primary)',fontSize:12,cursor:'pointer'}}>End now</button>}
                  <button onClick={()=>deleteAnnouncement(ann)} style={{background:'rgba(var(--danger-rgb),0.1)',border:'none',borderRadius:10,padding:'6px 12px',color:'var(--danger)',fontSize:12,cursor:'pointer'}}>Delete</button>
                </div>
              </div>
              <p style={{color:'var(--text-primary)',fontSize:14,fontWeight:700,margin:'0 0 2px',wordBreak:'break-word'}}>{ann.message}</p>
              {ann.description&&<p style={{color:'var(--text-subtle)',fontSize:13,margin:'0 0 4px',wordBreak:'break-word'}}>{ann.description}</p>}
              {ann.button_text&&ann.button_url&&<p style={{color:'var(--primary)',fontSize:12,margin:0}}>🔗 {ann.button_text} → {ann.button_url}</p>}
            </div>
          )
        })}
      </>}

      {adminTab==='reports'&&<>
        <div style={{display:'flex',gap:8,padding:'12px 16px',borderBottom:'1px solid var(--border-color)'}}>
          <button onClick={()=>setReportsFilter('pending')} style={{flex:1,padding:'8px',borderRadius:10,border:'none',background:reportsFilter==='pending'?'rgba(var(--danger-rgb),0.15)':'var(--bg-card)',color:reportsFilter==='pending'?'var(--danger)':'var(--text-secondary)',fontWeight:700,fontSize:13,cursor:'pointer'}}>Pending</button>
          <button onClick={()=>setReportsFilter('all')} style={{flex:1,padding:'8px',borderRadius:10,border:'none',background:reportsFilter==='all'?'rgba(var(--primary-rgb),0.15)':'var(--bg-card)',color:reportsFilter==='all'?'var(--primary)':'var(--text-secondary)',fontWeight:700,fontSize:13,cursor:'pointer'}}>All</button>
        </div>
        {(()=>{
          const visible = reports.filter(r=>reportsFilter==='all'||r.status==='pending')
          // Child-safety reports always float to the top regardless of sort,
          // since those need the fastest possible response.
          const sorted = [...visible].sort((a,b)=>{
            if(a.reason==='child_safety'&&b.reason!=='child_safety') return -1
            if(b.reason==='child_safety'&&a.reason!=='child_safety') return 1
            return new Date(b.created_at)-new Date(a.created_at)
          })
          if(sorted.length===0) return <div style={{padding:'60px 20px',textAlign:'center'}}><div style={{display:'flex',justifyContent:'center',color:'var(--text-quaternary)'}}><AlertTriangle size={44}/></div><p style={{color:'var(--text-secondary)',marginTop:8}}>{reportsFilter==='pending'?'No pending reports':'No reports yet'}</p></div>
          return sorted.map(r=>{
            const reasonLabel = REPORT_REASONS.find(x=>x.id===r.reason)?.label || r.reason
            const isChildSafety = r.reason==='child_safety'
            const targetLabel = r.reported_user_id ? `User @${r.reported_user?.username||'?'}`
              : r.reported_post_id ? `Post ${r.reported_post_id.slice(0,8)}`
              : r.reported_comment_id ? `Comment ${r.reported_comment_id.slice(0,8)}`
              : r.reported_message_id ? `Message ${r.reported_message_id.slice(0,8)}`
              : r.reported_reel_id ? `Reel ${r.reported_reel_id.slice(0,8)}`
              : 'Unknown'
            return (
              <div key={r.id} style={{padding:'14px 16px',borderBottom:'1px solid var(--border-color)',background:isChildSafety&&r.status==='pending'?'rgba(var(--danger-rgb),0.06)':'none'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8,gap:10}}>
                  <div>
                    <span style={{fontWeight:800,fontSize:13,color:isChildSafety?'var(--danger)':'var(--text-primary)'}}>{isChildSafety&&'🚨 '}{reasonLabel}</span>
                    <div style={{color:'var(--text-quaternary)',fontSize:11,marginTop:2}}>{targetLabel} · reported by {r.reporter?.display_name||'?'} · {timeAgo(r.created_at)}</div>
                  </div>
                  <span style={{flexShrink:0,fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:8,background:r.status==='pending'?'rgba(247,183,49,0.15)':r.status==='actioned'?'rgba(var(--repost-rgb),0.15)':'var(--bg-card)',color:r.status==='pending'?'#F7B731':r.status==='actioned'?'var(--repost)':'var(--text-quaternary)'}}>{r.status.toUpperCase()}</span>
                </div>
                {r.details&&<p style={{color:'var(--text-subtle)',fontSize:13,margin:'0 0 10px',wordBreak:'break-word'}}>{r.details}</p>}
                {(r.reported_post_id||r.reported_reel_id||r.reported_comment_id)&&<div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
                  <button onClick={()=>previewReport(r)} style={{background:'rgba(var(--primary-rgb),0.12)',border:'none',borderRadius:10,padding:'6px 12px',color:'var(--primary)',fontSize:12,fontWeight:700,cursor:'pointer'}}>{previews[r.id]?'Hide preview':'Preview'}</button>
                  {r.reported_post_id&&<button onClick={()=>deleteReportedPost(r)} style={{background:'rgba(var(--danger-rgb),0.12)',border:'none',borderRadius:10,padding:'6px 12px',color:'var(--danger)',fontSize:12,fontWeight:700,cursor:'pointer'}}>Delete post</button>}
                </div>}
                {previews[r.id]&&<div style={{background:'var(--bg-card)',border:'1px solid var(--border-color)',borderRadius:14,padding:12,marginBottom:10}}>
                  {previews[r.id].missing
                    ? <p style={{margin:0,color:'var(--text-secondary)',fontSize:13}}>{previews[r.id].deleted?'This post has been deleted.':previews[r.id].kind+' no longer exists.'}</p>
                    : <>
                        <div style={{fontSize:12,color:'var(--text-quaternary)',marginBottom:6}}>{previews[r.id].kind} by {previews[r.id].author?.display_name||'?'} (@{previews[r.id].author?.username||'?'})</div>
                        {previews[r.id].content&&<p style={{margin:'0 0 8px',fontSize:14,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{previews[r.id].content}</p>}
                        {previews[r.id].image_url&&<img src={previews[r.id].image_url} alt="" style={{maxWidth:'100%',maxHeight:320,borderRadius:10,display:'block'}}/>}
                        {previews[r.id].video_url&&<video src={previews[r.id].video_url} controls playsInline style={{maxWidth:'100%',maxHeight:320,borderRadius:10,display:'block'}}/>}
                      </>}
                </div>}
                {(r.reported_user_id||r.reported_post_id||r.reported_reel_id||r.reported_comment_id)&&<div style={{marginBottom:10}}>
                  <button onClick={()=>setBanFor(banFor===r.id?null:r.id)} style={{background:'rgba(var(--danger-rgb),0.12)',border:'none',borderRadius:10,padding:'6px 12px',color:'var(--danger)',fontSize:12,fontWeight:700,cursor:'pointer'}}>{banFor===r.id?'Cancel ban':'Ban user…'}</button>
                  {banFor===r.id&&<div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}}>
                    {[['1 day',24],['3 days',72],['7 days',168],['30 days',720],['Permanent',null]].map(([label,h])=><button key={label} onClick={()=>banOffender(r,h,label)} style={{background:'var(--bg-card)',border:'1px solid rgba(var(--danger-rgb),0.4)',borderRadius:10,padding:'6px 10px',color:'var(--danger)',fontSize:12,fontWeight:700,cursor:'pointer'}}>{label}</button>)}
                  </div>}
                </div>}
                {r.status==='pending'&&<div style={{display:'flex',gap:8}}>
                  <button onClick={()=>markReportStatus(r,'actioned')} style={{background:'rgba(var(--repost-rgb),0.1)',border:'none',borderRadius:10,padding:'6px 12px',color:'var(--repost)',fontSize:12,fontWeight:700,cursor:'pointer'}}>Mark Actioned</button>
                  <button onClick={()=>markReportStatus(r,'reviewed')} style={{background:'var(--bg-card)',border:'none',borderRadius:10,padding:'6px 12px',color:'var(--text-secondary)',fontSize:12,fontWeight:700,cursor:'pointer'}}>Dismiss</button>
                </div>}
              </div>
            )
          })
        })()}
      </>}
    </div>
  )
}
