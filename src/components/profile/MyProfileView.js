'use client'
import { useEffect, useState } from 'react'
import { FileText, Heart, MapPin, MessageCircle, Repeat2, Settings } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { FeedSkeleton } from '@/components/common/Skeletons'
import { timeAgo } from '@/lib/timeAgo'
import { VerifiedBadge } from '@/components/common/VerifiedBadge'

// ── MY PROFILE ─────────────────────────────────────────────────────────────
export function MyProfileView({ currentUser, supabase, onSettings, onBack, avatarUrl }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [followerCount, setFollowerCount] = useState(null)
  const [followingCount, setFollowingCount] = useState(null)
  const color = currentUser?.avatar_color||'#5B9CF6'

  useEffect(() => {
    supabase.from('posts').select('*,likes(user_id),reposts(user_id),comments(id)').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(50)
      .then(({data})=>{
        setPosts((data||[]).map(p=>({...p,likes_count:p.likes?.length||0,reposts_count:p.reposts?.length||0,comments_count:p.comments?.length||0})))
        setLoading(false)
      })
    supabase.from('profiles').select('followers_count,following_count').eq('id',currentUser.id).single()
      .then(({data})=>{ if(data){ setFollowerCount(data.followers_count||0); setFollowingCount(data.following_count||0) } })
  },[])

  const deletePost = async (postId) => {
    await supabase.from('posts').delete().eq('id',postId).eq('user_id',currentUser.id)
    setPosts(prev=>prev.filter(p=>p.id!==postId))
  }

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'calc(12px + env(safe-area-inset-top)) 16px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',fontSize:24}}>‹</button>
        <span style={{fontWeight:700,fontSize:17}}>My Profile</span>
        <button onClick={onSettings} style={{background:'none',border:'none',color:'var(--text-subtle)',cursor:'pointer',display:'flex'}}><Settings size={22}/></button>
      </div>
      <div style={{height:110,background:`linear-gradient(135deg,${color}44,#845EF733)`}}/>
      <div style={{padding:'0 16px',marginTop:-36,marginBottom:16}}>
        <Avatar url={avatarUrl||currentUser?.avatar_url} name={currentUser?.display_name} color={color} size={72}/>
      </div>
      <div style={{padding:'0 16px 20px'}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><h2 style={{fontWeight:800,fontSize:22,margin:0}}>{currentUser?.display_name}</h2><VerifiedBadge verified={currentUser?.verified} isAuthentic={currentUser?.is_authentic} plan={currentUser?.verified_plan} size={20}/></div>
        <p style={{color:'var(--text-secondary)',fontSize:14,marginBottom:8}}>@{currentUser?.username}</p>
        {currentUser?.bio&&<p style={{color:'var(--text-subtle)',fontSize:14,lineHeight:1.6,marginBottom:10}}>{currentUser.bio}</p>}
        {currentUser?.location&&<p style={{color:'var(--text-secondary)',fontSize:13,marginBottom:10,display:'flex',alignItems:'center',gap:4}}><MapPin size={13}/> {currentUser.location}</p>}
        <div style={{display:'flex',gap:20,marginBottom:16}}>
          <span style={{fontSize:14}}><strong>{followingCount===null?'–':followingCount}</strong> <span style={{color:'var(--text-secondary)'}}>Following</span></span>
          <span style={{fontSize:14}}><strong>{followerCount===null?'–':followerCount}</strong> <span style={{color:'var(--text-secondary)'}}>Followers</span></span>
        </div>
      </div>
      <div style={{borderTop:'1px solid var(--border-color)'}}>
        <p style={{padding:'14px 16px',fontWeight:700,fontSize:15,borderBottom:'1px solid var(--border-color)'}}>My Posts</p>
        {loading&&<FeedSkeleton count={3}/>}
        {!loading&&posts.length===0&&<div style={{padding:'40px 20px',textAlign:'center'}}><div style={{display:'flex',justifyContent:'center',color:'var(--text-quaternary)'}}><FileText size={40}/></div><p style={{color:'var(--text-secondary)',marginTop:8}}>No posts yet</p></div>}
        {posts.map(post=>(
          <div key={post.id} style={{padding:'14px 16px',borderBottom:'1px solid var(--border-color)'}}>
            <p style={{color:'var(--text-primary)',fontSize:15,lineHeight:1.6,marginBottom:10}}>{post.content}</p>
            <div style={{display:'flex',gap:16,color:'var(--text-secondary)',fontSize:13,alignItems:'center'}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}><MessageCircle size={14}/> {post.comments_count}</span>
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}><Heart size={14}/> {post.likes_count}</span>
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}><Repeat2 size={14}/> {post.reposts_count}</span>
              <span style={{marginLeft:'auto'}}>{timeAgo(post.created_at)}</span>
              <button onClick={()=>{ if(confirm('Delete this post?')) deletePost(post.id) }} style={{background:'rgba(var(--danger-rgb),0.1)',border:'1px solid rgba(var(--danger-rgb),0.2)',borderRadius:8,padding:'4px 10px',color:'var(--danger)',cursor:'pointer',fontSize:12,fontWeight:600}}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
