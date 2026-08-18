'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadImage } from '@/lib/media/upload'
import { BookOpen, Plus, X, ChevronLeft, Image as ImageIcon, Trash2 } from 'lucide-react'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s/60) + 'm ago'
  if (s < 86400) return Math.floor(s/3600) + 'h ago'
  return Math.floor(s/86400) + 'd ago'
}

export default function StoriesPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [myStories, setMyStories] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [openStory, setOpenStory] = useState(null) // story you're managing chapters for

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth'; return }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      setCurrentUser(profile)
      await loadMyStories(session.user.id)
      setLoading(false)
    }
    init()
  }, [])

  const loadMyStories = async (userId) => {
    const { data } = await supabase.from('stories').select('*,story_chapters(id,chapter_number,title,published_at)').eq('creator_id', userId).order('updated_at', { ascending: false })
    setMyStories(data || [])
  }

  if (loading) return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,borderRadius:'50%',background:'var(--bg-card-3, rgba(255,255,255,0.08))',animation:'pulse 1.4s ease-in-out infinite'}}/>
      <style>{`@keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
    </div>
  )

  if (openStory) return (
    <ChapterManager
      story={openStory}
      supabase={supabase}
      onBack={() => { setOpenStory(null); loadMyStories(currentUser.id) }}
    />
  )

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)',paddingBottom:40}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'14px 16px',display:'flex',alignItems:'center',gap:10}}>
        <a href="/" style={{color:'var(--text-primary)',display:'flex'}}><ChevronLeft size={24}/></a>
        <span style={{fontWeight:800,fontSize:19,display:'flex',alignItems:'center',gap:8}}><BookOpen size={19}/> Stories</span>
      </div>

      <div style={{padding:'16px'}}>
        <p style={{color:'var(--text-quaternary)',fontSize:13,marginBottom:16}}>
          Following other creators' stories and browsing all stories is coming soon — for now this is where you create and manage your own.
        </p>

        <button onClick={()=>setShowCreate(true)} style={{width:'100%',background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:14,padding:'14px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:20}}>
          <Plus size={18}/> New Story
        </button>

        <p style={{color:'var(--text-secondary)',fontSize:13,fontWeight:600,marginBottom:10}}>MY STORIES</p>
        {myStories.length===0 && <p style={{color:'var(--text-quaternary)',fontSize:14,padding:'20px 0',textAlign:'center'}}>You haven't started a story yet.</p>}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {myStories.map(story => (
            <div key={story.id} onClick={()=>setOpenStory(story)} style={{display:'flex',gap:12,padding:12,background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:16,cursor:'pointer'}}>
              <div style={{width:56,height:56,borderRadius:10,flexShrink:0,background:'var(--bg-card-3, rgba(255,255,255,0.08))',overflow:'hidden'}}>
                {story.cover_image_url && <img src={story.cover_image_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:15}}>{story.title}</div>
                <div style={{color:'var(--text-tertiary)',fontSize:13,marginTop:2}}>
                  {story.story_chapters?.length || 0} chapter{story.story_chapters?.length===1?'':'s'} · {story.status==='completed'?'Completed':'Ongoing'}
                </div>
                <div style={{color:'var(--text-quaternary)',fontSize:12,marginTop:2}}>Updated {timeAgo(story.updated_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreate && (
        <CreateStoryModal
          supabase={supabase}
          currentUser={currentUser}
          onClose={()=>setShowCreate(false)}
          onCreated={(story)=>{ setShowCreate(false); loadMyStories(currentUser.id); setOpenStory(story) }}
        />
      )}
    </div>
  )
}

function CreateStoryModal({ supabase, currentUser, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const coverRef = useRef(null)

  const pickCover = (file) => {
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const create = async () => {
    if (!title.trim()) { setError('Give your story a title first'); return }
    setSaving(true)
    setError(null)
    try {
      let coverUrl = null
      if (coverFile) {
        const path = `stories/covers/${currentUser.id}-${Date.now()}-${coverFile.name}`
        const { publicUrl } = await uploadImage(coverFile, path)
        coverUrl = publicUrl
      }
      const { data, error: insertErr } = await supabase.from('stories')
        .insert({ creator_id: currentUser.id, title: title.trim(), description: description.trim() || null, cover_image_url: coverUrl })
        .select('*,story_chapters(id,chapter_number,title,published_at)').single()
      if (insertErr) throw insertErr
      onCreated(data)
    } catch (err) {
      setError(err.message || 'Could not create story')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:50,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-end'}}>
      <div style={{width:'100%',background:'var(--bg-app)',borderRadius:'20px 20px 0 0',padding:20,maxHeight:'85vh',overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <span style={{fontWeight:800,fontSize:18}}>New Story</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',display:'flex'}}><X size={22}/></button>
        </div>

        <input type="file" ref={coverRef} accept="image/*" style={{display:'none'}} onChange={e=>pickCover(e.target.files?.[0])}/>
        <div onClick={()=>coverRef.current?.click()} style={{width:'100%',height:140,borderRadius:14,background:'var(--bg-card)',border:'1px dashed var(--border-color-2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',marginBottom:14,overflow:'hidden'}}>
          {coverPreview ? <img src={coverPreview} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : (
            <div style={{textAlign:'center',color:'var(--text-quaternary)'}}><ImageIcon size={24}/><div style={{fontSize:13,marginTop:6}}>Add a cover image</div></div>
          )}
        </div>

        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Story title" style={{width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none',boxSizing:'border-box',marginBottom:10}}/>
        <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description (optional)" rows={3} style={{width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none',resize:'none',fontFamily:'sans-serif',boxSizing:'border-box',marginBottom:14}}/>

        {error && <p style={{color:'#FF4757',fontSize:13,marginBottom:10}}>{error}</p>}

        <button onClick={create} disabled={saving} style={{width:'100%',background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:14,padding:'14px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',opacity:saving?0.6:1}}>
          {saving ? 'Creating...' : 'Create Story'}
        </button>
      </div>
    </div>
  )
}

function ChapterManager({ story, supabase, onBack }) {
  const [chapters, setChapters] = useState(story.story_chapters?.sort((a,b)=>a.chapter_number-b.chapter_number) || [])
  const [showAddChapter, setShowAddChapter] = useState(false)

  const nextChapterNumber = (chapters[chapters.length-1]?.chapter_number || 0) + 1

  const reload = async () => {
    const { data } = await supabase.from('story_chapters').select('*').eq('story_id', story.id).order('chapter_number')
    setChapters(data || [])
  }

  const deleteChapter = async (chapterId) => {
    if (!window.confirm('Delete this chapter? This cannot be undone.')) return
    await supabase.from('story_chapters').delete().eq('id', chapterId)
    reload()
  }

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)',paddingBottom:40}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'14px 16px',display:'flex',alignItems:'center',gap:10}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',display:'flex'}}><ChevronLeft size={24}/></button>
        <span style={{fontWeight:800,fontSize:18}}>{story.title}</span>
      </div>

      <div style={{padding:16}}>
        <button onClick={()=>setShowAddChapter(true)} style={{width:'100%',background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:14,padding:'14px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:20}}>
          <Plus size={18}/> Add Chapter {nextChapterNumber}
        </button>

        {chapters.length===0 && <p style={{color:'var(--text-quaternary)',fontSize:14,padding:'20px 0',textAlign:'center'}}>No chapters published yet.</p>}
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {chapters.map(ch => (
            <div key={ch.id} style={{display:'flex',alignItems:'center',gap:12,padding:12,background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:14}}>
              <div style={{width:40,height:40,borderRadius:10,background:'var(--bg-card-3, rgba(255,255,255,0.08))',flexShrink:0,overflow:'hidden'}}>
                {ch.images?.[0] && <img src={ch.images[0]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14}}>Chapter {ch.chapter_number}{ch.title ? ' — ' + ch.title : ''}</div>
                <div style={{color:'var(--text-quaternary)',fontSize:12,marginTop:2}}>{ch.images?.length || 0} images · published {timeAgo(ch.published_at)}</div>
              </div>
              <button onClick={()=>deleteChapter(ch.id)} style={{background:'none',border:'none',color:'#FF4757',cursor:'pointer',display:'flex',flexShrink:0}}><Trash2 size={17}/></button>
            </div>
          ))}
        </div>
      </div>

      {showAddChapter && (
        <AddChapterModal
          story={story}
          chapterNumber={nextChapterNumber}
          supabase={supabase}
          onClose={()=>setShowAddChapter(false)}
          onAdded={()=>{ setShowAddChapter(false); reload() }}
        />
      )}
    </div>
  )
}

function AddChapterModal({ story, chapterNumber, supabase, onClose, onAdded }) {
  const [title, setTitle] = useState('')
  const [files, setFiles] = useState([]) // { file, preview }
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState(null)
  const picRef = useRef(null)

  const addFiles = (fileList) => {
    const picked = Array.from(fileList || []).map(file => ({ file, preview: URL.createObjectURL(file) }))
    setFiles(prev => [...prev, ...picked])
  }
  const removeFile = (i) => setFiles(prev => prev.filter((_,idx)=>idx!==i))

  const publish = async () => {
    if (!files.length) { setError('Add at least one image'); return }
    setSaving(true)
    setError(null)
    try {
      const urls = []
      for (let i = 0; i < files.length; i++) {
        setProgress(`Uploading image ${i+1} of ${files.length}...`)
        const path = `stories/${story.id}/ch${chapterNumber}-${Date.now()}-${i}-${files[i].file.name}`
        const { publicUrl } = await uploadImage(files[i].file, path)
        urls.push(publicUrl)
      }
      setProgress('Publishing chapter...')
      const { error: insertErr } = await supabase.from('story_chapters')
        .insert({ story_id: story.id, chapter_number: chapterNumber, title: title.trim() || null, images: urls })
      if (insertErr) throw insertErr
      onAdded()
    } catch (err) {
      setError(err.message || 'Could not publish chapter')
    } finally {
      setSaving(false)
      setProgress('')
    }
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:50,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-end'}}>
      <div style={{width:'100%',background:'var(--bg-app)',borderRadius:'20px 20px 0 0',padding:20,maxHeight:'88vh',overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <span style={{fontWeight:800,fontSize:18}}>Add Chapter {chapterNumber}</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',display:'flex'}}><X size={22}/></button>
        </div>

        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Chapter title (optional)" style={{width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none',boxSizing:'border-box',marginBottom:14}}/>

        <input type="file" ref={picRef} accept="image/*" multiple style={{display:'none'}} onChange={e=>{addFiles(e.target.files);e.target.value=''}}/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
          {files.map((f,i)=>(
            <div key={i} style={{position:'relative',aspectRatio:'1',borderRadius:10,overflow:'hidden',background:'var(--bg-card)'}}>
              <img src={f.preview} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              <button onClick={()=>removeFile(i)} style={{position:'absolute',top:4,right:4,width:22,height:22,borderRadius:'50%',background:'rgba(0,0,0,0.6)',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={13}/></button>
              <span style={{position:'absolute',bottom:4,left:4,background:'rgba(0,0,0,0.6)',color:'#fff',fontSize:10,padding:'2px 6px',borderRadius:6}}>{i+1}</span>
            </div>
          ))}
          <div onClick={()=>picRef.current?.click()} style={{aspectRatio:'1',borderRadius:10,background:'var(--bg-card)',border:'1px dashed var(--border-color-2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text-quaternary)'}}>
            <Plus size={22}/>
          </div>
        </div>
        <p style={{color:'var(--text-quaternary)',fontSize:12,marginBottom:14}}>Images publish in the order shown above — drag-to-reorder isn't in yet, so add them in reading order.</p>

        {error && <p style={{color:'#FF4757',fontSize:13,marginBottom:10}}>{error}</p>}
        {progress && <p style={{color:'var(--text-tertiary)',fontSize:13,marginBottom:10}}>{progress}</p>}

        <button onClick={publish} disabled={saving} style={{width:'100%',background:'linear-gradient(135deg,#5B9CF6,#845EF7)',border:'none',borderRadius:14,padding:'14px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',opacity:saving?0.6:1}}>
          {saving ? 'Publishing...' : 'Publish Chapter'}
        </button>
      </div>
    </div>
  )
}
