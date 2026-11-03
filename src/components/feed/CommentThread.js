'use client'
import { CornerUpLeft, Heart, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { TextWithMentions } from '@/components/common/Linkify'
import { supabase } from '@/lib/supabase/instance'
import { timeAgo } from '@/lib/timeAgo'

export function CommentThread({ comment, depth, onUserClick, onReply, currentUser, onDelete, onReact }) {
  const hasChildren = comment.children && comment.children.length > 0
  const reactions = comment.comment_reactions || []
  const myReaction = reactions.find(r=>r.user_id===currentUser?.id)
  const isOwn = comment.user_id === currentUser?.id
  return (
    <div style={{position:'relative',marginLeft:depth>0?18:0}}>
      {depth>0&&<div style={{position:'absolute',left:-14,top:0,bottom:hasChildren?14:20,width:2,background:'var(--border-color-2)'}}/>}
      {depth>0&&<div style={{position:'absolute',left:-14,top:20,width:14,height:2,background:'var(--border-color-2)'}}/>}
      <div style={{display:'flex',gap:10,marginBottom:8,alignItems:'flex-start'}}>
        <Avatar url={comment.author?.avatar_url} name={comment.author?.display_name} color={comment.author?.avatar_color||'#5B9CF6'} size={depth>0?26:32}/>
        <div style={{flex:1,background:'var(--bg-card-4)',borderRadius:12,padding:'8px 12px',minWidth:0}}>
          <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
            <span onClick={()=>onUserClick(comment.author)} style={{fontWeight:700,fontSize:13,color:'var(--text-primary)',cursor:'pointer'}}>{comment.author?.display_name}</span>
            <span style={{color:'var(--text-secondary)',fontSize:11}}>{timeAgo(comment.created_at)}</span>
          </div>
          {comment.content&&<p style={{color:'var(--text-primary)',fontSize:14,lineHeight:1.5,margin:0,wordBreak:'break-word'}}><TextWithMentions text={comment.content} supabase={supabase} onUserClick={onUserClick}/></p>}
          {comment.image_url&&<img src={comment.image_url} style={{maxWidth:'100%',maxHeight:220,borderRadius:10,marginTop:6,display:'block'}} alt="" loading="lazy"/>}
          <div style={{display:'flex',alignItems:'center',gap:14,marginTop:6}}>
            <span onClick={()=>onReply(comment)} style={{display:'inline-flex',alignItems:'center',gap:4,color:'var(--text-tertiary)',fontSize:12,fontWeight:600,cursor:'pointer'}}><CornerUpLeft size={12}/> Reply</span>
            <span onClick={()=>onReact(comment)} style={{display:'inline-flex',alignItems:'center',gap:4,color:myReaction?'var(--like)':'var(--text-tertiary)',fontSize:12,fontWeight:600,cursor:'pointer'}}>
              <Heart size={12} fill={myReaction?'var(--like)':'none'}/> {reactions.length>0?reactions.length:''}
            </span>
            {isOwn&&<span onClick={()=>onDelete(comment)} style={{display:'inline-flex',alignItems:'center',gap:4,color:'var(--text-tertiary)',fontSize:12,fontWeight:600,cursor:'pointer',marginLeft:'auto'}}><Trash2 size={12}/></span>}
          </div>
        </div>
      </div>
      {hasChildren&&(
        <div>
          {comment.children.map(child=>(
            <CommentThread key={child.id} comment={child} depth={depth+1} onUserClick={onUserClick} onReply={onReply} currentUser={currentUser} onDelete={onDelete} onReact={onReact}/>
          ))}
        </div>
      )}
    </div>
  )
}
