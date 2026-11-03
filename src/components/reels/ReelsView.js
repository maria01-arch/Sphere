'use client'
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, Clapperboard, Heart, Loader2, MessageCircle, Pencil, Play, Trash2, Video, Volume2, VolumeX, X } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { TextWithMentions } from '@/components/common/Linkify'
import { ReportModal } from '@/components/common/ReportModal'
import HlsVideo from '@/components/HlsVideo'
import { formatVoiceDuration } from '@/lib/format'
import { getVideoDuration, uploadVideoChunked } from '@/lib/media/upload'

export function ReelsView({ currentUser, supabase, onUserClick, onClose, initialReelId }) {
  const [reels, setReels] = useState([])
  const [reelAds, setReelAds] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [caption, setCaption] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null)
  const [videoDuration, setVideoDuration] = useState(null)
  const [videoIssue, setVideoIssue] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [liked, setLiked] = useState({})
  const [likes, setLikes] = useState({})
  const [reportingReel, setReportingReel] = useState(null)
  const [playing, setPlaying] = useState(true)
  // Reels/ads autoplay muted by default (tap the speaker to unmute) — was
  // previously hardcoded muted={false}. This restores the original muted-
  // autoplay design, and separately is good practice regardless of any
  // WebView issue: nobody wants unsolicited audio blasting on scroll.
  const [reelMuted, setReelMuted] = useState(false) // unmuted by default in the actual Reels tab — muted-by-default only applies to the feed teaser card, which never changes this state at all
  const [buffering, setBuffering] = useState(false)
  const [animDir, setAnimDir] = useState(null) // 'up' | 'down' | null
  const [animating, setAnimating] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [commentCounts, setCommentCounts] = useState({})
  const videoRef = useRef(null)
  const fileRef = useRef(null)
  const touchStart = useRef(null)
  const containerRef = useRef(null)
  const isMounted = useRef(false)

  useEffect(()=>{ loadReels() },[])
  useEffect(()=>{
    // lock body scroll/overscroll while reels are open
    const prev = document.body.style.overscrollBehavior
    document.body.style.overscrollBehavior = 'none'
    document.body.style.overflow = 'hidden'
    return ()=>{ document.body.style.overscrollBehavior = prev; document.body.style.overflow = '' }
  },[])
  useEffect(()=>{ supabase.from('ads').select('*').eq('active',true).eq('type','reel').then(({data})=>setReelAds(data||[])) },[])
  useEffect(()=>{
    if(!isMounted.current){ isMounted.current=true; return }
    if(videoRef.current){ videoRef.current.currentTime=0; videoRef.current.play().catch(()=>{}) }
    setPlaying(true)
  },[currentIdx])
  useEffect(()=>{
    if(!videoRef.current) return
    playing?videoRef.current.play().catch(()=>{}):videoRef.current.pause()
  },[playing])

  const loadReels = async() => {
    const {data} = await supabase.from('reels').select('*,author:profiles!user_id(id,display_name,username,avatar_url,avatar_color,verified,is_authentic),reel_likes(user_id)').order('created_at',{ascending:false}).limit(20)
    if(!data) return
    setReels(data)
    const likedMap={}, likesMap={}
    data.forEach(r=>{ likedMap[r.id]=r.reel_likes?.some(l=>l.user_id===currentUser.id); likesMap[r.id]=r.reel_likes?.length||0 })
    setLiked(likedMap); setLikes(likesMap)
    // load real comment counts for all reels
    const ids = data.map(r=>r.id)
    if(ids.length>0){
      const {data:cc} = await supabase.from('comments').select('reel_id').in('reel_id',ids)
      if(cc){
        const countMap={}
        cc.forEach(c=>{ countMap[c.reel_id]=(countMap[c.reel_id]||0)+1 })
        setCommentCounts(countMap)
      }
    }
    // preload first two videos
    data.slice(0,2).forEach(r=>{ const v=document.createElement('video'); v.src=r.video_url; v.preload='auto' })
    // jump to specific reel if opened from feed preview
    if(initialReelId){ const idx=data.findIndex(r=>r.id===initialReelId); if(idx>=0) setCurrentIdx(idx) }
  }

  const goToReel = (nextIdx, dir) => {
    if(animating) return
    setAnimDir(dir)
    setAnimating(true)
    setTimeout(()=>{ setCurrentIdx(nextIdx); setAnimDir(null); setAnimating(false); setBuffering(false)
      // preload next video
      if(reels[nextIdx+1]) { const v=document.createElement('video'); v.src=reels[nextIdx+1].video_url; v.preload='auto' }
    }, 320)
  }

  const toggleLike = async(reel) => {
    const isLiked = liked[reel.id]
    setLiked(p=>({...p,[reel.id]:!isLiked}))
    setLikes(p=>({...p,[reel.id]:(p[reel.id]||0)+(isLiked?-1:1)}))
    if(isLiked) await supabase.from('reel_likes').delete().eq('reel_id',reel.id).eq('user_id',currentUser.id)
    else await supabase.from('reel_likes').insert({reel_id:reel.id,user_id:currentUser.id})
  }

  const openComments = async(reel) => {
    setShowComments(true)
    setComments([]) // clear stale comments from a previously viewed reel immediately
    const {data, error} = await supabase.from('comments').select('*,author:profiles!comments_user_id_fkey(id,display_name,username,avatar_url,avatar_color)').eq('reel_id',reel.id).order('created_at',{ascending:true})
    if (error) console.error('openComments (reel) failed:', error)
    setComments(data||[])
    setCommentCounts(p=>({...p,[reel.id]:data?.length||0}))
  }

  const postComment = async(reel) => {
    if(!commentText.trim()) return
    const text = commentText.trim()
    setCommentText('')
    // optimistic insert immediately so it never disappears
    const optimistic = {id:'tmp_'+Date.now(),reel_id:reel.id,user_id:currentUser.id,content:text,author:{id:currentUser.id,display_name:currentUser.display_name,username:currentUser.username,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}}
    setComments(p=>[...p,optimistic])
    setCommentCounts(p=>({...p,[reel.id]:(p[reel.id]||0)+1}))
    const {data:c} = await supabase.from('comments').insert({reel_id:reel.id,user_id:currentUser.id,content:text}).select('*,author:profiles!comments_user_id_fkey(id,display_name,username,avatar_url,avatar_color)').single()
    // replace optimistic with real
    if(c) setComments(p=>p.map(x=>x.id===optimistic.id?c:x))
  }

  // Free accounts get short-form only; is_authentic (verified) accounts can
  // post up to a minute. Defined once here so the picker's inline check and
  // the actual upload always agree.
  const REEL_MAX_DURATION = currentUser.is_authentic ? 60 : 20
  const REEL_MAX_SIZE_MB = currentUser.is_authentic ? 100 : 40

  useEffect(()=>()=>{ if(videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl) },[videoPreviewUrl])

  const pickVideoFile = async (file) => {
    if(!file) return
    if(videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    setVideoFile(file)
    setVideoPreviewUrl(URL.createObjectURL(file))
    setVideoDuration(null)
    setVideoIssue('')
    try {
      const duration = await getVideoDuration(file)
      setVideoDuration(duration)
      if(duration > REEL_MAX_DURATION + 0.5) setVideoIssue(`This is ${Math.round(duration)}s — trim it to ${REEL_MAX_DURATION}s or under.`)
      else if(file.size > REEL_MAX_SIZE_MB*1024*1024) setVideoIssue(`This file is ${(file.size/1024/1024).toFixed(1)}MB — the limit here is ${REEL_MAX_SIZE_MB}MB.`)
    } catch(err) {
      setVideoIssue(err.message||"Couldn't read that video file.")
    }
  }

  const clearVideoFile = () => {
    if(videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    setVideoFile(null); setVideoPreviewUrl(null); setVideoDuration(null); setVideoIssue('')
  }

  const uploadReel = async() => {
    if(!videoFile || videoIssue) return
    setUploading(true)
    setUploadProgress(0)
    const ext = (videoFile.name.split('.').pop()||'mp4').toLowerCase()
    const path = 'reels/'+currentUser.id+'_'+Date.now()+'.'+ext
    let urlData
    try {
      urlData = await uploadVideoChunked(videoFile, path, { maxDurationSeconds:REEL_MAX_DURATION, maxSizeBytes:REEL_MAX_SIZE_MB*1024*1024, onProgress:setUploadProgress })
    } catch(err) {
      alert(err.message||'Upload failed')
      setUploading(false)
      return
    }
    const {data:reel} = await supabase.from('reels').insert({user_id:currentUser.id,video_url:urlData.publicUrl,caption:caption.trim()}).select('*,author:profiles!user_id(id,display_name,username,avatar_url,avatar_color)').single()
    if(reel){ setReels(prev=>[reel,...prev]); setLikes(p=>({...p,[reel.id]:0})); setLiked(p=>({...p,[reel.id]:false})) }
    clearVideoFile(); setCaption(''); setShowUpload(false); setUploading(false); setUploadProgress(0)
  }

  const deleteReel = async(reel) => {
    await supabase.from('reels').delete().eq('id',reel.id)
    const newReels = reels.filter(r=>r.id!==reel.id)
    setReels(newReels)
    if(currentIdx>=newReels.length) setCurrentIdx(Math.max(0,newReels.length-1))
  }

  const handleTouchStart = (e) => { if(showComments) return; touchStart.current = e.touches[0].clientY }
  const handleTouchEnd = (e) => {
    if(showComments||!touchStart.current) return
    const diff = touchStart.current - e.changedTouches[0].clientY
    if(Math.abs(diff)>60){
      if(diff>0 && currentIdx<reels.length-1) goToReel(currentIdx+1,'up')
      else if(diff<0 && currentIdx>0) goToReel(currentIdx-1,'down')
    }
    touchStart.current = null
  }

  const slideStyle = animDir==='up' ? {transform:'translateY(-100%)',transition:'transform 0.32s cubic-bezier(0.4,0,0.2,1)'}
    : animDir==='down' ? {transform:'translateY(100%)',transition:'transform 0.32s cubic-bezier(0.4,0,0.2,1)'}
    : {transform:'translateY(0)',transition:'transform 0.32s cubic-bezier(0.4,0,0.2,1)'}

  const isAdSlot = reelAds.length>0 && (currentIdx+1)%5===0
  const currentAd = isAdSlot ? reelAds[Math.floor(currentIdx/5)%reelAds.length] : null
  const reel = reels[currentIdx]

  if(showUpload) return (
    <div style={{position:'fixed',inset:0,zIndex:400,background:'var(--bg-app)',color:'var(--text-primary)',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'16px',display:'flex',alignItems:'center',gap:12,borderBottom:'1px solid var(--border-color)',flexShrink:0}}>
        <button onClick={()=>{setShowUpload(false);clearVideoFile();setCaption('')}} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',display:'flex'}}><X size={24}/></button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>New Reel</span>
        <button onClick={uploadReel} disabled={!videoFile||!!videoIssue||uploading} style={{background:(videoFile&&!videoIssue)?'var(--primary)':'var(--bg-card-2)',border:'none',borderRadius:20,padding:'8px 20px',color:(videoFile&&!videoIssue)?'var(--text-primary)':'var(--text-quaternary)',fontWeight:700,cursor:(videoFile&&!videoIssue&&!uploading)?'pointer':'default',fontSize:14}}>{uploading?Math.round(uploadProgress*100)+'%':'Post'}</button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:16}}>
        <input ref={fileRef} type="file" accept="video/*" onChange={e=>{pickVideoFile(e.target.files[0]);e.target.value=''}} style={{display:'none'}}/>

        {!videoFile ? (
          <div onClick={()=>fileRef.current?.click()} style={{aspectRatio:'9/13',maxHeight:'52vh',background:'linear-gradient(165deg,var(--bg-card-4),var(--bg-card))',border:'1.5px dashed var(--border-color-2)',borderRadius:20,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',gap:14,margin:'0 auto',width:'100%'}}>
            <div style={{width:64,height:64,borderRadius:'50%',background:'linear-gradient(135deg,rgba(var(--primary-rgb),0.18),rgba(132,94,247,0.18))',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Video size={28} color="var(--primary)"/>
            </div>
            <div style={{textAlign:'center'}}>
              <p style={{color:'var(--text-primary)',fontSize:15,fontWeight:600,margin:0}}>Select a video</p>
              <p style={{color:'var(--text-quaternary)',fontSize:12,margin:'4px 0 0'}}>{currentUser.is_authentic ? 'Verified accounts can post up to 60s' : 'Free accounts can post up to 20s'}</p>
            </div>
          </div>
        ) : (
          <div style={{position:'relative',aspectRatio:'9/13',maxHeight:'52vh',borderRadius:20,overflow:'hidden',background:'#000',margin:'0 auto',width:'100%'}}>
            <video src={videoPreviewUrl} muted loop autoPlay playsInline style={{width:'100%',height:'100%',objectFit:'contain'}}/>
            <button onClick={()=>fileRef.current?.click()} disabled={uploading} style={{position:'absolute',top:10,right:10,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',border:'none',borderRadius:14,padding:'6px 12px',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}><Pencil size={12}/> Change</button>
            {videoDuration!=null&&<div style={{position:'absolute',bottom:10,left:10,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',borderRadius:10,padding:'3px 9px',color:'#fff',fontSize:12,fontWeight:600}}>{formatVoiceDuration(videoDuration)} / {REEL_MAX_DURATION}s</div>}
            {uploading&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10}}>
              <Loader2 size={30} className="xspin"/>
              <div style={{width:'60%',height:5,borderRadius:3,background:'rgba(255,255,255,0.25)',overflow:'hidden'}}>
                <div style={{height:'100%',width:(uploadProgress*100)+'%',background:'#fff',transition:'width 0.2s'}}/>
              </div>
            </div>}
          </div>
        )}

        {videoIssue&&(
          <div style={{display:'flex',alignItems:'flex-start',gap:8,background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:12,padding:'10px 12px'}}>
            <AlertTriangle size={16} color="var(--danger)" style={{flexShrink:0,marginTop:1}}/>
            <span style={{color:'var(--danger)',fontSize:13,lineHeight:1.4}}>{videoIssue}</span>
          </div>
        )}

        <div>
          <textarea value={caption} onChange={e=>setCaption(e.target.value.slice(0,280))} placeholder="Write a caption..." rows={3} style={{width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none',resize:'none',fontFamily:'sans-serif',boxSizing:'border-box'}}/>
          <p style={{textAlign:'right',color:'var(--text-quaternary)',fontSize:11,margin:'4px 2px 0'}}>{caption.length}/280</p>
        </div>
      </div>
    </div>
  )

  return (
    <div ref={containerRef} style={{position:'fixed',inset:0,zIndex:400,background:'#000',color:'#fff',overflow:'hidden',overscrollBehavior:'none',touchAction:'pan-y'}}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {/* top controls */}
      <button onClick={onClose} style={{position:'absolute',top:16,left:16,zIndex:20,background:'rgba(0,0,0,0.5)',border:'none',borderRadius:'50%',width:36,height:36,color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={20}/></button>
      <button onClick={()=>setShowUpload(true)} style={{position:'absolute',top:16,right:16,zIndex:20,background:'rgba(0,0,0,0.5)',border:'none',borderRadius:20,padding:'8px 14px',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>+ Reel</button>

      {reels.length===0&&<div style={{height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'center'}}><Clapperboard size={44}/></div>
        <p style={{fontSize:18,fontWeight:700}}>No reels yet</p>
        <button onClick={()=>setShowUpload(true)} style={{background:'var(--primary)',border:'none',borderRadius:24,padding:'12px 28px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer'}}>Post First Reel</button>
      </div>}

      {/* animated reel container */}
      {reels.length>0&&<div style={{...slideStyle,position:'absolute',inset:0}}>
        {isAdSlot&&currentAd?<>
          <HlsVideo src={currentAd.video_url} style={{width:'100%',height:'100%',objectFit:'cover',background:'#000'}} loop playsInline autoPlay muted={reelMuted}/>
          <div style={{position:'absolute',top:16,right:12,cursor:'pointer',color:'#fff',zIndex:4}} onClick={(e)=>{e.stopPropagation();setReelMuted(m=>!m)}}>
            {reelMuted ? <VolumeX size={22}/> : <Volume2 size={22}/>}
          </div>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 50%)'}}/>
          <div style={{position:'absolute',bottom:100,left:16,right:80,color:'#fff'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#F7B731,#FF6B35)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:'#fff',overflow:'hidden'}}>{currentAd.advertiser_avatar_url?<img src={currentAd.advertiser_avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(currentAd.advertiser_name?.[0]||'A')}</div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <span style={{fontWeight:700,fontSize:15,textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>{currentAd.advertiser_name}</span>
                <span style={{background:'rgba(247,183,49,0.2)',border:'1px solid rgba(247,183,49,0.4)',borderRadius:6,padding:'1px 6px',fontSize:10,color:'#F7B731',fontWeight:700}}>Sponsored</span>
              </div>
            </div>
            {currentAd.content&&<p style={{fontSize:14,lineHeight:1.5,textShadow:'0 1px 4px rgba(0,0,0,0.8)',margin:0}}>{currentAd.content}</p>}
            {currentAd.link_url&&<button onClick={()=>window.open(currentAd.link_url.startsWith('http')?currentAd.link_url:'https://'+currentAd.link_url,'_blank')} style={{marginTop:10,background:'var(--primary)',border:'none',borderRadius:20,padding:'10px 20px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>Learn More</button>}
          </div>
        </>:reel?<>
          {/* dark background while buffering — no gray flash */}
          <div style={{position:'absolute',inset:0,background:'#000',zIndex:0}}/>
          {buffering&&<div style={{position:'absolute',inset:0,zIndex:2,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
            <div style={{width:48,height:48,borderRadius:'50%',border:'3px solid rgba(255,255,255,0.15)',borderTopColor:'#fff',animation:'spin 0.8s linear infinite'}}/>
          </div>}
          <HlsVideo videoRef={videoRef} src={reel.video_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',zIndex:1,background:'#000'}}
            loop playsInline autoPlay muted={reelMuted}
            onWaiting={()=>setBuffering(true)}
            onPlaying={()=>setBuffering(false)}
            onCanPlay={()=>setBuffering(false)}
            onClick={()=>setPlaying(p=>!p)}/>
          {/* gradient overlay */}
          <div style={{position:'absolute',inset:0,zIndex:2,background:'linear-gradient(to top,rgba(0,0,0,0.75) 0%,transparent 45%)',pointerEvents:'none'}}/>
          {!playing&&<div style={{position:'absolute',inset:0,zIndex:3,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
            <div style={{width:72,height:72,borderRadius:'50%',background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center'}}><Play size={30} fill="#fff" color="#fff" style={{marginLeft:4}}/></div>
          </div>}

          {/* author + caption */}
          <div style={{position:'absolute',bottom:showComments?'52%':110,left:16,right:80,color:'#fff',zIndex:4,transition:'bottom 0.3s'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,cursor:'pointer'}} onClick={()=>onUserClick(reel.author)}>
              <Avatar url={reel.author?.avatar_url} name={reel.author?.display_name} color={reel.author?.avatar_color||'#5B9CF6'} size={38}/>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  <span style={{fontWeight:700,fontSize:15,textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>{reel.author?.display_name}</span>
                  {reel.author?.verified&&<span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:16,height:16,borderRadius:'50%',background:'linear-gradient(135deg,#1a1a2e,#16213e)',border:'1.5px solid #C9A84C',flexShrink:0}}><img src="/flitters-logo-white.svg" alt="Verified" width={9} height={9} style={{objectFit:'contain',display:'block'}}/></span>}
                  {reel.author?.is_authentic&&<span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:16,height:16,borderRadius:'50%',background:'#1877F2',flexShrink:0}}><svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'><polyline points='2,6 5,9 10,3' fill='none' stroke='#fff' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/></svg></span>}
                </div>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.7)'}}>@{reel.author?.username}</div>
              </div>
            </div>
            {reel.caption&&<p style={{fontSize:14,lineHeight:1.5,textShadow:'0 1px 4px rgba(0,0,0,0.8)',margin:0}}>{reel.caption}</p>}
          </div>

          {/* action buttons */}
          <div style={{position:'absolute',bottom:130,right:12,display:'flex',flexDirection:'column',alignItems:'center',gap:22,zIndex:4}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,cursor:'pointer'}} onClick={()=>toggleLike(reel)}>
              <Heart size={28} fill={liked[reel.id]?'var(--danger)':'none'} color={liked[reel.id]?'var(--danger)':'currentColor'}/>
              <span style={{color:'#fff',fontSize:12,fontWeight:700,textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>{likes[reel.id]||0}</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,cursor:'pointer'}} onClick={()=>openComments(reel)}>
              <MessageCircle size={26}/>
              <span style={{color:'#fff',fontSize:12,fontWeight:700,textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>{commentCounts[reel.id]||0}</span>
            </div>
            {reel.user_id===currentUser.id&&<div style={{cursor:'pointer'}} onClick={()=>deleteReel(reel)}>
              <Trash2 size={24}/>
            </div>}
            {reel.user_id!==currentUser.id&&<div style={{cursor:'pointer'}} onClick={()=>setReportingReel(reel)}>
              <AlertTriangle size={24}/>
            </div>}
            <div style={{cursor:'pointer'}} onClick={(e)=>{e.stopPropagation();setReelMuted(m=>!m)}}>
              {reelMuted ? <VolumeX size={24}/> : <Volume2 size={24}/>}
            </div>
          </div>

          {currentIdx<reels.length-1&&<div style={{position:'absolute',bottom:20,left:'50%',transform:'translateX(-50%)',color:'rgba(255,255,255,0.35)',fontSize:11,zIndex:4,display:'flex',flexDirection:'column',alignItems:'center',gap:2,pointerEvents:'none'}}>
            <ArrowRight size={14} style={{transform:'rotate(-90deg)'}}/><span>swipe up</span>
          </div>}

          {/* comments panel */}
          {showComments&&<div className="sheet-in" style={{position:'absolute',bottom:0,left:0,right:0,height:'55%',background:'rgba(10,10,15,0.97)',borderRadius:'20px 20px 0 0',zIndex:10,display:'flex',flexDirection:'column'}}>
            <div style={{padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
              <span style={{fontWeight:700,fontSize:15,color:'#fff'}}>Comments</span>
              <button onClick={()=>setShowComments(false)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer',display:'flex'}}><X size={22}/></button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'12px 16px',display:'flex',flexDirection:'column',gap:12}}>
              {comments.length===0&&<p style={{color:'rgba(255,255,255,0.55)',textAlign:'center',marginTop:20,fontSize:14}}>No comments yet. Be first!</p>}
              {comments.map(c=>(
                <div key={c.id} style={{display:'flex',gap:10,alignItems:'flex-end'}}>
                  <div style={{cursor:'pointer',flexShrink:0}} onClick={()=>{ setShowComments(false); onUserClick(c.author) }}>
                    <Avatar url={c.author?.avatar_url} name={c.author?.display_name} color={c.author?.avatar_color||'#5B9CF6'} size={32}/>
                  </div>
                  <div style={{flex:1,maxWidth:'80%'}}>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.55)',marginBottom:3,paddingLeft:4}}>{c.author?.display_name}</div>
                    <div style={{background:'rgba(255,255,255,0.09)',borderRadius:'18px 18px 18px 4px',padding:'9px 14px',display:'inline-block',maxWidth:'100%'}}>
                      <span style={{fontSize:14,color:'rgba(255,255,255,0.92)',lineHeight:1.4}}><TextWithMentions text={c.content} supabase={supabase} onUserClick={onUserClick}/></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{padding:'10px 14px',borderTop:'1px solid rgba(255,255,255,0.1)',display:'flex',gap:10,alignItems:'center',paddingBottom:'env(safe-area-inset-bottom,10px)'}}>
              <Avatar url={currentUser?.avatar_url} name={currentUser?.display_name} color={currentUser?.avatar_color||'#5B9CF6'} size={32}/>
              <input value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&postComment(reel)} placeholder="Add a comment..." style={{flex:1,background:'rgba(255,255,255,0.08)',border:'none',borderRadius:20,padding:'10px 14px',color:'#fff',fontSize:14,outline:'none'}}/>
              <button onClick={()=>postComment(reel)} disabled={!commentText.trim()} style={{background:commentText.trim()?'var(--primary)':'rgba(255,255,255,0.1)',border:'none',borderRadius:20,padding:'8px 16px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>Post</button>
            </div>
          </div>}
        </>:null}
      </div>}

      {reportingReel&&<ReportModal onClose={()=>setReportingReel(null)} onSubmit={async(reason,details)=>{
        const {error} = await supabase.from('reports').insert({reporter_id:currentUser.id, reported_reel_id:reportingReel.id, reason, details:details||null})
        if(error) throw error
      }}/>}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
