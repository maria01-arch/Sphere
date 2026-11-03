'use client'
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Copy, CornerUpLeft, Globe, Image as ImageIcon, Inbox, Link2, Loader2, Lock, LogOut, Mic, Pencil, Send, Settings, Smile, Trash2, Users } from 'lucide-react'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ReplyComposerBar } from '@/components/chat/ReplyBars'
import { StickerTray } from '@/components/chat/StickerTray'
import { VoiceRecordingBar } from '@/components/chat/VoiceMessage'
import { Avatar } from '@/components/common/Avatar'
import { ReportModal } from '@/components/common/ReportModal'
import { ChatSkeleton } from '@/components/common/Skeletons'
import { QUICK_REACTIONS } from '@/lib/constants'
import { isMissingColumnError } from '@/lib/dbUtils'
import { useVoiceRecorder } from '@/lib/hooks/useVoiceRecorder'
import { uploadToR2 } from '@/lib/media/upload'
import { timeAgo } from '@/lib/timeAgo'

export function GroupChat({ group, currentUser, supabase, onBack, onUserClick, onRead }) {
  const [messages, setMessages] = useState([])
  const [members, setMembers] = useState([])
  const [msgText, setMsgText] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [showRequests, setShowRequests] = useState(false)
  const [joinRequests, setJoinRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMsg, setSelectedMsg] = useState(null)
  const [reportingMsg, setReportingMsg] = useState(null)
  const [editingMsg, setEditingMsg] = useState(null)
  const [editText, setEditText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [replyToId, setReplyToId] = useState(null)
  const [highlightMsgId, setHighlightMsgId] = useState(null)
  const highlightTimer = useRef(null)
  const scrollToMessage = (id) => {
    if(!id) return
    document.getElementById('gcmsg-'+id)?.scrollIntoView({behavior:'smooth',block:'center'})
    setHighlightMsgId(id)
    clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(()=>setHighlightMsgId(null),1200)
  }
  const longPressTimer = useRef(null)
  const [fullscreenImg, setFullscreenImg] = useState(null)
  const gcChannelRef = useRef(null)
  const gcTypingTimeouts = useRef({})
  const gcMyTypingThrottle = useRef(0)
  const [typingUsers, setTypingUsers] = useState({})
  const sendGCTyping = () => {
    const now = Date.now()
    if(now - gcMyTypingThrottle.current < 2000) return
    gcMyTypingThrottle.current = now
    gcChannelRef.current?.send({type:'broadcast',event:'typing',payload:{user_id:currentUser.id,name:currentUser.display_name?.split(' ')[0]||'Someone'}})
  }
  const [editName, setEditName] = useState(group.name)
  const [sendingImg, setSendingImg] = useState(false)
  const [showStickerTray, setShowStickerTray] = useState(false)
  const gcVoice = useVoiceRecorder()
  const [sendingVoice, setSendingVoice] = useState(false)
  const imgRef = useRef(null)
  const [editDesc, setEditDesc] = useState(group.description||'')
  const [editJoinMode, setEditJoinMode] = useState(group.join_mode||'open')
  const [editSaving, setEditSaving] = useState(false)
  const [groupAvatar, setGroupAvatar] = useState(group.avatar_url||null)
  const [groupData, setGroupData] = useState(group)
  const avatarRef = useRef(null)
  const bottomRef = useRef(null)
  const myRole = members.find(m=>m.user_id===currentUser.id)?.role||'member'
  const isAdmin = myRole==='admin'
  const isCreator = group.creator_id===currentUser.id
  const scrollRef = useRef(null)
  const isNearBottom = () => {
    const el = scrollRef.current
    if(!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }
  const userScrolledUp = useRef(false)

  useEffect(()=>{ loadAll(); supabase.from('group_members').update({last_read_at:new Date().toISOString()}).eq('group_id',group.id).eq('user_id',currentUser.id).then(()=>{onRead?.(group.id)}) },[])
  useEffect(()=>{
    if(!userScrolledUp.current) bottomRef.current?.scrollIntoView({behavior:'smooth'})
  },[messages])
  useEffect(()=>{
    const ch = supabase.channel('gc:'+group.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_messages',filter:'group_id=eq.'+group.id},async(payload)=>{
        let alreadyHave = false
        setMessages(prev=>{ alreadyHave = prev.some(m=>m.id===payload.new.id); return prev })
        if(alreadyHave) return // broadcast already delivered this one — skip the extra round trip
        const {data} = await supabase.from('group_messages').select('*,sender:profiles!sender_id(id,display_name,avatar_url,avatar_color),group_message_reactions(user_id,emoji)').eq('id',payload.new.id).single()
        if(data) setMessages(prev=>{
          const filtered = prev.filter(m=>!(m.id.toString().startsWith('temp_')&&m.content===data.content&&m.sender_id===data.sender_id))
          return filtered.some(m=>m.id===data.id) ? filtered : [...filtered,data]
        })
        supabase.from('group_members').update({last_read_at:new Date().toISOString()}).eq('group_id',group.id).eq('user_id',currentUser.id).then(()=>{onRead?.(group.id)})
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'group_messages',filter:'group_id=eq.'+group.id},(payload)=>{
        setMessages(prev=>prev.map(m=>m.id===payload.new.id?{...m,...payload.new}:m))
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'group_messages'},(payload)=>{
        setMessages(prev=>prev.filter(m=>m.id!==payload.old.id))
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'group_message_reactions'},async(payload)=>{
        const msgId = payload.new?.group_message_id || payload.old?.group_message_id
        if(!msgId) return
        const {data} = await supabase.from('group_message_reactions').select('user_id,emoji').eq('group_message_id',msgId)
        if(data) setMessages(prev=>prev.map(m=>m.id===msgId?{...m,group_message_reactions:data}:m))
      })
      .on('broadcast',{event:'new_message'},async(payload)=>{
        const msg = payload.payload
        if(!msg?.id) return
        // Use data directly from broadcast - no DB fetch needed, avoids RLS issues
        setMessages(prev=>{
          const filtered = prev.filter(m=>!(m.id.toString().startsWith('temp_')&&m.content===msg.content&&m.sender_id===msg.sender_id))
          return filtered.some(m=>m.id===msg.id) ? filtered : [...filtered,{...msg,group_message_reactions:msg.group_message_reactions||[]}]
        })
      })
      .on('broadcast',{event:'typing'},(payload)=>{
        if(payload.payload?.user_id===currentUser.id) return
        setTypingUsers(prev=>({...prev,[payload.payload.user_id]:payload.payload.name}))
        clearTimeout(gcTypingTimeouts.current[payload.payload.user_id])
        gcTypingTimeouts.current[payload.payload.user_id] = setTimeout(()=>{
          setTypingUsers(prev=>{ const n={...prev}; delete n[payload.payload.user_id]; return n })
        },3000)
      })
      .subscribe()
    gcChannelRef.current = ch
    return()=>supabase.removeChannel(ch)
  },[])

  const loadAll = async () => {
    const [{data:msgs},{data:mems},{data:reqs}] = await Promise.all([
      supabase.from('group_messages').select('*,sender:profiles!sender_id(id,display_name,avatar_url,avatar_color),group_message_reactions(user_id,emoji)').eq('group_id',group.id).order('created_at',{ascending:true}).limit(100),
      supabase.from('group_members').select('*,profile:profiles(id,display_name,username,avatar_url,avatar_color)').eq('group_id',group.id),
      supabase.from('group_join_requests').select('*,profile:profiles(id,display_name,username,avatar_url,avatar_color)').eq('group_id',group.id).eq('status','pending')
    ])
    setMessages(msgs||[])
    setMembers(mems||[])
    setJoinRequests(reqs||[])
    setLoading(false)
  }

  const gcInputRef = useRef(null)
  const gcSendInFlight = useRef(false)
  const sendMsg = async () => {
    if(gcSendInFlight.current) return
    if(!msgText.trim()) return
    gcSendInFlight.current = true
    const text=msgText.trim(); const reply=replyTo; const replyId=replyToId
    setMsgText(''); setReplyTo(null); setReplyToId(null)
    if(gcInputRef.current) gcInputRef.current.style.height='auto'
    const tempId = 'temp_'+Date.now()
    const tempMsg = {id:tempId,group_id:group.id,sender_id:currentUser.id,content:text,reply_to:reply,reply_to_id:replyId,created_at:new Date().toISOString(),sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color},group_message_reactions:[]}
    setMessages(prev=>[...prev,tempMsg])
    try {
    let {data:inserted,error} = await supabase.from('group_messages').insert({group_id:group.id,sender_id:currentUser.id,content:text,reply_to:reply,reply_to_id:replyId}).select('id,created_at').single()
    if(error && isMissingColumnError(error)) {
      console.warn('reply_to_id column missing, retrying without it — run supabase_migration_reply_and_stickers.sql', error)
      ;({data:inserted,error} = await supabase.from('group_messages').insert({group_id:group.id,sender_id:currentUser.id,content:text,reply_to:reply}).select('id,created_at').single())
    }
    if(inserted){
      const confirmed = {...tempMsg, id:inserted.id, created_at:inserted.created_at}
      setMessages(prev=>prev.map(m=>m.id===tempId?confirmed:m))
      // broadcast full message to other members
      gcChannelRef.current?.send({type:'broadcast',event:'new_message',payload:{
        id:inserted.id, group_id:group.id, sender_id:currentUser.id,
        content:text, reply_to:reply, reply_to_id:replyId, created_at:inserted.created_at,
        sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color},
        group_message_reactions:[]
      }})
      // one-time delayed fetch to sync with DB - merges not overwrites
      setTimeout(async()=>{
        const {data} = await supabase.from('group_messages').select('*,sender:profiles!sender_id(id,display_name,avatar_url,avatar_color),group_message_reactions(user_id,emoji)').eq('group_id',group.id).order('created_at',{ascending:true}).limit(100)
        if(data) setMessages(prev=>{
          const temps = prev.filter(m=>m.id.toString().startsWith('temp_'))
          const confirmedIds = new Set(data.map(m=>m.id))
          const stillPending = temps.filter(t=>!data.some(d=>d.content===t.content&&d.sender_id===t.sender_id&&Math.abs(new Date(d.created_at)-new Date(t.created_at))<10000))
          return [...data,...stillPending]
        })
      }, 1500)
    } else {
      console.error('GC insert error:', error)
      setMessages(prev=>prev.map(m=>m.id===tempId?{...m,_failed:true}:m))
    }
    } finally { gcSendInFlight.current = false }
  }

  const sendImage = async (file) => {
    if(!file) return
    setSendingImg(true)
    const ext = file.name.split('.').pop()
    const path = 'chats/gc_'+group.id+'_'+Date.now()+'.'+ext
    let urlData
    try { urlData = await uploadToR2(file, path) }
    catch(err){alert('Image upload failed: '+err.message);setSendingImg(false);return}
    const url = urlData.publicUrl
    const tempMsg = {id:'temp_img_'+Date.now(),group_id:group.id,sender_id:currentUser.id,content:'[image]',image_url:url,created_at:new Date().toISOString(),sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}}
    setMessages(prev=>[...prev,tempMsg])
    const {data:inserted} = await supabase.from('group_messages').insert({group_id:group.id,sender_id:currentUser.id,content:'',image_url:url}).select('id,created_at').single()
    if(inserted){
      gcChannelRef.current?.send({type:'broadcast',event:'new_message',payload:{
        id:inserted.id, group_id:group.id, sender_id:currentUser.id, content:'', image_url:url, created_at:inserted.created_at,
        sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color},
        group_message_reactions:[]
      }})
    }
    setSendingImg(false)
  }

  const sendSticker = async (stickerUrl) => {
    setShowStickerTray(false)
    const tempId = 'temp_stk_'+Date.now()
    const tempMsg = {id:tempId,group_id:group.id,sender_id:currentUser.id,content:'',is_sticker:true,sticker_url:stickerUrl,created_at:new Date().toISOString(),sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color},group_message_reactions:[]}
    setMessages(prev=>[...prev,tempMsg])
    const {data:inserted,error} = await supabase.from('group_messages').insert({group_id:group.id,sender_id:currentUser.id,content:'',is_sticker:true,sticker_url:stickerUrl}).select('id,created_at').single()
    if(inserted){
      setMessages(prev=>prev.map(m=>m.id===tempId?{...m,id:inserted.id,created_at:inserted.created_at}:m))
      gcChannelRef.current?.send({type:'broadcast',event:'new_message',payload:{
        id:inserted.id, group_id:group.id, sender_id:currentUser.id, content:'', is_sticker:true, sticker_url:stickerUrl, created_at:inserted.created_at,
        sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color},
        group_message_reactions:[]
      }})
    } else {
      console.error('Sticker send failed:', error)
      setMessages(prev=>prev.map(m=>m.id===tempId?{...m,_failed:true}:m))
      if(isMissingColumnError(error)) alert('Stickers need one-time setup — run supabase_migration_reply_and_stickers.sql in Supabase first.')
      else alert('Sticker failed to send: '+(error?.message||'unknown error'))
    }
  }

  const sendVoiceNote = async () => {
    const result = await gcVoice.stop()
    if(!result || result.duration<1) return // too short to be a real note (also covers the "stop pressed instantly" case)
    setSendingVoice(true)
    const path = 'voice/'+group.id+'_'+currentUser.id+'_'+Date.now()+'.webm'
    let urlData
    try { urlData = await uploadToR2(new File([result.blob],'voice.webm',{type:result.blob.type||'audio/webm'}), path) }
    catch(err) { alert('Voice note upload failed: '+err.message); setSendingVoice(false); return }
    const voiceUrl = urlData.publicUrl
    const tempId = 'temp_voice_'+Date.now()
    const tempMsg = {id:tempId,group_id:group.id,sender_id:currentUser.id,content:'',is_voice:true,voice_url:voiceUrl,voice_duration:result.duration,created_at:new Date().toISOString(),sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color},group_message_reactions:[]}
    setMessages(prev=>[...prev,tempMsg])
    const {data:inserted,error} = await supabase.from('group_messages').insert({group_id:group.id,sender_id:currentUser.id,content:'',is_voice:true,voice_url:voiceUrl,voice_duration:result.duration}).select('id,created_at').single()
    if(inserted){
      setMessages(prev=>prev.map(m=>m.id===tempId?{...m,id:inserted.id,created_at:inserted.created_at}:m))
      gcChannelRef.current?.send({type:'broadcast',event:'new_message',payload:{
        id:inserted.id, group_id:group.id, sender_id:currentUser.id, content:'', is_voice:true, voice_url:voiceUrl, voice_duration:result.duration, created_at:inserted.created_at,
        sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color},
        group_message_reactions:[]
      }})
    } else {
      console.error('Voice note send failed:', error)
      setMessages(prev=>prev.map(m=>m.id===tempId?{...m,_failed:true}:m))
      if(isMissingColumnError(error)) alert('Voice notes need one-time setup — run supabase_migration_voice_notes.sql in Supabase first.')
      else alert('Voice note failed to send: '+(error?.message||'unknown error'))
    }
    setSendingVoice(false)
  }

  const promoteToAdmin = async (member) => {
    await supabase.from('group_members').update({role:'admin'}).eq('group_id',group.id).eq('user_id',member.user_id)
    setMembers(prev=>prev.map(m=>m.user_id===member.user_id?{...m,role:'admin'}:m))
  }

  const demoteAdmin = async (member) => {
    await supabase.from('group_members').update({role:'member'}).eq('group_id',group.id).eq('user_id',member.user_id)
    setMembers(prev=>prev.map(m=>m.user_id===member.user_id?{...m,role:'member'}:m))
  }

  const removeMember = async (member) => {
    if(member.user_id===group.creator_id) return
    const {error} = await supabase.from('group_members').delete().eq('group_id',group.id).eq('user_id',member.user_id)
    if(!error) setMembers(prev=>prev.filter(m=>m.user_id!==member.user_id))
    else alert('Could not remove member. Check admin permissions.')
  }

  const acceptRequest = async (req) => {
    await supabase.from('group_join_requests').update({status:'accepted'}).eq('id',req.id)
    await supabase.from('group_members').insert({group_id:group.id,user_id:req.user_id})
    setJoinRequests(prev=>prev.filter(r=>r.id!==req.id))
    setMembers(prev=>[...prev,{user_id:req.user_id,role:'member',profile:req.profile}])
  }

  const rejectRequest = async (req) => {
    await supabase.from('group_join_requests').update({status:'rejected'}).eq('id',req.id)
    setJoinRequests(prev=>prev.filter(r=>r.id!==req.id))
  }

  const copyInviteLink = () => {
    const link = window.location.origin+'/join/'+group.tag
    navigator.clipboard.writeText(link).then(()=>alert('Invite link copied!\n'+link))
  }

  const handleLongPress = (msg) => { longPressTimer.current = setTimeout(()=>setSelectedMsg(msg),500) }
  const handlePressEnd = () => clearTimeout(longPressTimer.current)
  const toggleGroupReaction = async(msg,emoji) => {
    const mine = msg.group_message_reactions?.find(r=>r.user_id===currentUser.id)
    setSelectedMsg(null)
    if(mine && mine.emoji===emoji){
      // tapping same emoji again removes it
      setMessages(prev=>prev.map(m=>m.id===msg.id?{...m,group_message_reactions:(m.group_message_reactions||[]).filter(r=>r.user_id!==currentUser.id)}:m))
      await supabase.from('group_message_reactions').delete().eq('group_message_id',msg.id).eq('user_id',currentUser.id)
    } else {
      setMessages(prev=>prev.map(m=>m.id===msg.id?{...m,group_message_reactions:[...(m.group_message_reactions||[]).filter(r=>r.user_id!==currentUser.id),{user_id:currentUser.id,emoji}]}:m))
      await supabase.from('group_message_reactions').upsert({group_message_id:msg.id,user_id:currentUser.id,emoji},{onConflict:'group_message_id,user_id'})
    }
  }
  const deleteGCMsg = async(msg) => {
    setSelectedMsg(null)
    // optimistic remove
    setMessages(prev=>prev.filter(m=>m.id!==msg.id))
    await supabase.from('group_messages').delete().eq('id',msg.id).eq('sender_id',currentUser.id)
  }
  const startEditGCMsg = (msg) => { setSelectedMsg(null); setEditingMsg(msg.id); setEditText(msg.content) }
  const saveEditGCMsg = async() => { if(!editText.trim()) return; await supabase.from('group_messages').update({content:editText.trim()}).eq('id',editingMsg).eq('sender_id',currentUser.id); setMessages(prev=>prev.map(m=>m.id===editingMsg?{...m,content:editText.trim()}:m)); setEditingMsg(null); setEditText('') }

  const uploadGroupAvatar = async (file) => {
    if(!file) return
    const ext = file.name.split('.').pop()
    const path = 'groups/'+group.id+'.'+ext
    let urlData
    try { urlData = await uploadToR2(file, path) }
    catch(err){alert('Upload failed: '+err.message);return}
    const url = urlData.publicUrl+'?t='+Date.now()
    const {data:updated,error:dbErr} = await supabase.from('groups').update({avatar_url:urlData.publicUrl}).eq('id',group.id).select().single()
    if(dbErr){alert('DB error: '+dbErr.message+' groupid:'+group.id);return}
    if(!updated){alert('No rows updated - group id mismatch?');return}
    group.avatar_url = urlData.publicUrl
    setGroupAvatar(url)
    alert('Done! url:'+url.slice(0,40))
  }

  const saveGroupSettings = async () => {
    if(!editName.trim()){alert('Group name cannot be empty');return}
    setEditSaving(true)
    await supabase.from('groups').update({name:editName.trim(),description:editDesc.trim(),join_mode:editJoinMode}).eq('id',group.id)
    group.name = editName.trim()
    group.description = editDesc.trim()
    group.join_mode = editJoinMode
    setEditSaving(false)
    alert('Group updated!')
  }

  const leaveGroup = async () => {
    if(isCreator){ alert('You cannot leave a group you created. Delete it instead.'); return }
    await supabase.from('group_members').delete().eq('group_id',group.id).eq('user_id',currentUser.id)
    onBack()
  }

  const deleteGroup = async () => {
    if(!isCreator && !isAdmin) return
    await supabase.from('groups').delete().eq('id',group.id)
    onBack()
  }

  if(showRequests) return (
    <div className="screen-in" style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'calc(12px + env(safe-area-inset-top)) 16px 12px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setShowRequests(false)} style={{background:'none',border:'none',color:'var(--text-primary)',fontSize:24,cursor:'pointer'}}>‹</button>
        <span style={{fontWeight:700,fontSize:17}}>Join Requests ({joinRequests.length})</span>
      </div>
      {joinRequests.length===0&&<div style={{padding:'50px 20px',textAlign:'center'}}><div style={{display:'flex',justifyContent:'center',color:'var(--text-quaternary)'}}><Inbox size={40}/></div><p style={{color:'var(--text-secondary)',marginTop:8}}>No pending requests</p></div>}
      {joinRequests.map(req=>(
        <div key={req.id} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:'1px solid var(--bg-card-4)'}}>
          <Avatar url={req.profile?.avatar_url} name={req.profile?.display_name} color={req.profile?.avatar_color||'#5B9CF6'} size={46}/>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:15}}>{req.profile?.display_name}</div>
            <div style={{color:'var(--text-secondary)',fontSize:13}}>@{req.profile?.username} · {timeAgo(req.created_at)}</div>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>acceptRequest(req)} style={{background:'var(--primary)',border:'none',borderRadius:10,padding:'8px 12px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>Accept</button>
            <button onClick={()=>rejectRequest(req)} style={{background:'rgba(var(--danger-rgb),0.1)',border:'1px solid rgba(var(--danger-rgb),0.2)',borderRadius:10,padding:'8px 12px',color:'var(--danger)',fontWeight:700,fontSize:13,cursor:'pointer'}}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  )

  if(showMembers) return (
    <div className="screen-in" style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'calc(12px + env(safe-area-inset-top)) 16px 12px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setShowMembers(false)} style={{background:'none',border:'none',color:'var(--text-primary)',fontSize:24,cursor:'pointer'}}>‹</button>
        <span style={{fontWeight:700,fontSize:17}}>Members ({members.length})</span>
      </div>
      {members.map(m=>{
        const isThisCreator = m.user_id===group.creator_id
        const isThisAdmin = m.role==='admin'
        return(
          <div key={m.user_id} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:'1px solid var(--bg-card-4)'}}>
            <button onClick={()=>onUserClick(m.profile)} style={{background:'none',border:'none',padding:0,cursor:'pointer'}}>
              <Avatar url={m.profile?.avatar_url} name={m.profile?.display_name} color={m.profile?.avatar_color||'#5B9CF6'} size={46}/>
            </button>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontWeight:700,fontSize:15}}>{m.profile?.display_name}</span>
                {isThisCreator&&<span style={{background:'linear-gradient(135deg,#FFD700,#FFA500)',borderRadius:8,padding:'2px 7px',fontSize:10,fontWeight:800,color:'#000'}}>Creator</span>}
                {isThisAdmin&&!isThisCreator&&<span style={{background:'rgba(var(--primary-rgb),0.2)',border:'1px solid rgba(var(--primary-rgb),0.4)',borderRadius:8,padding:'2px 7px',fontSize:10,fontWeight:700,color:'var(--primary)'}}>Admin</span>}
              </div>
              <div style={{color:'var(--text-secondary)',fontSize:13}}>@{m.profile?.username}</div>
            </div>
            {(isAdmin||isCreator)&&m.user_id!==currentUser.id&&!isThisCreator&&(
              <div style={{display:'flex',gap:6}}>
                {!isThisAdmin&&<button onClick={()=>promoteToAdmin(m)} style={{background:'rgba(var(--primary-rgb),0.1)',border:'1px solid rgba(var(--primary-rgb),0.2)',borderRadius:10,padding:'6px 10px',color:'var(--primary)',fontSize:12,fontWeight:700,cursor:'pointer'}}>Promote</button>}
                {isThisAdmin&&isCreator&&<button onClick={()=>demoteAdmin(m)} style={{background:'rgba(var(--danger-rgb),0.1)',border:'1px solid rgba(var(--danger-rgb),0.2)',borderRadius:10,padding:'6px 10px',color:'var(--danger)',fontSize:12,fontWeight:700,cursor:'pointer'}}>Demote</button>}
                {isCreator&&<button onClick={()=>removeMember(m)} style={{background:'rgba(var(--danger-rgb),0.1)',border:'1px solid rgba(var(--danger-rgb),0.2)',borderRadius:10,padding:'6px 10px',color:'var(--danger)',fontSize:12,fontWeight:700,cursor:'pointer'}}>Remove</button>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  if(showSettings) return (
    <div className="screen-in" style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'calc(12px + env(safe-area-inset-top)) 16px 12px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setShowSettings(false)} style={{background:'none',border:'none',color:'var(--text-primary)',fontSize:24,cursor:'pointer'}}>‹</button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>Group Settings</span>
        {isCreator&&<button onClick={saveGroupSettings} disabled={editSaving} style={{background:'var(--primary)',border:'none',borderRadius:16,padding:'8px 16px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>{editSaving?'Saving...':'Save'}</button>}
      </div>
      <div style={{padding:20}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div onClick={()=>isCreator&&avatarRef.current?.click()} style={{width:88,height:88,borderRadius:24,background:group.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,fontWeight:800,color:'var(--text-primary)',margin:'0 auto 8px',cursor:isCreator?'pointer':'default',overflow:'hidden',position:'relative'}}>
            {groupAvatar?<img src={groupAvatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" loading="lazy"/>:editName[0]||'G'}
            {isCreator&&<div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,0.5)',padding:'4px',textAlign:'center',fontSize:11,color:'var(--text-primary)'}}>Edit</div>}
          </div>
          {isCreator&&<input ref={avatarRef} type="file" accept="image/*" onChange={e=>uploadGroupAvatar(e.target.files[0])} style={{display:'none'}}/>}
          <p style={{color:'var(--text-secondary)',fontSize:13}}>{members.length} members · @{group.tag}</p>
        </div>
        {isCreator&&<>
          <input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Group name" style={{width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none',boxSizing:'border-box',marginBottom:12}}/>
          <textarea value={editDesc} onChange={e=>setEditDesc(e.target.value)} placeholder="Description (optional)" rows={2} style={{width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none',resize:'none',fontFamily:'sans-serif',boxSizing:'border-box',marginBottom:12}}/>
          <p style={{color:'var(--text-tertiary)',fontSize:13,marginBottom:8}}>Who can join?</p>
          <div style={{display:'flex',gap:8,marginBottom:20}}>
            <button onClick={()=>setEditJoinMode('open')} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid '+(editJoinMode==='open'?'var(--primary)':'var(--bg-card-2)'),background:editJoinMode==='open'?'rgba(var(--primary-rgb),0.15)':'transparent',color:editJoinMode==='open'?'var(--primary)':'var(--text-tertiary)',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Globe size={15}/> Anyone</button>
            <button onClick={()=>setEditJoinMode('request')} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid '+(editJoinMode==='request'?'#845EF7':'var(--bg-card-2)'),background:editJoinMode==='request'?'rgba(132,94,247,0.15)':'transparent',color:editJoinMode==='request'?'#845EF7':'var(--text-tertiary)',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Lock size={15}/> Request</button>
          </div>
        </>}
        <div style={{borderRadius:16,overflow:'hidden',border:'1px solid var(--border-color)'}}>
          <button onClick={()=>{setShowSettings(false);setShowMembers(true)}} style={{width:'100%',background:'var(--bg-card-5)',border:'none',borderBottom:'1px solid var(--border-color)',padding:'16px',color:'var(--text-primary)',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between'}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:8}}><Users size={16}/> Members</span><span style={{color:'var(--text-secondary)'}}>{members.length} ›</span>
          </button>
          <button onClick={copyInviteLink} style={{width:'100%',background:'var(--bg-card-5)',border:'none',borderBottom:'1px solid var(--border-color)',padding:'16px',color:'var(--repost)',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between'}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:8}}><Link2 size={16}/> Copy Invite Link</span><span style={{color:'var(--text-secondary)',fontSize:13}}>@{group.tag}</span>
          </button>
          {(isAdmin||isCreator)&&<button onClick={()=>{setShowSettings(false);setShowRequests(true)}} style={{width:'100%',background:'var(--bg-card-5)',border:'none',borderBottom:'1px solid var(--border-color)',padding:'16px',color:'#F7B731',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between'}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:8}}><Inbox size={16}/> Join Requests</span>{joinRequests.length>0&&<span style={{background:'var(--danger)',borderRadius:10,padding:'2px 8px',fontSize:12,color:'#fff'}}>{joinRequests.length}</span>}
          </button>}
          <button onClick={leaveGroup} style={{width:'100%',background:'var(--bg-card-5)',border:'none',borderBottom:isCreator?'1px solid rgba(255,255,255,0.07)':'none',padding:'16px',color:'var(--danger)',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left'}}>
            <LogOut size={16}/> Leave Group
          </button>
          {(isCreator||isAdmin)&&<button onClick={()=>{if(window.confirm('Delete this group? This cannot be undone.'))deleteGroup()}} style={{width:'100%',background:'var(--bg-card-5)',border:'none',padding:'16px',color:'var(--danger)',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left'}}>
            <Trash2 size={16}/> Delete Group
          </button>}
        </div>
      </div>
    </div>
  )

  return (
    <div className="screen-in-safe full-screen-height" style={{background:'var(--bg-app)',color:'var(--text-primary)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {fullscreenImg&&<div onClick={()=>setFullscreenImg(null)} style={{position:'fixed',inset:0,zIndex:999,background:'rgba(0,0,0,0.95)',display:'flex',alignItems:'center',justifyContent:'center'}}><img src={fullscreenImg} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} alt="" loading="lazy"/></div>}
      <div style={{position:'fixed',top:'var(--vv-top,0px)',left:0,right:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'calc(12px + env(safe-area-inset-top)) 16px 12px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'var(--text-primary)',fontSize:24,cursor:'pointer'}}>‹</button>
        <div onClick={()=>setShowSettings(true)} style={{display:'flex',alignItems:'center',gap:10,flex:1,cursor:'pointer'}}>
          <div style={{width:38,height:38,borderRadius:12,background:group.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:18,color:'var(--text-primary)',overflow:'hidden'}}>
            {groupAvatar?<img src={groupAvatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" loading="lazy"/>:group.name[0]}
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:16}}>{group.name}</div>
            <div style={{color:'var(--text-secondary)',fontSize:12}}>{members.length} members</div>
          </div>
        </div>
        <button onClick={()=>setShowSettings(true)} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',display:'flex'}}><Settings size={22}/></button>
      </div>

      <div ref={scrollRef} onScroll={()=>{ userScrolledUp.current = !isNearBottom() }} style={{flex:1,padding:'16px 14px',display:'flex',flexDirection:'column',gap:8,paddingTop:80,overflowY:'auto',height:0}}>
        {loading&&<ChatSkeleton count={6}/>}
        {!loading&&messages.length===0&&<div style={{textAlign:'center',marginTop:60}}>
          <p style={{fontSize:40}}>👋</p>
          <p style={{color:'var(--text-quaternary)',fontSize:14,marginTop:8}}>Say hello to the group!</p>
        </div>}
        {selectedMsg&&<div onClick={()=>setSelectedMsg(null)} style={{position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-end'}}>
          <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'#1a1d26',borderRadius:'20px 20px 0 0',padding:'16px 0 32px'}}>
            <div style={{width:36,height:4,borderRadius:2,background:'var(--bg-card-8)',margin:'0 auto 16px'}}/>
            <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:8,marginBottom:16,padding:'0 12px',maxHeight:170,overflowY:'auto'}}>
              {QUICK_REACTIONS.map(e=>{
                const mine = selectedMsg.group_message_reactions?.find(r=>r.user_id===currentUser.id)
                const isMineActive = mine?.emoji===e
                return (
                <button key={e} onClick={()=>toggleGroupReaction(selectedMsg,e)} style={{background:isMineActive?'rgba(var(--primary-rgb),0.25)':'var(--bg-card-6)',border:isMineActive?'1px solid var(--primary)':'none',borderRadius:12,padding:'8px',fontSize:22,cursor:'pointer'}}>{e}</button>
                )
              })}
            </div>
            <button onClick={()=>{setReplyTo(selectedMsg.sender?.display_name+': '+selectedMsg.content?.slice(0,50));setReplyToId(selectedMsg.id);setSelectedMsg(null)}} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid var(--border-color)',padding:'16px 20px',color:'rgba(255,255,255,0.92)',fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10}}><CornerUpLeft size={17}/> Reply</button>
            {selectedMsg.content&&<button onClick={()=>{navigator.clipboard?.writeText(selectedMsg.content);setSelectedMsg(null)}} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid var(--border-color)',padding:'16px 20px',color:'rgba(255,255,255,0.92)',fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10}}><Copy size={17}/> Copy</button>}
            {selectedMsg.sender_id===currentUser.id&&<>
              <button onClick={()=>startEditGCMsg(selectedMsg)} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid var(--border-color)',padding:'16px 20px',color:'var(--primary)',fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10}}><Pencil size={17}/> Edit</button>
              <button onClick={()=>deleteGCMsg(selectedMsg)} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid var(--border-color)',padding:'16px 20px',color:'var(--danger)',fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10}}><Trash2 size={17}/> Delete</button>
            </>}
            {selectedMsg.sender_id!==currentUser.id&&<button onClick={()=>{setReportingMsg(selectedMsg);setSelectedMsg(null)}} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid var(--border-color)',padding:'16px 20px',color:'var(--danger)',fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10}}><AlertTriangle size={17}/> Report</button>}
          </div>
        </div>}
        {reportingMsg&&<ReportModal onClose={()=>setReportingMsg(null)} onSubmit={async(reason,details)=>{
          const {error} = await supabase.from('reports').insert({reporter_id:currentUser.id, reported_message_id:reportingMsg.id, reason, details:details||null})
          if(error) throw error
        }}/>}
        {messages.map(msg=>{
          const own = msg.sender_id===currentUser.id
          return(
            <MessageBubble key={msg.id}
              rowId={'gcmsg-'+msg.id}
              msg={msg} own={own} showSenderInfo currentUserId={currentUser.id}
              onAvatarClick={()=>onUserClick(msg.sender)}
              onImageClick={setFullscreenImg}
              onLongPress={()=>handleLongPress(msg)} onPressEnd={handlePressEnd}
              reactions={msg.group_message_reactions}
              onToggleReaction={(emoji)=>toggleGroupReaction(msg,emoji)}
              isEditing={editingMsg===msg.id}
              editValue={editText} onEditChange={e=>setEditText(e.target.value)}
              onSaveEdit={saveEditGCMsg} onCancelEdit={()=>setEditingMsg(null)}
              onJumpToReply={scrollToMessage} highlighted={highlightMsgId===msg.id}
            />
          )
        })}
        <div ref={bottomRef}/>
      </div>

      <div style={{flexShrink:0,maxWidth:600,width:'100%',margin:'0 auto',background:'var(--bg-app)',borderTop:'1px solid var(--border-color)',paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
        {Object.keys(typingUsers).length>0&&<div style={{padding:'6px 14px 0',color:'var(--primary)',fontSize:12,fontStyle:'italic'}}>{Object.values(typingUsers).join(', ')} {Object.keys(typingUsers).length===1?'is':'are'} typing...</div>}
        <ReplyComposerBar text={replyTo} onCancel={()=>{setReplyTo(null);setReplyToId(null)}}/>
        {showStickerTray&&<StickerTray currentUser={currentUser} supabase={supabase} onSelect={sendSticker} onEmojiSelect={e=>setMsgText(t=>t+e)} onClose={()=>setShowStickerTray(false)}/>}
        {gcVoice.recording ? (
          <VoiceRecordingBar seconds={gcVoice.seconds} onCancel={gcVoice.cancel} onSend={sendVoiceNote}/>
        ) : (
        <div style={{padding:'10px 14px',display:'flex',gap:10,alignItems:'center'}}>
          <input ref={imgRef} type="file" accept="image/*" onChange={e=>sendImage(e.target.files[0])} style={{display:'none'}}/>
          <button onClick={()=>imgRef.current?.click()} disabled={sendingImg} style={{width:40,height:40,borderRadius:'50%',background:'var(--bg-card)',border:'none',cursor:'pointer',color:'var(--text-tertiary)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>{sendingImg?<Loader2 size={18} className="xspin"/>:<ImageIcon size={18}/>}</button>
          <button onClick={()=>setShowStickerTray(v=>!v)} style={{width:40,height:40,borderRadius:'50%',background:showStickerTray?'rgba(var(--primary-rgb),0.2)':'var(--bg-card)',border:'none',cursor:'pointer',color:showStickerTray?'var(--primary)':'var(--text-tertiary)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><Smile size={18}/></button>
        <textarea ref={gcInputRef} rows={1} value={msgText} onChange={e=>{setMsgText(e.target.value);sendGCTyping();const el=e.target;requestAnimationFrame(()=>{el.style.height='auto';el.style.height=Math.min(el.scrollHeight,120)+'px'})}} placeholder="Message group..." style={{flex:1,minWidth:0,background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:20,padding:'12px 18px',color:'var(--text-primary)',fontSize:15,outline:'none',fontFamily:'sans-serif',resize:'none',maxHeight:120,overflowY:'auto',lineHeight:1.4}}/>
          {msgText.trim() ? (
            <button onClick={sendMsg} style={{width:46,height:46,borderRadius:'50%',background:'var(--primary)',border:'none',cursor:'pointer',color:'#fff',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><Send size={19}/></button>
          ) : (
            <button onClick={gcVoice.start} disabled={sendingVoice} style={{width:46,height:46,borderRadius:'50%',background:'var(--bg-card-3)',border:'none',cursor:'pointer',color:'var(--text-primary)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>{sendingVoice?<Loader2 size={19} className="xspin"/>:<Mic size={19}/>}</button>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
