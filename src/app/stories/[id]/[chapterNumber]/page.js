'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function ChapterReaderPage() {
  const { id, chapterNumber } = useParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [story, setStory] = useState(null)
  const [chapter, setChapter] = useState(null)
  const [allChapters, setAllChapters] = useState([]) // just {chapter_number} for prev/next lookup

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth'; return }

      const chNum = parseInt(chapterNumber, 10)
      const [{ data: storyData }, { data: chapterData }, { data: chapterList }] = await Promise.all([
        supabase.from('stories').select('*').eq('id', id).maybeSingle(),
        supabase.from('story_chapters').select('*').eq('story_id', id).eq('chapter_number', chNum).maybeSingle(),
        supabase.from('story_chapters').select('chapter_number').eq('story_id', id).order('chapter_number'),
      ])
      setStory(storyData)
      setChapter(chapterData)
      setAllChapters(chapterList || [])
      setLoading(false)

      // Mark read progress — only meaningful if following; harmless no-op
      // update otherwise (0 rows affected).
      if (chapterData) {
        await supabase.from('story_follows')
          .update({ last_read_chapter: chNum })
          .eq('story_id', id).eq('user_id', session.user.id)
          .lt('last_read_chapter', chNum)
      }
    }
    init()
  }, [id, chapterNumber])

  if (loading) return (
    <div style={{minHeight:'100dvh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,0.15)',animation:'pulse 1.4s ease-in-out infinite'}}/>
      <style>{`@keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
    </div>
  )

  if (!story || !chapter) return (
    <div style={{minHeight:'100dvh',background:'#000',color:'#fff',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10}}>
      <p style={{color:'#888'}}>This chapter doesn't exist.</p>
      <a href={`/stories/${id}`} style={{color:'#5B9CF6'}}>Back to story</a>
    </div>
  )

  const chNum = parseInt(chapterNumber, 10)
  const hasPrev = allChapters.some(c => c.chapter_number === chNum - 1)
  const hasNext = allChapters.some(c => c.chapter_number === chNum + 1)

  return (
    <div style={{minHeight:'100dvh',background:'#000',color:'#fff'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(8px)',padding:'calc(14px + env(safe-area-inset-top)) 16px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
        <a href={`/stories/${id}`} style={{color:'#fff',display:'flex'}}><ChevronLeft size={24}/></a>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:15,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{story.title}</div>
          <div style={{color:'#888',fontSize:12}}>Chapter {chNum}{chapter.title ? ' — ' + chapter.title : ''}</div>
        </div>
      </div>

      <div>
        {(chapter.images || []).map((url, i) => (
          <img key={i} src={url} alt={`Page ${i+1}`} style={{width:'100%',display:'block'}} loading={i < 2 ? 'eager' : 'lazy'}/>
        ))}
      </div>

      <div style={{display:'flex',gap:10,padding:16}}>
        <a href={hasPrev ? `/stories/${id}/${chNum-1}` : undefined}
          style={{flex:1,textAlign:'center',padding:'13px',borderRadius:14,fontWeight:700,fontSize:14,textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:6,
            background: hasPrev ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)', color: hasPrev ? '#fff' : '#444', pointerEvents: hasPrev ? 'auto' : 'none'}}>
          <ChevronLeft size={16}/> Previous
        </a>
        <a href={hasNext ? `/stories/${id}/${chNum+1}` : undefined}
          style={{flex:1,textAlign:'center',padding:'13px',borderRadius:14,fontWeight:700,fontSize:14,textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:6,
            background: hasNext ? 'linear-gradient(135deg,#5B9CF6,#845EF7)' : 'rgba(255,255,255,0.03)', color: hasNext ? '#fff' : '#444', pointerEvents: hasNext ? 'auto' : 'none'}}>
          Next <ChevronRight size={16}/>
        </a>
      </div>
      {!hasNext && <p style={{textAlign:'center',color:'#666',fontSize:13,paddingBottom:20}}>{"You're caught up — that's the latest chapter."}</p>}
    </div>
  )
}
