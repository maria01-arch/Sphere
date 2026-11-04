'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle, Ban, MapPin, MessageCircle, MoreHorizontal } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { ReportModal } from '@/components/common/ReportModal'
import { FeedSkeleton } from '@/components/common/Skeletons'
import { PostCard } from '@/components/feed/PostCard'
import { getColor } from '@/lib/colors'

// ── USER PROFILE ───────────────────────────────────────────────────────────
export function UserProfileView({ user, currentUser, supabase, onBack, onMessage, onOpenPost, sendPush }) {
  const [posts, setPosts] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [showBigAvatar, setShowBigAvatar] = useState(false)
  const [followerCount, setFollowerCount] = useState(null)
  const [followingCount, setFollowingCount] = useState(null)
  const [profile, setProfile] = useState(user)
  const [loading, setLoading] = useState(true)
  const [isBlocked, setIsBlocked] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const color = profile?.avatar_color || getColor(profile?.id)

  useEffect(() => {
    if (!user) return
    // fetch full fresh profile so badges and counts are always accurate
    supabase.from('profiles').select('*').eq('id',user.id).single()
      .then(({data})=>{
        if(data){
          // This account is Flitters AI, always — if its DB row still has an
          // old display_name/username from before the app's rebrand, don't
          // let that leak into the UI. Everything else about the row (real
          // user profiles) is trusted as-is.
          const merged = user.id==='omnicore-ai' ? {...data,display_name:'Flitters AI',username:'flittersai',avatar_url:'/flitters-ai-icon.png'} : data
          setProfile(merged); setFollowerCount(data.followers_count||0); setFollowingCount(data.following_count||0)
        }
      })
    supabase.from('posts').select('*,likes(user_id),reposts(user_id),comments(id)').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50)
      .then(({data}) => { setPosts((data||[]).map(p=>({...p,likes_count:p.likes?.length||0,reposts_count:p.reposts?.length||0,comments_count:p.comments?.length||0,user_liked:p.likes?.some(l=>l.user_id===currentUser.id)}))); setLoading(false) })
    supabase.from('follows').select('id').eq('follower_id',currentUser.id).eq('following_id',user.id).maybeSingle()
      .then(({data}) => setIsFollowing(!!data))
    supabase.from('blocks').select('id').eq('blocker_id',currentUser.id).eq('blocked_id',user.id).maybeSingle()
      .then(({data}) => setIsBlocked(!!data))
  }, [user])

  const toggleFollow = async () => {
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id',currentUser.id).eq('following_id',user.id)
      setFollowerCount(c=>c-1)
    } else {
      await supabase.from('follows').insert({follower_id:currentUser.id,following_id:user.id})
      setFollowerCount(c=>c+1)
    }
    setIsFollowing(!isFollowing)
  }

  const toggleBlock = async () => {
    setShowMenu(false)
    if (isBlocked) {
      await supabase.from('blocks').delete().eq('blocker_id',currentUser.id).eq('blocked_id',user.id)
      setIsBlocked(false)
    } else {
      setShowBlockConfirm(true)
    }
  }
  const confirmBlock = async () => {
    setShowBlockConfirm(false)
    await supabase.from('blocks').insert({blocker_id:currentUser.id,blocked_id:user.id})
    // blocking implies unfollowing each other
    await supabase.from('follows').delete().eq('follower_id',currentUser.id).eq('following_id',user.id)
    await supabase.from('follows').delete().eq('follower_id',user.id).eq('following_id',currentUser.id)
    setIsBlocked(true)
    setIsFollowing(false)
  }

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'calc(12px + env(safe-area-inset-top)) 16px 12px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',fontSize:24,padding:0}}>‹</button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>{profile?.display_name}</span>
        {profile?.id !== currentUser.id && <div style={{position:'relative'}}>
          <button onClick={()=>setShowMenu(m=>!m)} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',display:'flex'}}><MoreHorizontal size={20}/></button>
          {showMenu && <>
            <div onClick={()=>setShowMenu(false)} style={{position:'fixed',inset:0,zIndex:20}}/>
            <div style={{position:'absolute',top:'100%',right:0,marginTop:6,background:'var(--bg-card-8)',border:'1px solid var(--border-color-2)',borderRadius:12,overflow:'hidden',zIndex:21,minWidth:160,boxShadow:'0 8px 30px var(--shadow-color)'}}>
              <button onClick={toggleBlock} style={{display:'flex',alignItems:'center',gap:10,width:'100%',background:'none',border:'none',padding:'12px 16px',color:'var(--danger)',cursor:'pointer',fontSize:14,fontWeight:600,textAlign:'left'}}>
                <Ban size={16}/> {isBlocked?'Unblock':'Block'} @{profile?.username}
              </button>
              <button onClick={()=>{setShowMenu(false);setShowReportModal(true)}} style={{display:'flex',alignItems:'center',gap:10,width:'100%',background:'none',border:'none',borderTop:'1px solid var(--border-color)',padding:'12px 16px',color:'var(--danger)',cursor:'pointer',fontSize:14,fontWeight:600,textAlign:'left'}}>
                <AlertTriangle size={16}/> Report @{profile?.username}
              </button>
            </div>
          </>}
        </div>}
      </div>
      <div style={{height:120,background:`linear-gradient(135deg,${color}44,#845EF733)`}}/>
      {showBigAvatar&&profile?.avatar_url&&<div onClick={()=>setShowBigAvatar(false)} style={{position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,0.9)',display:'flex',alignItems:'center',justifyContent:'center'}}><img src={profile.avatar_url} onError={()=>setShowBigAvatar(false)} style={{width:'90vw',height:'90vw',maxWidth:400,maxHeight:400,borderRadius:'50%',objectFit:'cover'}} alt="" loading="lazy"/></div>}
      <div style={{padding:'0 16px',marginTop:-36,marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
        <div onClick={()=>setShowBigAvatar(true)} style={{cursor:'pointer'}}>
          <Avatar url={profile?.avatar_url} name={profile?.display_name} color={color} size={72}/>
        </div>
        <div style={{display:'flex',gap:8}}>
          {profile?.id !== currentUser.id && (isBlocked ? (
            <button onClick={toggleBlock} style={{background:'var(--bg-card)',border:'1px solid rgba(var(--danger-rgb),0.3)',borderRadius:20,padding:'8px 16px',color:'var(--danger)',cursor:'pointer',fontWeight:700,fontSize:13,display:'inline-flex',alignItems:'center',gap:6}}><Ban size={14}/> Blocked · Tap to unblock</button>
          ) : <>
            <div onClick={()=>onMessage(profile)} style={{background:'var(--bg-card-6)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:20,padding:'8px 16px',color:'var(--text-primary)',cursor:'pointer',fontWeight:600,fontSize:13,WebkitTapHighlightColor:'rgba(255,255,255,0.2)',userSelect:'none',display:'inline-flex',alignItems:'center',gap:6}}><MessageCircle size={15}/> Message</div>
            <button onClick={toggleFollow} style={{background:isFollowing?'var(--bg-card)':'var(--primary)',border:isFollowing?'1px solid rgba(255,255,255,0.15)':'none',borderRadius:20,padding:'8px 16px',color:'var(--text-primary)',cursor:'pointer',fontWeight:700,fontSize:13}}>
              {isFollowing?'Following':'Follow'}
            </button>
          </>)}
        </div>
      </div>
      {showBlockConfirm && (
        <div onClick={()=>setShowBlockConfirm(false)} style={{position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-app)',borderRadius:18,padding:22,maxWidth:340,width:'100%'}}>
            <div style={{display:'flex',justifyContent:'center',color:'var(--danger)',marginBottom:10}}><Ban size={30}/></div>
            <p style={{fontWeight:700,fontSize:16,textAlign:'center',marginBottom:8}}>Block @{profile?.username}?</p>
            <p style={{color:'var(--text-secondary)',fontSize:13,textAlign:'center',marginBottom:18,lineHeight:1.5}}>They won't be able to follow you or message you, and you won't see each other's posts. You can unblock them anytime from Settings.</p>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowBlockConfirm(false)} style={{flex:1,padding:'12px',borderRadius:14,border:'none',background:'var(--bg-card)',color:'var(--text-primary)',fontWeight:700,cursor:'pointer'}}>Cancel</button>
              <button onClick={confirmBlock} style={{flex:1,padding:'12px',borderRadius:14,border:'none',background:'var(--danger)',color:'#fff',fontWeight:700,cursor:'pointer'}}>Block</button>
            </div>
          </div>
        </div>
      )}
      <div style={{padding:'0 16px 16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><h2 style={{fontWeight:800,fontSize:20,margin:0}}>{profile?.display_name}</h2>{profile?.verified&&<span title='Flitters Verified Member' style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:20,height:20,borderRadius:'50%',background:'linear-gradient(135deg,#1a1a2e,#16213e)',border:'2px solid #C9A84C',boxShadow:'0 0 6px rgba(201,168,76,0.6)',flexShrink:0,cursor:'default'}}><img src="/flitters-logo-white.svg" alt="Verified" width={12} height={12} style={{objectFit:'contain',display:'block'}}/></span>}{profile?.is_authentic&&<span title='Authentic — Real & Verified Person' style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:20,height:20,flexShrink:0,cursor:'default'}}><svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><path d='M12 2L14.4 4.8L18 4L18.8 7.6L22 9.2L20.4 12.6L22 16L18.8 17.6L18 21.2L14.4 20.4L12 23.2L9.6 20.4L6 21.2L5.2 17.6L2 16L3.6 12.6L2 9.2L5.2 7.6L6 4L9.6 4.8Z' fill='#1877F2'/><polyline points='8,12.5 10.5,15 16,9' fill='none' stroke='#fff' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/></svg></span>}</div>
        </div>
        <p style={{color:'var(--text-secondary)',fontSize:14,marginBottom:8}}>@{profile?.username}</p>
        {profile?.bio&&<p style={{color:'var(--text-subtle)',fontSize:14,lineHeight:1.6,marginBottom:10}}>{profile.bio}</p>}
        {profile?.location&&<p style={{color:'var(--text-secondary)',fontSize:13,marginBottom:8,display:'flex',alignItems:'center',gap:4}}><MapPin size={13}/> {profile.location}</p>}
        <div style={{display:'flex',gap:20}}>
          <span style={{fontSize:14}}><strong>{followingCount===null?'–':followingCount}</strong> <span style={{color:'var(--text-secondary)'}}>Following</span></span>
          <span style={{fontSize:14}}><strong>{followerCount===null?'–':followerCount}</strong> <span style={{color:'var(--text-secondary)'}}>Followers</span></span>
        </div>
      </div>
      <div style={{borderTop:'1px solid var(--border-color)'}}>
        <p style={{padding:'14px 16px',fontWeight:700,fontSize:15}}>Posts</p>
        {isBlocked && <p style={{padding:'20px',textAlign:'center',color:'var(--text-quaternary)'}}>You've blocked this account</p>}
        {!isBlocked && loading&&<FeedSkeleton count={3}/>}
        {!isBlocked && !loading&&posts.length===0&&<p style={{padding:'20px',textAlign:'center',color:'var(--text-quaternary)'}}>No posts yet</p>}
        {!isBlocked && posts.map(post=>(
          <PostCard key={post.id} post={{...post,author:profile}} currentUser={currentUser} supabase={supabase} onUserClick={()=>{}} onDelete={null} onOpenPost={onOpenPost} sendPush={sendPush}/>
        ))}
      </div>
      {showReportModal&&<ReportModal onClose={()=>setShowReportModal(false)} onSubmit={async(reason,details)=>{
        const {error} = await supabase.from('reports').insert({reporter_id:currentUser.id, reported_user_id:profile.id, reason, details:details||null})
        if(error) throw error
      }}/>}
    </div>
  )
}
