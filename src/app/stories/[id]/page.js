'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, BookOpen } from 'lucide-react'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s/60) + 'm ago'
  if (s < 86400) return Math.floor(s/3600) + 'h ago'
  return Math.floor(s/86400) + 'd ago'
}

export default function StoryDetailPage() {
  const { id } = useParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [story, setStory] = useState(null)
  const [chapters, setChapters] = useState([])
  const [creator, setCreator] = useState(null)
  const [follow, setFollow] = useState(null) // null = not following, else { last_read_chapter }
  const [followBusy, setFollowBusy] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth'; return }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      setCurrentUser(profile)

      const { data: storyData } = await supabase.from('stories').select('*').eq('id', id).maybeSingle()
      if (!storyData) { setLoading(false); return }
      setStory(storyData)

      const [{ data: creatorData }, { data: chapterData }, { data: followData }] = await Promise.all([
        supabase.from('profiles').select('id,display_name,username,avatar_color,avatar_url').eq('id', storyData.creator_id).maybeSingle(),
        supabase.from('story_chapters').select('*').eq('story_id', id).order('chapter_number'),
        supabase.from('story_follows').select('*').eq('story_id', id).eq('user_id', session.user.id).maybeSingle(),
      ])
      setCreator(creatorData)
      setChapters(chapterData || [])
      setFollow(followData || null)
      setLoading(false)
    }
    init()
  }, [id])

  const toggleFollow = async () => {
    if (!currentUser) return
    setFollowBusy(true)
    if (follow) {
      await supabase.from('story_follows').delete().eq('story_id', id).eq('user_id', currentUser.id)
      setFollow(null)
    } else {
      const { data } = await supabase.from('story_follows').insert({ story_id: id, user_id: currentUser.id }).select().single()
      setFollow(data)
    }
    setFollowBusy(false)
  }

  if (loading) return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,borderRadius:'50%',background:'var(--bg-card-3, rgba(255,255,255,0.08))',animation:'pulse 1.4s ease-in-out infinite'}}/>
      <style>{`@keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
    </div>
  )

  if (!story) return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10}}>
      <p style={{color:'var(--text-quaternary)'}}>This story doesn't exist or was removed.</p>
      <a href="/stories" style={{color:'#5B9CF6'}}>Back to Stories</a>
    </div>
  )

  const isOwn = currentUser?.id === story.creator_id

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)',paddingBottom:40}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'calc(14px + env(safe-area-inset-top)) 16px 14px',display:'flex',alignItems:'center',gap:10}}>
        <a href="/stories" style={{color:'var(--text-primary)',display:'flex'}}><ChevronLeft size={24}/></a>
        <span style={{fontWeight:800,fontSize:18}}>Story</span>
      </div>

      <div style={{padding:16}}>
        <div style={{display:'flex',gap:14,marginBottom:16}}>
          <div style={{width:88,height:88,borderRadius:14,flexShrink:0,background:'var(--bg-card-3, rgba(255,255,255,0.08))',overflow:'hidden'}}>
            {story.cover_image_url && <img src={story.cover_image_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:19}}>{story.title}</div>
            {creator && <div style={{color:'var(--text-tertiary)',fontSize:13,marginTop:4}}>by {creator.display_name} · @{creator.username}</div>}
            <div style={{color:'var(--text-quaternary)',fontSize:12,marginTop:4}}>{chapters.length} chapter{chapters.length===1?'':'s'} · {story.status==='completed'?'Completed':'Ongoing'}</div>
          </div>
        </div>

        {story.description && <p style={{color:'var(--text-secondary)',fontSize:14,lineHeight:1.5,marginBottom:16}}>{story.description}</p>}

        {!isOwn && (
          <button onClick={toggleFollow} disabled={followBusy} style={{width:'100%',border:'none',borderRadius:14,padding:'13px',fontWeight:700,fontSize:15,cursor:'pointer',marginBottom:20,
            background: follow ? 'var(--bg-card)' : 'linear-gradient(135deg,#5B9CF6,#845EF7)', color: follow ? 'var(--text-primary)' : '#fff',
            border: follow ? '1px solid var(--border-color-2)' : 'none', opacity: followBusy?0.6:1}}>
            {follow ? 'Following ✓' : 'Follow Story'}
          </button>
        )}

        <p style={{color:'var(--text-secondary)',fontSize:13,fontWeight:600,marginBottom:10}}>CHAPTERS</p>
        {chapters.length===0 && <p style={{color:'var(--text-quaternary)',fontSize:14,padding:'20px 0',textAlign:'center'}}>No chapters published yet.</p>}
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {chapters.map(ch => {
            const unread = follow && ch.chapter_number > (follow.last_read_chapter || 0)
            return (
              <a key={ch.id} href={`/stories/${id}/${ch.chapter_number}`} style={{display:'flex',alignItems:'center',gap:12,padding:12,background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:14,textDecoration:'none',color:'var(--text-primary)'}}>
                <div style={{width:40,height:40,borderRadius:10,background:'var(--bg-card-3, rgba(255,255,255,0.08))',flexShrink:0,overflow:'hidden'}}>
                  {ch.images?.[0] && <img src={ch.images[0]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,display:'flex',alignItems:'center',gap:6}}>
                    Chapter {ch.chapter_number}{ch.title ? ' — ' + ch.title : ''}
                    {unread && <span style={{width:7,height:7,borderRadius:'50%',background:'#5B9CF6',flexShrink:0}}/>}
                  </div>
                  <div style={{color:'var(--text-quaternary)',fontSize:12,marginTop:2}}>{timeAgo(ch.published_at)}</div>
                </div>
                <BookOpen size={16} color="var(--text-quaternary)"/>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}
