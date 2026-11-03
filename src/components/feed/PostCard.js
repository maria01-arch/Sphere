'use client'
import { memo, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Camera, Heart, Link2, MessageCircle, MoreHorizontal, Pencil, Repeat2, Send, Share, Share2, Trash2, X } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { TextWithMentions } from '@/components/common/Linkify'
import { LinkPreviewCard } from '@/components/common/LinkPreviewCard'
import { ReportModal } from '@/components/common/ReportModal'
import { RowSkeletonList } from '@/components/common/Skeletons'
import { CommentThread } from '@/components/feed/CommentThread'
import { QuotedPostPreview } from '@/components/feed/QuotedPostPreview'
import { AI_MENTION_RE, triggerAiMentionReply } from '@/lib/api'
import { getColor } from '@/lib/colors'
import { useLongPress } from '@/lib/hooks/useLongPress'
import { getFirstUrl } from '@/lib/links'
import { uploadToR2 } from '@/lib/media/upload'
import { timeAgo } from '@/lib/timeAgo'

export function postCardPropsEqual(prev, next) {
  return prev.post === next.post &&
    prev.currentUser?.id === next.currentUser?.id &&
    prev.autoExpandComments === next.autoExpandComments
}

export const PostCard = memo(function PostCard({ post, currentUser, supabase, onUserClick, onDelete, onOpenPost, autoExpandComments, sendPush }) {
  const [liked, setLiked] = useState(post.user_liked||false)
  const [reposted, setReposted] = useState(post.user_reposted||false)
  const [showRepostMenu, setShowRepostMenu] = useState(false)
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [quoteText, setQuoteText] = useState('')
  const [likes, setLikes] = useState(post.likes_count||0)
  const [reposts, setReposts] = useState(post.reposts_count||0)
  const [comments, setComments] = useState(post.comments_count||0)
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [commentsList, setCommentsList] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null) // comment object being replied to, or null = replying to post
  const [replyImage, setReplyImage] = useState(null)
  const [replyImagePreview, setReplyImagePreview] = useState('')
  const [uploadingReply, setUploadingReply] = useState(false)
  const replyImageRef = useRef(null)
  const [showShareMenu, setShowShareMenu] = useState(false)

  const shareUrl = (typeof window!=='undefined'?window.location.origin:'https://xchord.space')+'/p/'+post.id
  const shareText = (post.content||(post.author?.display_name||'Someone')+' shared a post on Flitters').slice(0,100)
  const handleShare = async () => {
    if(navigator.share){
      try { await navigator.share({title:'Flitters', text:shareText, url:shareUrl}) } catch(e){ /* user cancelled — no-op */ }
    } else {
      setShowShareMenu(true)
    }
  }
  const copyShareLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl) } catch(e){}
    setShowShareMenu(false)
  }

  const loadComments = async(forceOpen) => {
    if(showComments && !forceOpen){setShowComments(false);return}
    setLoadingComments(true)
    // Comments and their reactions are fetched separately and merged here on
    // purpose. Nesting comment_reactions(...) inside one embedded select made
    // the entire query — real comments included — fail together any time
    // that embed had a problem (e.g. PostgREST's schema cache not yet aware
    // of the comment_reactions relationship). Splitting them means a broken
    // reactions fetch can never wipe out comments that already loaded fine.
    // comments now has two FK paths to profiles (its own user_id, and a
    // second one PostgREST traces through comment_reactions) — !comments_user_id_fkey
    // tells it explicitly which one we mean, or the whole query is rejected
    // with an "ambiguous relationship" error and no comments load at all.
    const {data, error} = await supabase.from('comments').select('*,author:profiles!comments_user_id_fkey(id,display_name,username,avatar_color,avatar_url)').eq('post_id',post.id).order('created_at',{ascending:true})
    if (error) {
      console.error('loadComments failed:', error)
      setCommentsList([])
      setLoadingComments(false)
      setShowComments(true)
      return
    }
    const comments = data || []
    if (comments.length) {
      const {data: reactions, error: reactErr} = await supabase.from('comment_reactions').select('comment_id,user_id,emoji').in('comment_id', comments.map(c=>c.id))
      if (reactErr) {
        console.error('loadComments: fetching comment_reactions failed (comments still shown):', reactErr)
      } else {
        const byComment = {}
        for (const r of (reactions||[])) (byComment[r.comment_id] ||= []).push({user_id:r.user_id, emoji:r.emoji})
        for (const c of comments) c.comment_reactions = byComment[c.id] || []
      }
    }
    setCommentsList(comments)
    setLoadingComments(false)
    setShowComments(true)
  }

  useEffect(() => {
    if (autoExpandComments) loadComments(true)
  }, [autoExpandComments])

  const deleteComment = async (comment) => {
    setCommentsList(prev => prev.filter(c => c.id !== comment.id))
    setComments(c => Math.max(0, c-1))
    await supabase.from('comments').delete().eq('id', comment.id)
  }

  const toggleCommentReaction = async (comment, emoji='❤️') => {
    const mine = comment.comment_reactions?.find(r=>r.user_id===currentUser.id)
    const patch = (list) => list.map(c => c.id!==comment.id ? c : {
      ...c,
      comment_reactions: mine && mine.emoji===emoji
        ? (c.comment_reactions||[]).filter(r=>r.user_id!==currentUser.id)
        : [...(c.comment_reactions||[]).filter(r=>r.user_id!==currentUser.id), {user_id:currentUser.id, emoji}]
    })
    setCommentsList(prev => patch(prev))
    if (mine && mine.emoji===emoji) {
      await supabase.from('comment_reactions').delete().eq('comment_id',comment.id).eq('user_id',currentUser.id)
    } else {
      await supabase.from('comment_reactions').upsert({comment_id:comment.id,user_id:currentUser.id,emoji},{onConflict:'comment_id,user_id'})
    }
  }

  const a = post.author||{}
  const color = a.avatar_color||getColor(a.id)
  const isOwn = a.id === currentUser.id
  // A quote-repost (a repost with the reposter's own caption) shows the
  // reposter as the header author and their caption as the body text — the
  // original post becomes a compact QuotedPostPreview card instead of being
  // rendered in full, so it reads as "their card, your caption" rather than
  // looking like an indistinguishable duplicate of a normal post.
  // Every repost — with or without an added caption — now uses the same
  // "reposter's header + compact original-post card" layout. A plain repost
  // just has no caption text to show, so only the header + QuotedPostPreview
  // render below it.
  const isQuote = !!post.isRepost
  const headerUser = isQuote ? (post.reposter||{}) : a
  const headerColor = isQuote ? (headerUser.avatar_color||getColor(headerUser.id)) : color
  const headerTime = isQuote ? (post.sortTime||post.created_at) : post.created_at
  const bodyText = isQuote ? post.quoteContent : post.content
  const [fullscreenImg, setFullscreenImg] = useState(null)
  const imageLongPress = useLongPress(()=>setFullscreenImg(post.image_url))
  const [showPostMenu, setShowPostMenu] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  const likeInFlight = useRef(false)
  const repostInFlight = useRef(false)
  const replyInFlight = useRef(false)

  const toggleLike = async () => {
    if (likeInFlight.current) return
    likeInFlight.current = true
    try {
      const next = !liked
      setLiked(next); setLikes(l=>next?l+1:l-1)
      if (next) {
        const {error} = await supabase.from('likes').insert({post_id:post.id,user_id:currentUser.id})
        if (error) { setLiked(!next); setLikes(l=>next?l-1:l+1) }
        else if (post.user_id !== currentUser.id) {
          await supabase.from('notifications').insert({user_id:post.user_id,actor_id:currentUser.id,type:'like',post_id:post.id})
          sendPush&&sendPush(post.user_id, 'New Like', (currentUser.display_name||'Someone')+' liked your post')
        }
      } else {
        await supabase.from('likes').delete().eq('post_id',post.id).eq('user_id',currentUser.id)
      }
    } finally { likeInFlight.current = false }
  }

  const toggleRepost = async (content=null) => {
    if (repostInFlight.current) return
    repostInFlight.current = true
    try {
      const next = !reposted
      setReposted(next); setReposts(r=>next?r+1:r-1)
      if (next) {
        const {error} = await supabase.from('reposts').insert({post_id:post.id,user_id:currentUser.id,content:content||null})
        if (error) { setReposted(!next); setReposts(r=>next?r-1:r+1) }
        else if (post.user_id !== currentUser.id) await supabase.from('notifications').insert({user_id:post.user_id,actor_id:currentUser.id,type:'repost',post_id:post.id})
      } else {
        await supabase.from('reposts').delete().eq('post_id',post.id).eq('user_id',currentUser.id)
      }
    } finally { repostInFlight.current = false }
  }

  const submitReply = async () => {
    if (replyInFlight.current) return
    if (!replyText.trim() && !replyImage) return
    replyInFlight.current = true
    setUploadingReply(true)
    try {
      let imageUrl = null
      if (replyImage) {
        const ext = replyImage.name.split('.').pop()
        const path = `comments/${currentUser.id}_${Date.now()}.${ext}`
        try {
          const urlData = await uploadToR2(replyImage, path)
          imageUrl = urlData.publicUrl
        } catch { /* image is optional on a reply — fall through without it */ }
      }
      const { data: newComment, error } = await supabase.from('comments').insert({
        post_id: post.id,
        user_id: currentUser.id,
        content: replyText.trim(),
        reply_to_comment_id: replyingTo?.id || null,
        image_url: imageUrl
      }).select('id').single()
      if (!error) {
        setComments(c=>c+1)
        const mentionedAi = AI_MENTION_RE.test(replyText)
        const sentText = replyText.trim()
        setReplyText('')
        setReplyImage(null)
        setReplyImagePreview('')
        setShowReply(false)
        setReplyingTo(null)
        if (autoExpandComments) loadComments(true) // refresh thread so the new reply appears immediately, only when the thread is already showing
        if (post.user_id !== currentUser.id) {
          await supabase.from('notifications').insert({user_id:post.user_id,actor_id:currentUser.id,type:'comment',post_id:post.id})
          sendPush&&sendPush(post.user_id, 'New Comment', (currentUser.display_name||'Someone')+' commented on your post')
        }
        if (mentionedAi) {
          triggerAiMentionReply({ postId: post.id, postContent: post.content, mentionText: sentText, mentionCommentId: newComment?.id })
        }
      }
    } finally {
      setUploadingReply(false)
      replyInFlight.current = false
    }
  }

  const pickReplyImage = (file) => {
    if (!file) return
    setReplyImage(file)
    setReplyImagePreview(URL.createObjectURL(file))
  }

  const startReply = (comment) => {
    setReplyingTo(comment)
    setShowReply(true)
  }

  // Build a nested tree from the flat comments list using reply_to_comment_id
  const buildCommentTree = (list) => {
    const byId = {}
    list.forEach(c => { byId[c.id] = { ...c, children: [] } })
    const roots = []
    list.forEach(c => {
      if (c.reply_to_comment_id && byId[c.reply_to_comment_id]) {
        byId[c.reply_to_comment_id].children.push(byId[c.id])
      } else {
        roots.push(byId[c.id])
      }
    })
    return roots
  }

  return (
    <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border-color)'}}>
      <div style={{display:'flex',gap:12}}>
        <button onClick={()=>onUserClick(headerUser)} style={{background:'none',border:'none',padding:0,cursor:'pointer',flexShrink:0}}>
          <Avatar url={headerUser.avatar_url} name={headerUser.display_name} color={headerColor} size={44}/>
        </button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:6,justifyContent:'space-between'}}>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <button onClick={()=>onUserClick(headerUser)} style={{background:'none',border:'none',padding:0,cursor:'pointer',color:'var(--text-primary)',fontWeight:700,fontSize:15}}>{headerUser.display_name}</button>
              {isQuote&&<span title="Reposted with comment" style={{display:'inline-flex',color:'var(--text-tertiary)'}}><Repeat2 size={13}/></span>}
              {headerUser.verified&&<span title='Flitters Verified Member' style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:20,height:20,borderRadius:'50%',background:'linear-gradient(135deg,#1a1a2e,#16213e)',border:'2px solid #C9A84C',boxShadow:'0 0 6px rgba(201,168,76,0.6)',flexShrink:0,cursor:'default'}}><img src="/flitters-logo-white.svg" alt="Verified" width={12} height={12} style={{objectFit:'contain',display:'block'}}/></span>}{headerUser.is_authentic&&<span title='Authentic — Real & Verified Person' style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:18,height:18,flexShrink:0,cursor:'default'}}><svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'><path d='M12 2L14.4 4.8L18 4L18.8 7.6L22 9.2L20.4 12.6L22 16L18.8 17.6L18 21.2L14.4 20.4L12 23.2L9.6 20.4L6 21.2L5.2 17.6L2 16L3.6 12.6L2 9.2L5.2 7.6L6 4L9.6 4.8Z' fill='#1877F2'/><polyline points='8,12.5 10.5,15 16,9' fill='none' stroke='#fff' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/></svg></span>}
              <span style={{color:'var(--text-faint)'}}>·</span>
              <span style={{color:'var(--text-quaternary)',fontSize:12}}>{timeAgo(headerTime)}</span>
            </div>
            {isOwn&&<button onClick={()=>{if(window.confirm('Delete this post?'))onDelete(post.id)}} style={{background:'none',border:'none',color:'var(--text-secondary)',cursor:'pointer',padding:'2px 6px',display:'flex'}}><Trash2 size={15}/></button>}
            {!isOwn&&<div style={{position:'relative'}}>
              <button onClick={()=>setShowPostMenu(v=>!v)} style={{background:'none',border:'none',color:'var(--text-secondary)',cursor:'pointer',padding:'2px 6px',display:'flex'}}><MoreHorizontal size={17}/></button>
              {showPostMenu&&<>
                <div onClick={()=>setShowPostMenu(false)} style={{position:'fixed',inset:0,zIndex:19}}/>
                <div style={{position:'absolute',top:'100%',right:0,marginTop:4,background:'var(--bg-card-8)',border:'1px solid var(--border-color-2)',borderRadius:12,overflow:'hidden',zIndex:20,minWidth:140,boxShadow:'0 8px 24px var(--shadow-color)'}}>
                  <button onClick={()=>{setShowPostMenu(false);setShowReportModal(true)}} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'11px 14px',background:'none',border:'none',color:'var(--danger)',cursor:'pointer',fontSize:13,fontWeight:600,textAlign:'left'}}><AlertTriangle size={14}/> Report</button>
                </div>
              </>}
            </div>}
          </div>
          {bodyText&&<p onClick={()=>!autoExpandComments && onOpenPost && !isQuote && onOpenPost(post.id)} style={{color:'var(--text-primary)',fontSize:15,lineHeight:1.65,marginBottom:12,wordBreak:'break-word',cursor:(!autoExpandComments&&onOpenPost&&!isQuote)?'pointer':'default'}}><TextWithMentions text={bodyText} supabase={supabase} onUserClick={onUserClick}/></p>}
          {isQuote ? (
            <QuotedPostPreview post={post} onOpen={onOpenPost} onUserClick={onUserClick}/>
          ) : (<>
            {!post.image_url&&post.content&&getFirstUrl(post.content)&&<div style={{marginBottom:12}}><LinkPreviewCard url={getFirstUrl(post.content)}/></div>}
            {post.image_url&&<img {...imageLongPress} onClick={(e)=>{ if(imageLongPress.didFire()){e.preventDefault();return} !autoExpandComments && onOpenPost && onOpenPost(post.id) }} src={post.image_url} style={{width:'100%',borderRadius:12,marginBottom:12,maxHeight:400,objectFit:'cover',cursor:(!autoExpandComments&&onOpenPost)?'pointer':'default',WebkitTouchCallout:'none',userSelect:'none'}} alt="post" loading="lazy"/>}
          </>)}
          <div style={{display:'flex'}}>
            <button onClick={()=>{setReplyingTo(null);setShowReply(v=>!v)}} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,background:'none',border:'none',cursor:'pointer',color:(showComments||showReply)?'var(--primary)':'var(--text-secondary)',fontSize:13,padding:'6px 0'}}>
              <MessageCircle size={16}/><span>{comments}</span>
            </button>
            <button onClick={()=>reposted?toggleRepost():setShowRepostMenu(true)} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,background:'none',border:'none',cursor:'pointer',color:reposted?'var(--repost)':'var(--text-secondary)',fontSize:13,padding:'6px 0'}}>
              <Repeat2 size={16}/><span>{reposts}</span>
            </button>
            <button onClick={toggleLike} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,background:'none',border:'none',cursor:'pointer',color:liked?'var(--like)':'var(--text-secondary)',fontSize:13,padding:'6px 0'}}>
              <Heart size={16} fill={liked?'var(--like)':'none'} color={liked?'var(--like)':'currentColor'}/><span>{likes}</span>
            </button>
            <button onClick={handleShare} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,background:'none',border:'none',cursor:'pointer',color:'var(--text-secondary)',fontSize:13,padding:'6px 0'}}>
              <Share size={16}/>
            </button>
          </div>
          {showShareMenu&&(
            <div onClick={()=>setShowShareMenu(false)} style={{position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
              <div onClick={e=>e.stopPropagation()} className="sheet-in" style={{width:'100%',maxWidth:600,background:'var(--bg-app)',borderRadius:'20px 20px 0 0',padding:'20px',display:'flex',flexDirection:'column',gap:6}}>
                <div style={{fontWeight:700,fontSize:15,color:'var(--text-primary)',marginBottom:6}}>Share this post</div>
                <button onClick={copyShareLink} style={{display:'flex',alignItems:'center',gap:12,background:'none',border:'none',padding:'12px 4px',cursor:'pointer',color:'var(--text-primary)',fontSize:15,textAlign:'left'}}><Link2 size={19}/> Copy link</button>
                <a href={`https://wa.me/?text=${encodeURIComponent(shareText+' '+shareUrl)}`} target="_blank" rel="noopener noreferrer" onClick={()=>setShowShareMenu(false)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 4px',cursor:'pointer',color:'#25D366',fontSize:15,textDecoration:'none',fontWeight:600}}><MessageCircle size={19}/> WhatsApp</a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" onClick={()=>setShowShareMenu(false)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 4px',cursor:'pointer',color:'#1877F2',fontSize:15,textDecoration:'none',fontWeight:600}}><Share2 size={19}/> Facebook</a>
                <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" onClick={()=>setShowShareMenu(false)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 4px',cursor:'pointer',color:'var(--text-primary)',fontSize:15,textDecoration:'none',fontWeight:600}}><Share2 size={19}/> X (Twitter)</a>
                <button onClick={()=>setShowShareMenu(false)} style={{marginTop:8,background:'var(--bg-card)',border:'none',borderRadius:14,padding:'12px',color:'var(--text-secondary)',fontWeight:700,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          )}
          {showComments&&(
            <div className="sheet-in" style={{marginTop:12,borderTop:'1px solid var(--border-color)',paddingTop:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <span style={{color:'var(--text-tertiary)',fontSize:13}}>{comments} {comments===1?'comment':'comments'}</span>
                <button onClick={()=>{setReplyingTo(null);setShowReply(!showReply)}} style={{background:'rgba(var(--primary-rgb),0.1)',border:'1px solid rgba(var(--primary-rgb),0.2)',borderRadius:16,padding:'5px 12px',color:'var(--primary)',cursor:'pointer',fontSize:13,fontWeight:600}}>+ Reply</button>
              </div>
              {loadingComments&&<RowSkeletonList count={2}/>}
              {buildCommentTree(commentsList).map(cm=>(
                <CommentThread key={cm.id} comment={cm} depth={0} onUserClick={onUserClick} onReply={startReply} currentUser={currentUser} onDelete={deleteComment} onReact={toggleCommentReaction}/>
              ))}
              {!loadingComments&&commentsList.length===0&&<p style={{color:'var(--text-quaternary)',fontSize:13,textAlign:'center'}}>No comments yet</p>}
            </div>
          )}
          {showReply&&(
            <div style={{marginTop:10}}>
              {replyingTo&&(
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--bg-card-4)',borderRadius:10,padding:'6px 10px',marginBottom:8,fontSize:12,color:'var(--text-tertiary)'}}>
                  <span>Replying to <strong style={{color:'var(--text-primary)'}}>{replyingTo.author?.display_name}</strong></span>
                  <span onClick={()=>setReplyingTo(null)} style={{cursor:'pointer',color:'var(--text-secondary)',display:'flex'}}><X size={16}/></span>
                </div>
              )}
              {replyImagePreview&&(
                <div style={{position:'relative',display:'inline-block',marginBottom:8}}>
                  <img src={replyImagePreview} style={{maxHeight:120,borderRadius:10,display:'block'}} alt="" loading="lazy"/>
                  <span onClick={()=>{setReplyImage(null);setReplyImagePreview('')}} style={{position:'absolute',top:-8,right:-8,background:'var(--danger)',borderRadius:'50%',width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',cursor:'pointer'}}><X size={13}/></span>
                </div>
              )}
              <div style={{display:'flex',gap:8,alignItems:'center',minWidth:0}}>
                <Avatar url={currentUser.avatar_url} name={currentUser.display_name} color={currentUser.avatar_color||'#5B9CF6'} size={28}/>
                <div style={{position:'relative',flex:1,minWidth:0}}>
                  <input value={replyText} onChange={e=>setReplyText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitReply()} placeholder={replyingTo?'Write a reply...':'Write a comment...'} autoFocus
                    style={{width:'100%',minWidth:0,background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:20,padding:'8px 38px 8px 14px',color:'var(--text-primary)',fontSize:14,outline:'none'}}/>
                  <input ref={replyImageRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>pickReplyImage(e.target.files?.[0])}/>
                  <button onClick={()=>replyImageRef.current?.click()} style={{position:'absolute',right:4,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--text-tertiary)',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',width:28,height:28}}><Camera size={15}/></button>
                </div>
                <button onClick={submitReply} disabled={uploadingReply} style={{background:'var(--primary)',border:'none',borderRadius:'50%',width:34,height:34,color:'#fff',cursor:'pointer',flexShrink:0,opacity:uploadingReply?0.6:1,display:'flex',alignItems:'center',justifyContent:'center'}}>{uploadingReply?'...':<Send size={15}/>}</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showRepostMenu && (
        <div onClick={()=>setShowRepostMenu(false)} style={{position:'fixed',inset:0,zIndex:700,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-end'}}>
          <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'var(--bg-app)',borderRadius:'20px 20px 0 0',padding:'20px 16px calc(20px + env(safe-area-inset-bottom))'}}>
            <button onClick={()=>{setShowRepostMenu(false);toggleRepost()}} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 8px',background:'none',border:'none',color:'var(--text-primary)',fontSize:15,fontWeight:600,cursor:'pointer',textAlign:'left'}}>
              <Repeat2 size={20}/> Repost
            </button>
            <button onClick={()=>{setShowRepostMenu(false);setShowQuoteModal(true)}} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 8px',background:'none',border:'none',color:'var(--text-primary)',fontSize:15,fontWeight:600,cursor:'pointer',textAlign:'left'}}>
              <Pencil size={20}/> Quote (add your own text)
            </button>
          </div>
        </div>
      )}

      {showQuoteModal && (
        <div style={{position:'fixed',inset:0,zIndex:700,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-end'}}>
          <div style={{width:'100%',background:'var(--bg-app)',borderRadius:'20px 20px 0 0',padding:'20px 16px calc(20px + env(safe-area-inset-bottom))'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <span style={{fontWeight:800,fontSize:17}}>Quote</span>
              <button onClick={()=>{setShowQuoteModal(false);setQuoteText('')}} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',display:'flex'}}><X size={22}/></button>
            </div>
            <textarea value={quoteText} onChange={e=>setQuoteText(e.target.value)} placeholder="Add a comment..." autoFocus rows={3}
              style={{width:'100%',boxSizing:'border-box',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:14,padding:'12px 14px',color:'var(--text-primary)',fontSize:15,outline:'none',resize:'none',fontFamily:'sans-serif',marginBottom:12}}/>
            <div style={{border:'1px solid var(--border-color-2)',borderRadius:14,padding:12,marginBottom:16,display:'flex',gap:10}}>
              <Avatar url={post.author?.avatar_url} name={post.author?.display_name} color={post.author?.avatar_color||'#5B9CF6'} size={32}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13}}>{post.author?.display_name}</div>
                <div style={{color:'var(--text-tertiary)',fontSize:13,overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{post.content}</div>
              </div>
            </div>
            <button onClick={()=>{toggleRepost(quoteText.trim()||null);setShowQuoteModal(false);setQuoteText('')}} style={{width:'100%',background:'var(--primary)',border:'none',borderRadius:14,padding:'14px',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer'}}>
              Repost
            </button>
          </div>
        </div>
      )}

      {fullscreenImg&&<div onClick={()=>setFullscreenImg(null)} style={{position:'fixed',inset:0,zIndex:999,background:'rgba(0,0,0,0.95)',display:'flex',alignItems:'center',justifyContent:'center'}}><img src={fullscreenImg} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} alt="" loading="lazy"/></div>}
      {showReportModal&&<ReportModal onClose={()=>setShowReportModal(false)} onSubmit={async(reason,details)=>{
        const {error} = await supabase.from('reports').insert({reporter_id:currentUser.id, reported_post_id:post.id, reason, details:details||null})
        if(error) throw error
      }}/>}
    </div>
  )
}, postCardPropsEqual)
