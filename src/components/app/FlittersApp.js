'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Ban, Bell, Compass, Copy, CornerUpLeft, Globe, Home, Image as ImageIcon, Loader2, Lock, Megaphone, MessageCircle, Mic, Pencil, Search, Send, Settings, ShoppingBag, Smile, Trash2, Users, Video, X } from 'lucide-react'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { FlittersAI } from '@/components/ai/FlittersAI'
import { GroupChat } from '@/components/chat/GroupChat'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ReplyComposerBar } from '@/components/chat/ReplyBars'
import { StickerTray } from '@/components/chat/StickerTray'
import { VoiceRecordingBar } from '@/components/chat/VoiceMessage'
import { Avatar } from '@/components/common/Avatar'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { DesktopShell } from '@/components/app/DesktopShell'
import { FeedLoadMoreSentinel } from '@/components/common/FeedLoadMoreSentinel'
import { InAppToast } from '@/components/common/InAppToast'
import { ReportModal } from '@/components/common/ReportModal'
import { FeedSkeleton, RowSkeletonList } from '@/components/common/Skeletons'
import { AdCard } from '@/components/feed/AdCard'
import { AnnouncementBanner } from '@/components/feed/AnnouncementBanner'
import { PostCard } from '@/components/feed/PostCard'
import { ReelPreviewCard } from '@/components/feed/ReelPreviewCard'
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel'
import { MyProfileView } from '@/components/profile/MyProfileView'
import { UserProfileView } from '@/components/profile/UserProfileView'
import { PulseTab } from '@/components/pulse/PulseTab'
import { SettingsView } from '@/components/settings/SettingsView'
import { authJsonHeaders, triggerAiMentionReply } from '@/lib/api'
import { COLORS, getColor } from '@/lib/colors'
import { NOTIF_TYPE_INFO, QUICK_REACTIONS } from '@/lib/constants'
import { isMissingColumnError } from '@/lib/dbUtils'
import { FLITTERS_MARK } from '@/lib/flitters-mark'
import { useVoiceRecorder } from '@/lib/hooks/useVoiceRecorder'
import { getVideoDuration, uploadToR2, uploadVideoChunked } from '@/lib/media/upload'
import { supabase } from '@/lib/supabase/instance'
import { useTheme } from '@/lib/theme'
import { timeAgo } from '@/lib/timeAgo'

export function FlittersAppInner({ currentUser }) {
  const { theme } = useTheme()
  const [ads, setAds] = useState([])
  const [showAdmin, setShowAdmin] = useState(false)
  const ADMIN_ID = 'b29fa752-34f5-4a3e-a3e7-8178c2b176ae'

  // Keeps --vvh (visible height) and --vv-top (how far the visible area has
  // scrolled from the page's actual top) in sync with the real, live visual
  // viewport. This exists because the `interactive-widget=resizes-visual`
  // viewport meta setting — the standards-based fix for "keyboard drags
  // fixed headers around" — isn't being honored by this app's WebView engine
  // (GeckoView). Reading window.visualViewport directly works regardless of
  // that, since it's a broadly-supported API independent of that newer meta
  // tag. Full-screen overlays with a composer (DM chat, group chat, post
  // detail) use these vars instead of inset:0/100dvh so they track the
  // actual visible area rather than getting dragged along with whatever the
  // browser does to scroll a focused input into view.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      document.documentElement.style.setProperty('--vvh', vv.height + 'px')
      document.documentElement.style.setProperty('--vv-top', vv.offsetTop + 'px')
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update) }
  }, [])

  // URL-based navigation
  const getHashTab = () => {
    const h = window.location.hash.replace('#','')
    return ['home','messages','pulse','people','notifications'].includes(h) ? h : 'home'
  }
  const [tab, setTab] = useState(getHashTab)
  const setTabWithHash = (t) => {
    // history.replaceState only updates the URL bar and never triggers
    // browser navigation — assigning to location.hash does, and inside the
    // Android WebView wrapper that was causing a full page reload (re-running
    // the whole auth/profile fetch in page.js) on every single tab tap,
    // which is what made tab switching feel like a full refresh.
    window.history.replaceState(null, '', '#'+t)
    setTab(t)
    if(t==='messages') setDmView('list')
  }
  const [pendingReelId, setPendingReelId] = useState(null)
  const [feedTab, setFeedTab] = useState('foryou')
  const [posts, setPosts] = useState([])
  const [visibleCount, setVisibleCount] = useState(10) // feed renders 10 posts at a time, grows as you scroll near the end
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [composeText, setComposeText] = useState('')
  const [composeImage, setComposeImage] = useState(null)
  const [composeImageUrl, setComposeImageUrl] = useState(null)
  const composeImgRef = useRef(null)
  const composeVidRef = useRef(null)
  const [composeVideo, setComposeVideo] = useState(null)
  const [composeVideoUrl, setComposeVideoUrl] = useState(null)
  const [composeVideoIssue, setComposeVideoIssue] = useState('')
  const [composeBusy, setComposeBusy] = useState(false)
  const [composePct, setComposePct] = useState(0)
  const clearComposeVideo = () => { if(composeVideoUrl) URL.revokeObjectURL(composeVideoUrl); setComposeVideo(null); setComposeVideoUrl(null); setComposeVideoIssue('') }
  // Same rules as the native app: regular members 20s, verified/authentic 60s, nothing over 5 minutes, 200MB max.
  const pickComposeVideo = async (file) => {
    if(!file) return
    clearComposeVideo()
    const limit = (currentUser?.verified||currentUser?.is_authentic) ? 60 : 20
    let issue = ''
    try {
      const secs = Math.round(await getVideoDuration(file))
      if(secs>300) issue = `This video is ${Math.floor(secs/60)}m ${secs%60}s long. Videos over 5 minutes can't be uploaded.`
      else if(secs>limit) issue = `This video is ${secs}s long. You can upload videos up to ${limit} seconds.${limit<60?' Verified members can upload up to 1 minute.':''}`
      else if(file.size>200*1024*1024) issue = `This file is ${(file.size/1024/1024).toFixed(1)}MB — the limit is 200MB.`
    } catch(e) { issue = e.message||"Couldn't read that video." }
    setComposeImage(null); setComposeImageUrl(null)
    setComposeVideo(file); setComposeVideoUrl(URL.createObjectURL(file)); setComposeVideoIssue(issue)
  }
  const [conversations, setConversations] = useState([])
  const [convosLoading, setConvosLoading] = useState(true)
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [msgText, setMsgText] = useState('')
  const [dmBlocked, setDmBlocked] = useState(false)
  const [dmView, setDmView] = useState('list')
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [followed, setFollowed] = useState({})
  const [friendsSubTab, setFriendsSubTab] = useState('friends')
  const [selectedDMMsg, setSelectedDMMsg] = useState(null)
  const [reportingDMMsg, setReportingDMMsg] = useState(null)
  const [editingDMMsg, setEditingDMMsg] = useState(null)
  const [editDMText, setEditDMText] = useState('')
  const [dmReplyTo, setDmReplyTo] = useState(null)
  const [dmReplyToId, setDmReplyToId] = useState(null)
  const [dmHighlightMsgId, setDmHighlightMsgId] = useState(null)
  const dmHighlightTimer = useRef(null)
  const scrollToDMMessage = (id) => {
    if(!id) return
    document.getElementById('dmmsg-'+id)?.scrollIntoView({behavior:'smooth',block:'center'})
    setDmHighlightMsgId(id)
    clearTimeout(dmHighlightTimer.current)
    dmHighlightTimer.current = setTimeout(()=>setDmHighlightMsgId(null),1200)
  }
  const dmLongPressTimer = useRef(null)
  const selectedConvRef = useRef(null)
  useEffect(()=>{ selectedConvRef.current = selectedConv },[selectedConv])
  const dmImgRef = useRef(null)
  const dmChannelRef = useRef(null)
  const dmTypingTimeoutRef = useRef(null)
  const dmMyTypingThrottle = useRef(0)
  const [otherTyping, setOtherTyping] = useState(false)
  const sendDMTyping = () => {
    const now = Date.now()
    if(now - dmMyTypingThrottle.current < 2000) return
    dmMyTypingThrottle.current = now
    dmChannelRef.current?.send({type:'broadcast',event:'typing',payload:{user_id:currentUser.id}})
  }
  const [sendingDMImg, setSendingDMImg] = useState(false)
  const [showDMStickerTray, setShowDMStickerTray] = useState(false)
  const dmVoice = useVoiceRecorder()
  const [sendingDMVoice, setSendingDMVoice] = useState(false)
  const [fullscreenImg, setFullscreenImg] = useState(null)
  const [unreadDM, setUnreadDM] = useState(0)
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [unreadGC, setUnreadGC] = useState(false)
  // Backing store for the badges above. Kept as refs (not state) because
  // they're mutated inside realtime callbacks and mark-as-read handlers —
  // using plain state here would mean every handler needs the latest
  // closure-captured value, which realtime callbacks registered once on
  // mount don't have. The public unreadDM/unreadGC numbers/booleans are
  // just a derived snapshot recomputed whenever a set changes.
  const unreadConvoIdsRef = useRef(new Set())
  const unreadGroupIdsRef = useRef(new Set())
  const myConversationIdsRef = useRef([])
  const myGroupIdsRef = useRef([])
  const recomputeDMBadge = () => setUnreadDM(unreadConvoIdsRef.current.size)
  const recomputeGCBadge = () => setUnreadGC(unreadGroupIdsRef.current.size>0)
  // Shared between the instant realtime listener and the polling backup
  // further down, so an item that already got shown once (whichever path
  // caught it first) doesn't get shown again by the other one.
  const notifiedIdsRef = useRef(new Set())
  const [toast, setToast] = useState(null)

  const loadUnreadCounts = async () => {
    try {
      const {data:parts} = await supabase.from('conversation_participants').select('conversation_id,last_read_at').eq('user_id',currentUser.id)
      myConversationIdsRef.current = (parts||[]).map(p=>p.conversation_id)
      unreadConvoIdsRef.current = new Set()
      if(parts?.length){
        await Promise.all(parts.map(async p=>{
          const {count:c} = await supabase.from('messages').select('id',{count:'exact',head:true}).eq('conversation_id',p.conversation_id).neq('sender_id',currentUser.id).gt('created_at',p.last_read_at||'1970-01-01T00:00:00Z')
          if(c>0) unreadConvoIdsRef.current.add(p.conversation_id)
        }))
      }
      recomputeDMBadge()

      const {count:nc} = await supabase.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',currentUser.id).eq('read',false)
      setUnreadNotifs(nc||0)

      const {data:mems} = await supabase.from('group_members').select('group_id,last_read_at').eq('user_id',currentUser.id)
      myGroupIdsRef.current = (mems||[]).map(m=>m.group_id)
      unreadGroupIdsRef.current = new Set()
      if(mems?.length){
        await Promise.all(mems.map(async m=>{
          const {count:gc} = await supabase.from('group_messages').select('id',{count:'exact',head:true}).eq('group_id',m.group_id).neq('sender_id',currentUser.id).gt('created_at',m.last_read_at||'1970-01-01T00:00:00Z')
          if(gc>0) unreadGroupIdsRef.current.add(m.group_id)
        }))
      }
      recomputeGCBadge()
    } catch(e) { /* tables may not have these columns yet */ }
  }

  // One initial fetch to establish correct baseline counts (unavoidable —
  // a fresh page load has no live history to react to), then realtime
  // takes over entirely. No more 15-second re-polling: new messages, new
  // group messages, and new notifications each arrive as their own event
  // and update just the affected badge, instantly, instead of re-scanning
  // every conversation and group on a timer regardless of whether
  // anything changed.
  useEffect(()=>{
    loadUnreadCounts()
    const ch = supabase.channel('unread-badges:'+currentUser.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},async(payload)=>{
        const m = payload.new
        if(m.sender_id===currentUser.id) return
        if(!myConversationIdsRef.current.includes(m.conversation_id)) return
        if(notifiedIdsRef.current.has(m.id)) return
        notifiedIdsRef.current.add(m.id)
        unreadConvoIdsRef.current.add(m.conversation_id)
        recomputeDMBadge()
        const s = stateRef.current
        const isViewingThisConvo = s.tab==='messages' && s.dmView==='chat' && s.selectedConv?.id===m.conversation_id
        if(isViewingThisConvo) return
        const {data:sender} = await supabase.from('profiles').select('display_name,avatar_url').eq('id',m.sender_id).maybeSingle()
        setToast({
          title: sender?.display_name || 'New message',
          body: m.is_sticker ? 'Sent a sticker' : m.is_voice ? 'Sent a voice message' : (m.content||'').slice(0,80),
          avatarUrl: sender?.avatar_url,
          action: {type:'dm', conv:{id:m.conversation_id, other:sender?{id:m.sender_id,...sender}:null}},
        })
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_messages'},async(payload)=>{
        const m = payload.new
        if(m.sender_id===currentUser.id) return
        if(!myGroupIdsRef.current.includes(m.group_id)) return
        if(notifiedIdsRef.current.has(m.id)) return
        notifiedIdsRef.current.add(m.id)
        unreadGroupIdsRef.current.add(m.group_id)
        recomputeGCBadge()
        const s = stateRef.current
        const isViewingThisGroup = s.viewingGroupChat?.id===m.group_id
        if(isViewingThisGroup) return
        const [{data:sender},{data:group}] = await Promise.all([
          supabase.from('profiles').select('display_name,avatar_url').eq('id',m.sender_id).maybeSingle(),
          supabase.from('groups').select('*,group_members(user_id)').eq('id',m.group_id).maybeSingle(),
        ])
        setToast({
          title: (sender?.display_name||'Someone')+' in '+(group?.name||'a group'),
          body: m.is_sticker ? 'Sent a sticker' : m.is_voice ? 'Sent a voice message' : (m.content||'').slice(0,80),
          avatarUrl: sender?.avatar_url,
          action: {type:'group', group},
        })
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${currentUser.id}`},async(payload)=>{
        const n = payload.new
        if(notifiedIdsRef.current.has(n.id)) return
        notifiedIdsRef.current.add(n.id)
        setUnreadNotifs(c=>c+1)
        if(stateRef.current.tab==='notifications') return
        const {data:actor} = n.actor_id ? await supabase.from('profiles').select('display_name,avatar_url').eq('id',n.actor_id).maybeSingle() : {data:null}
        setToast({
          title: actor?.display_name || 'Flitters',
          body: NOTIF_TYPE_INFO[n.type]?.text || 'You have a new notification',
          avatarUrl: actor?.avatar_url,
          action: {type:'notif'},
        })
      })
      .subscribe()
    return ()=>supabase.removeChannel(ch)
  },[])
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search)
    const gid = params.get('opengroup')
    if(gid){
      supabase.from('groups').select('*,group_members(user_id)').eq('id',gid).single().then(({data})=>{
        if(data){setTabWithHash('messages');setViewingGroupChat(data)}
      })
      window.history.replaceState({},'',window.location.pathname)
    }
    const pid = params.get('openpost')
    if(pid){
      openPost(pid)
      window.history.replaceState({},'',window.location.pathname)
    }
  },[])
  const [people, setPeople] = useState([])
  const [peopleLoading, setPeopleLoading] = useState(true)
  const [notifs, setNotifs] = useState([])
  const [viewingUser, setViewingUser] = useState(null)
  const [viewingPost, setViewingPost] = useState(null)
  // The feed scrolls at the window level (no dedicated scroll container), and
  // opening a post/profile swaps in a totally separate full-screen view that
  // replaces the feed in the DOM entirely. So going "back" was landing back
  // at the top instead of where you were — nothing was remembering the
  // scroll position across that swap. This ref is that memory.
  const feedScrollPosRef = useRef(0)
  const openPost = async(postId) => {
    feedScrollPosRef.current = window.scrollY
    const {data} = await supabase.from('posts').select('*,author:profiles!user_id(*),likes(user_id),reposts(user_id),comments(id)').eq('id',postId).single()
    if(data) setViewingPost({...data,user_liked:data.likes?.some(l=>l.user_id===currentUser.id),user_reposted:data.reposts?.some(r=>r.user_id===currentUser.id),likes_count:data.likes?.length||0,reposts_count:data.reposts?.length||0,comments_count:data.comments?.length||0})
    setHideNav(true)
  }
  const closePost = () => { setViewingPost(null); setHideNav(false) }
  const [showMyProfile, setShowMyProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url||'')
  const color = currentUser?.avatar_color||'#5B9CF6'
  const inp = {width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none',fontFamily:'sans-serif',boxSizing:'border-box'}
  const handleSignOut = async() => { await supabase.auth.signOut(); window.location.href='/auth' }

  useEffect(()=>{
    supabase.from('ads').select('*').eq('active',true).eq('type','post').order('created_at',{ascending:false}).then(({data})=>setAds(data||[]))
  },[])
  const [navVisible, setNavVisible] = useState(true)
  const [hideNav, setHideNav] = useState(false)
  const OMNICORE_ID = 'omnicore-ai'
  const OMNICORE_PROFILE = {id:'omnicore-ai',display_name:'Flitters AI',username:'flittersai',avatar_color:'#A855F7',avatar_url:'/flitters-ai-icon.png',is_ai:true}
  const [onlineUsers, setOnlineUsers] = useState({})
  const stateRef = useRef({})
  const reelsRef = useRef(null)
  const [viewingGroupChat, setViewingGroupChat] = useState(null)
  const [groupsForList, setGroupsForList] = useState([])
  const [showComposeMenu, setShowComposeMenu] = useState(false)
  const [gcName, setGcName] = useState('')
  const [gcDesc, setGcDesc] = useState('')
  const [gcTag, setGcTag] = useState('')
  const [gcJoinMode, setGcJoinMode] = useState('open')
  const [gcColor, setGcColor] = useState('#5B9CF6')
  const [gcSaving, setGcSaving] = useState(false)
  useEffect(()=>{
    stateRef.current = {viewingUser,showMyProfile,showSettings,tab,dmView,hideNav,viewingGroupChat,viewingReels:reelsRef.current,viewingPost,selectedConv}
  },[viewingUser,showMyProfile,showSettings,tab,dmView,hideNav,viewingPost,viewingGroupChat,selectedConv])

  // Restore the feed's scroll position once you're actually back on it. Wait
  // a frame so the feed's DOM has repainted first — scrolling before that
  // would target a page that isn't tall enough yet.
  useEffect(()=>{
    if(!viewingPost && !viewingUser && !showMyProfile){
      requestAnimationFrame(()=>window.scrollTo(0, feedScrollPosRef.current))
    }
  },[viewingPost,viewingUser,showMyProfile])

  // Global listener for push notifications regardless of tab
  useEffect(()=>{
    const ch = supabase.channel('global_notifs_'+currentUser.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+currentUser.id},async(payload)=>{
        loadUnreadCounts()
        const n = payload.new
        if(notifiedIdsRef.current.has(n.id)) return
        notifiedIdsRef.current.add(n.id)
        const typeText = {
          like:'liked your post', comment:'commented on your post', follow:'started following you',
          repost:'reposted your flit', follow_request:'sent you a follow request',
          follow_accepted:'accepted your follow request', mention:'tagged you in a post',
        }
        let name = 'Someone'
        if(n.actor_id){ const {data:actor} = await supabase.from('profiles').select('display_name').eq('id',n.actor_id).maybeSingle(); name = actor?.display_name || 'Someone' }
        const body = n.type==='welcome' ? 'Welcome to Flitters!' : `${name} ${typeText[n.type]||'sent you a notification'}`
        showLocalNotif('Flitters', body)
      })
      .subscribe()

    // Separate channel for DMs - filter by user's conversations
    supabase.from('conversation_participants').select('conversation_id').eq('user_id',currentUser.id).then(({data:convs})=>{
      if(!convs?.length) return
      convs.forEach(({conversation_id})=>{
        supabase.channel('dm_notif_'+conversation_id)
          .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'conversation_id=eq.'+conversation_id},async(payload)=>{
            if(payload.new.sender_id === currentUser.id) return
            loadUnreadCounts()
            const m = payload.new
            if(notifiedIdsRef.current.has(m.id)) return
            notifiedIdsRef.current.add(m.id)
            const {data:sender} = await supabase.from('profiles').select('display_name').eq('id',m.sender_id).maybeSingle()
            const name = sender?.display_name || 'Someone'
            const body = m.is_sticker ? `${name} sent you a sticker` : m.is_voice ? `${name} sent a voice message` : `${name}: ${(m.content||'').slice(0,100)}`
            showLocalNotif('Flitters', body)
          })
          .subscribe()
      })
    })

    return()=>{ supabase.removeChannel(ch) }
  },[])

  // Polling backup for notifications/messages — Supabase Realtime (websockets)
  // is unreliable inside WebView-wrapped apps (background connection gets
  // killed, auth token refresh isn't always handled). This polls on an
  // interval instead, so notifications keep working even if the websocket dies.
  useEffect(()=>{
    const notifiedIds = notifiedIdsRef.current
    let lastPollTime = new Date().toISOString()

    const poll = async () => {
      try {
        const pollStart = new Date().toISOString()

        // New notifications (likes, comments, follows, reposts, mentions)
        const {data:newNotifs} = await supabase.from('notifications')
          .select('*,actor:profiles!actor_id(display_name,avatar_url)')
          .eq('user_id', currentUser.id)
          .gt('created_at', lastPollTime)
          .order('created_at', {ascending:true})
        if(newNotifs?.length){
          for(const n of newNotifs){
            if(notifiedIds.has(n.id)) continue
            notifiedIds.add(n.id)
            const name = n.actor?.display_name || 'Someone'
            const body = n.type==='welcome' ? 'Welcome to Flitters!' : `${name} ${NOTIF_TYPE_INFO[n.type]?.text||'sent you a notification'}`
            showLocalNotif('Flitters', body)
            setUnreadNotifs(c=>c+1)
            if(stateRef.current.tab!=='notifications') setToast({title:name, body:NOTIF_TYPE_INFO[n.type]?.text||'sent you a notification', avatarUrl:n.actor?.avatar_url, action:{type:'notif'}})
          }
        }

        // New DM messages across all of the user's conversations
        const {data:convs} = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', currentUser.id)
        if(convs?.length){
          const convIds = convs.map(c=>c.conversation_id)
          const {data:newMsgs} = await supabase.from('messages')
            .select('*,sender:profiles!sender_id(display_name,avatar_url)')
            .in('conversation_id', convIds)
            .gt('created_at', lastPollTime)
            .order('created_at', {ascending:true})
          if(newMsgs?.length){
            for(const m of newMsgs){
              if(notifiedIds.has(m.id)) continue
              notifiedIds.add(m.id)
              if(m.sender_id === currentUser.id) continue
              unreadConvoIdsRef.current.add(m.conversation_id)
              recomputeDMBadge()
              const name = m.sender?.display_name || 'Someone'
              const body = m.is_sticker ? `${name} sent you a sticker` : m.is_voice ? `${name} sent a voice message` : `${name}: ${(m.content||'').slice(0,100)}`
              showLocalNotif('Flitters', body)
              const s = stateRef.current
              const isViewingThisConvo = s.tab==='messages' && s.dmView==='chat' && s.selectedConv?.id===m.conversation_id
              if(!isViewingThisConvo) setToast({title:name, body: m.is_sticker?'Sent a sticker':m.is_voice?'Sent a voice message':(m.content||'').slice(0,80), avatarUrl:m.sender?.avatar_url, action:{type:'dm',conv:{id:m.conversation_id,other:{id:m.sender_id,...m.sender}}}})
            }
          }
        }

        // New group messages across all of the user's groups
        const {data:myGroups} = await supabase.from('group_members').select('group_id').eq('user_id', currentUser.id)
        if(myGroups?.length){
          const groupIds = myGroups.map(g=>g.group_id)
          const {data:newGroupMsgs} = await supabase.from('group_messages')
            .select('*,sender:profiles!sender_id(display_name,avatar_url),group:groups!group_id(id,name,cover_color,avatar_url)')
            .in('group_id', groupIds)
            .gt('created_at', lastPollTime)
            .order('created_at', {ascending:true})
          if(newGroupMsgs?.length){
            for(const m of newGroupMsgs){
              if(notifiedIds.has(m.id)) continue
              notifiedIds.add(m.id)
              if(m.sender_id === currentUser.id) continue
              unreadGroupIdsRef.current.add(m.group_id)
              recomputeGCBadge()
              const name = m.sender?.display_name || 'Someone'
              const body = m.is_sticker ? `${name} sent a sticker in ${m.group?.name||'a group'}` : m.is_voice ? `${name} sent a voice message in ${m.group?.name||'a group'}` : `${name} in ${m.group?.name||'a group'}: ${(m.content||'').slice(0,100)}`
              showLocalNotif('Flitters', body)
              if(stateRef.current.viewingGroupChat?.id!==m.group_id) setToast({title:`${name} in ${m.group?.name||'a group'}`, body: m.is_sticker?'Sent a sticker':m.is_voice?'Sent a voice message':(m.content||'').slice(0,80), avatarUrl:m.sender?.avatar_url, action:{type:'group',group:m.group}})
            }
          }
        }

        lastPollTime = pollStart
      } catch(e) { console.log('Notification poll error:', e.message) }
    }

    const interval = setInterval(poll, 25000)
    return () => clearInterval(interval)
  },[])

  useEffect(()=>{
    const presenceChannel = supabase.channel('online_users')
      .on('presence',{event:'sync'},()=>{
        const state = presenceChannel.presenceState()
        const online = {}
        Object.values(state).flat().forEach(p=>{ online[p.user_id]=true })
        setOnlineUsers(online)
      })
      .subscribe(async(status)=>{
        if(status==='SUBSCRIBED'){
          await presenceChannel.track({user_id:currentUser.id,online_at:new Date().toISOString()})
        }
      })
    return()=>supabase.removeChannel(presenceChannel)
  },[])

  // WebToApp's wrapper shell sets window.__webtoapp_notification_polyfill__
  // = true to claim it has polyfilled the standard Notification API — but in
  // practice Notification.permission/requestPermission() here are just the
  // native, unmodified browser API surface (no special bridge function
  // exists to call), and the permission property doesn't reliably reflect
  // the real OS-level grant. So: call the standard API, but don't trust its
  // reported result as the final word when this flag is present.
  const requestNotifPermission = async () => {
    try {
      if('Notification' in window) {
        console.log('Triggering permission prompt...')
        return await Notification.requestPermission()
      }
      return 'unsupported'
    } catch(e) {
      console.error('Error requesting permission:', e)
      return 'error'
    }
  }

  const setupPush = useCallback(async() => {
    const setStatus = (s) => { try { localStorage.setItem('flitters_push_status', s) } catch(e){} }
    try {
      setStatus('Starting...')
      if(!('Notification' in window)) { setStatus('No Notification API in this browser'); return }
      if(!('serviceWorker' in navigator)) { setStatus('No serviceWorker support in this browser'); return }
      if(!('PushManager' in window)) { setStatus('No PushManager support in this browser'); return }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if(!vapidKey) { setStatus('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set at build time'); return }

      // Clean up any other service worker registration (e.g. a leftover
      // OneSignal worker from a previous, now-removed setup) so it can't
      // compete for the same push scope and cause duplicate/conflicting
      // deliveries.
      setStatus('Checking for stale service workers...')
      const existingRegs = await navigator.serviceWorker.getRegistrations()
      for(const r of existingRegs){
        const scriptUrl = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || ''
        if(scriptUrl && !scriptUrl.endsWith('/sw.js')) await r.unregister()
      }

      setStatus('Registering service worker...')
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      let permission = Notification.permission
      if(permission === 'default') permission = await requestNotifPermission()
      if(permission !== 'granted') { setStatus('Permission is "'+permission+'", not granted'); return }

      setStatus('Refreshing subscription...')
      let sub = await reg.pushManager.getSubscription()
      // Don't trust a cached subscription — the push service can silently
      // invalidate it, and the browser has no way of knowing that on its
      // own; it'll keep handing back the same dead subscription
      // indefinitely, surviving even an app uninstall/reinstall. Always
      // re-verify with a fresh subscribe so a dead one can't linger.
      if(sub) { try { await sub.unsubscribe() } catch(e){}; sub = null }
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey
      })

      setStatus('Saving subscription to account...')
      const {error} = await supabase.from('push_subscriptions').upsert({
        user_id:currentUser.id,
        subscription: JSON.parse(JSON.stringify(sub))
      },{onConflict:'user_id'})
      if(error) setStatus('DB save failed: '+error.message)
      else setStatus('Ready — subscribed at '+new Date().toLocaleTimeString())
    } catch(e) {
      setStatus('Error: '+(e.name?e.name+': ':'')+e.message)
    }
  }, [currentUser.id])

  useEffect(()=>{
    setupPush()
  },[setupPush])

  useEffect(()=>{
    // Prevent back button from ever going to auth/login
    window.history.pushState({flitters:true},'',window.location.href)
    const handlePop = (e) => {
      // Always push a new state to stay in-app
      window.history.pushState({flitters:true},'',window.location.href)
      const s = stateRef.current
      // Priority order: deepest screen first
      if(s.viewingPost){setViewingPost(null);setHideNav(false);return}
      if(s.viewingUser){setViewingUser(null);return}
      if(s.showMyProfile){setShowMyProfile(false);return}
      if(s.showSettings){setShowSettings(false);return}
      if(s.dmView==='chat'){setDmView('list');setSelectedConv(null);setMessages([]);return}
      if(s.viewingGroupChat){setViewingGroupChat(null);setHideNav(false);return}
      if(s.viewingReels){
        if(reelsRef.current?.closeReels) reelsRef.current.closeReels()
        reelsRef.current = null
        stateRef.current.viewingReels = null
        setHideNav(false)
        return
      }
      if(s.tab!=='home'){
        // Defensive cleanup: this fallback means none of the tracked
        // overlays matched, but if one is still actually mounted underneath
        // (stateRef can theoretically go stale — this exact class of bug is
        // what caused the reel freeze), force-clear anything that could
        // leave the app stuck. ReelsView locks body scroll while open and
        // only unlocks it in its own unmount cleanup — if that never runs,
        // scrolling stays broken app-wide even after switching tabs.
        if(reelsRef.current?.closeReels) { reelsRef.current.closeReels(); reelsRef.current = null }
        document.body.style.overflow = ''
        document.body.style.overscrollBehavior = ''
        setTabWithHash('home')
        return
      }
    }
    window.addEventListener('popstate',handlePop)
    return()=>window.removeEventListener('popstate',handlePop)
  },[])
  const lastScrollY = useRef(0)

  useEffect(()=>{
    const handleScroll = () => {
      const y = window.scrollY
      if(y < 50) setNavVisible(true)
      else if(y > lastScrollY.current + 8) setNavVisible(false)
      else if(y < lastScrollY.current - 8) setNavVisible(true)
      lastScrollY.current = y
    }
    window.addEventListener('scroll', handleScroll, {passive:true})
    return()=>window.removeEventListener('scroll', handleScroll)
  },[])
  const [chatOverlay, setChatOverlay] = useState(null)
  const [pendingDM, setPendingDM] = useState(null)
  const bottomRef = useRef(null)

  // ── Ranked "For You" (server function feed_ranked, same one the native app uses).
  // If the SQL is not installed yet, everything below quietly falls back to the older on-device ranking.
  const rankedOkRef = useRef(null)          // null = unknown, true = works, false = not installed
  const rankedSeedRef = useRef(Math.random().toString(36).slice(2,8))
  const rankedLoadingRef = useRef(false)
  const rankedIdsRef = useRef([])
  const [rankedMore, setRankedMore] = useState(false)
  const RANK_PAGE = 30
  const fetchRankedPage = async (exclude) => {
    const { data: rows, error } = await supabase.rpc('feed_ranked', { p_limit: RANK_PAGE, p_exclude: exclude, p_reposts: true, p_seed: rankedSeedRef.current })
    if (error) {
      if (/could not find the function|does not exist|PGRST202|42883/i.test((error.code||'')+' '+(error.message||''))) rankedOkRef.current = false
      return null
    }
    const list = rows || []
    if (!list.length) return { items: [], ids: [], hasMore: false }
    const postIds = list.filter(r=>r.kind==='post').map(r=>String(r.post_id))
    const repostIds = list.filter(r=>r.kind==='repost').map(r=>String(r.repost_id))
    const POST_SEL = '*,author:profiles!user_id(*),likes(user_id),reposts(user_id),comments(id)'
    const [pRes, rRes, bRes1, bRes2] = await Promise.all([
      postIds.length ? supabase.from('posts').select(POST_SEL).in('id', postIds) : Promise.resolve({data:[]}),
      repostIds.length ? supabase.from('reposts').select('id,created_at,content,user:profiles!user_id(*),post:posts('+POST_SEL+')').in('id', repostIds) : Promise.resolve({data:[]}),
      supabase.from('blocks').select('blocked_id').eq('blocker_id', currentUser.id),
      supabase.from('blocks').select('blocker_id').eq('blocked_id', currentUser.id),
    ])
    if (pRes.error || rRes.error) return null
    const hidden = new Set([...(bRes1.data||[]).map(b=>b.blocked_id), ...(bRes2.data||[]).map(b=>b.blocker_id)])
    const shape = (p) => ({ ...p, user_liked:p.likes?.some(l=>l.user_id===currentUser.id), user_reposted:p.reposts?.some(r=>r.user_id===currentUser.id), likes_count:p.likes?.length||0, reposts_count:p.reposts?.length||0, comments_count:p.comments?.length||0 })
    const byPost = {}; (pRes.data||[]).forEach(p=>{ byPost[String(p.id)] = { ...shape(p), sortTime:p.created_at } })
    const byRepost = {}; (rRes.data||[]).filter(r=>r.post).forEach(r=>{ byRepost[String(r.id)] = { ...shape(r.post), isRepost:true, reposter:r.user, quoteContent:r.content, sortTime:r.created_at } })
    const items = []
    list.forEach(r => {
      const it = r.kind==='repost' ? byRepost[String(r.repost_id)] : byPost[String(r.post_id)]
      if (!it || hidden.has(it.user_id) || (it.isRepost && hidden.has(it.reposter?.id))) return
      items.push(it)
    })
    return { items, ids: list.map(r=>String(r.post_id)), hasMore: list.length >= RANK_PAGE }
  }
  const loadMoreRanked = async () => {
    if (rankedLoadingRef.current || rankedOkRef.current !== true) return
    rankedLoadingRef.current = true
    try {
      const exclude = Array.from(new Set(rankedIdsRef.current || []))
      const next = await fetchRankedPage(exclude)
      if (next) {
        rankedIdsRef.current = [...exclude, ...next.ids]
        setPosts(prev => {
          const have = new Set(prev.map(p => (p.isRepost?'r':'p')+p.id+(p.reposter?.id||'')))
          return [...prev, ...next.items.filter(p => !have.has((p.isRepost?'r':'p')+p.id+(p.reposter?.id||'')))]
        })
        setRankedMore(next.hasMore && next.items.length > 0)
      } else setRankedMore(false)
    } finally { rankedLoadingRef.current = false }
  }

  const loadPosts = useCallback(async (feedType='foryou') => {
    setLoading(true)
    try {
      if (feedType==='foryou' && rankedOkRef.current !== false) {
        rankedSeedRef.current = Math.random().toString(36).slice(2,8)  // new shuffle on every refresh
        const first = await fetchRankedPage([])
        if (first && first.items.length) {
          rankedOkRef.current = true
          rankedIdsRef.current = first.ids
          setPosts(first.items); setVisibleCount(10); setRankedMore(first.hasMore)
          setLoading(false)
          return
        }
        // empty or unavailable -> use the older ranking below
        setRankedMore(false)
      } else setRankedMore(false)
      // fetch who current user follows and has interacted with
      const [{data:followsData},{data:likedData},{data:commentedData},{data:blockedByMe},{data:blockedMe}] = await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id',currentUser.id),
        supabase.from('likes').select('post_id,posts(user_id)').eq('user_id',currentUser.id).limit(50),
        supabase.from('comments').select('post_id,posts(user_id)').eq('user_id',currentUser.id).limit(50),
        supabase.from('blocks').select('blocked_id').eq('blocker_id',currentUser.id),
        supabase.from('blocks').select('blocker_id').eq('blocked_id',currentUser.id),
      ])
      const hiddenUserIds = new Set([...(blockedByMe||[]).map(b=>b.blocked_id), ...(blockedMe||[]).map(b=>b.blocker_id)])
      const followingIds = new Set((followsData||[]).map(f=>f.following_id))
      // build author affinity score: how much this user has interacted with each author
      const affinityMap = {}
      ;(likedData||[]).forEach(l=>{ const uid=l.posts?.user_id; if(uid){ affinityMap[uid]=(affinityMap[uid]||0)+1 } })
      ;(commentedData||[]).forEach(c=>{ const uid=c.posts?.user_id; if(uid){ affinityMap[uid]=(affinityMap[uid]||0)+2 } })
      followingIds.forEach(id=>{ affinityMap[id]=(affinityMap[id]||0)+3 })

      let postsQuery = supabase.from('posts').select('*,author:profiles!user_id(*),likes(user_id),reposts(user_id),comments(id)').order('created_at',{ascending:false}).limit(feedType==='following'?60:150)
      let repostsQuery = supabase.from('reposts').select('id,created_at,content,user:profiles!user_id(*),post:posts(*,author:profiles!user_id(*),likes(user_id),reposts(user_id),comments(id))').order('created_at',{ascending:false}).limit(60)

      if(feedType==='following'){
        if(!followingIds.size){ setPosts([]); setVisibleCount(10); setLoading(false); return }
        postsQuery = postsQuery.in('user_id',[...followingIds])
        repostsQuery = repostsQuery.in('user_id',[...followingIds])
      }

      const [{data:rawData},{data:rawRepostsData}] = await Promise.all([postsQuery,repostsQuery])
      const data = (rawData||[]).filter(p=>!hiddenUserIds.has(p.user_id))
      const repostsData = (rawRepostsData||[]).filter(r=>!hiddenUserIds.has(r.user?.id) && !hiddenUserIds.has(r.post?.user_id))
      const now = Date.now()

      // Exponential half-life decay: recency stays a meaningful, always-present
      // signal (never hard-clamps to 0 like a linear falloff would), so a fresh
      // post from someone you don't follow can still surface, while a 3-day-old
      // post and a 3-month-old post are no longer scored as equally "stale".
      const halfLifeHours = 30
      const recencyOf = (hrs) => 100 * Math.pow(0.5, hrs/halfLifeHours)
      // Affinity/engagement are capped so a handful of heavily-liked accounts
      // can't permanently outrank everything else regardless of how old their
      // posts get — recency always keeps some pull on the final ranking.
      const followBoost = (uid) => followingIds.has(uid) ? 35 : 0
      const affinityOf = (uid) => Math.min((affinityMap[uid]||0) * 6, 55)

      const normalized = (data||[]).map(p=>{
        const ageHours = (now - new Date(p.created_at).getTime()) / 3600000
        const likes = p.likes?.length||0
        const comments = p.comments?.length||0
        const reposts = p.reposts?.length||0
        const engagement = Math.min(likes*1 + comments*2 + reposts*1.5, 40)
        const recencyScore = recencyOf(ageHours)
        const isOwn = p.user_id===currentUser.id ? -20 : 0 // slightly deprioritize own posts
        const score = feedType==='foryou' ? (recencyScore + engagement*0.8 + followBoost(p.user_id) + affinityOf(p.user_id) + isOwn) : recencyScore
        return {...p,user_liked:p.likes?.some(l=>l.user_id===currentUser.id),user_reposted:p.reposts?.some(r=>r.user_id===currentUser.id),likes_count:likes,reposts_count:reposts,comments_count:comments,sortTime:p.created_at,_score:score}
      })

      const repostItems = (repostsData||[]).filter(r=>r.post).map(r=>{
        const p=r.post
        const ageHours=(now-new Date(r.created_at).getTime())/3600000
        const recencyScore=recencyOf(ageHours)
        return {...p,user_liked:p.likes?.some(l=>l.user_id===currentUser.id),user_reposted:p.reposts?.some(rp=>rp.user_id===currentUser.id),likes_count:p.likes?.length||0,reposts_count:p.reposts?.length||0,comments_count:p.comments?.length||0,isRepost:true,reposter:r.user,quoteContent:r.content,sortTime:r.created_at,_score:recencyScore+followBoost(r.user?.id)+affinityOf(r.user?.id)}
      })

      // The score above decides WHICH posts are relevant enough to include
      // (still shaped by who you follow and engage with) — but the actual
      // display order is always strict recency, most-recent-to-oldest. This
      // is what was producing the "old post pinned above new ones" complaint:
      // sorting the feed itself by score let a high-affinity old post outrank
      // a brand new one. Now score only trims the pool; time always wins the
      // final ordering.
      const pool = [...normalized,...repostItems]
      const relevant = feedType==='foryou'
        ? pool.sort((a,b)=>b._score-a._score).slice(0,80)
        : pool
      const final = relevant.sort((a,b)=> new Date(b.sortTime) - new Date(a.sortTime))

      setPosts(final)
      setVisibleCount(10)
    } catch(e){ console.error('loadPosts error',e) }
    setLoading(false)
  },[currentUser.id])

  useEffect(()=>{ loadPosts(feedTab) },[feedTab])

  useEffect(()=>{
    const ch = supabase.channel('new-posts').on('postgres_changes',{event:'INSERT',schema:'public',table:'posts'},async(payload)=>{
      if(payload.new.user_id===currentUser.id) return
      const {data} = await supabase.from('posts').select('*,author:profiles!user_id(*),likes(user_id),reposts(user_id),comments(id)').eq('id',payload.new.id).single()
      if(data) setPosts(prev=>[{...data,likes_count:0,reposts_count:0,comments_count:0,user_liked:false,user_reposted:false},...prev])
    }).subscribe()
    return()=>supabase.removeChannel(ch)
  },[])

  useEffect(()=>{
    if(tab==='friends') {
      // Only show the skeleton on the very first visit — a revisit already
      // has data on screen, so refresh it silently instead of flashing the
      // skeleton and making the tab feel like it's loading from scratch
      // every single time.
      if(people.length===0) setPeopleLoading(true)
      supabase.from('profiles').select('*').neq('id',currentUser.id).limit(40).then(({data})=>{setPeople(data||[]);setPeopleLoading(false)})
      // Load who current user already follows
      supabase.from('follows').select('following_id').eq('follower_id',currentUser.id).then(({data})=>{
        const map = {}
        ;(data||[]).forEach(f=>{ map[f.following_id]=true })
        setFollowed(map)
      })
    }
  },[tab])
  const loadGroupsForList = async () => {
    const {data:mems} = await supabase.from('group_members').select('group_id,last_read_at').eq('user_id',currentUser.id)
    if(!mems?.length){ setGroupsForList([]); return }
    const results = await Promise.all(mems.map(async m=>{
      const {data:group} = await supabase.from('groups').select('*,group_members(user_id)').eq('id',m.group_id).maybeSingle()
      if(!group) return null
      const {data:lastMsg} = await supabase.from('group_messages').select('content,created_at,sender_id,is_sticker,is_voice').eq('group_id',group.id).order('created_at',{ascending:false}).limit(1).maybeSingle()
      const {count:unreadCount} = await supabase.from('group_messages').select('id',{count:'exact',head:true}).eq('group_id',group.id).neq('sender_id',currentUser.id).gt('created_at',m.last_read_at||'1970-01-01T00:00:00Z')
      return {id:group.id, type:'group', group, last:lastMsg, unread:(unreadCount||0)>0}
    }))
    setGroupsForList(results.filter(Boolean))
  }

  useEffect(()=>{ if(tab==='messages'&&dmView==='list') { loadConvos(conversations.length===0); loadGroupsForList() } },[tab])

  const loadConvos = async(showSkeleton=false) => {
    if(showSkeleton) setConvosLoading(true)
    const {data:parts} = await supabase.from('conversation_participants').select('conversation_id,last_read_at').eq('user_id',currentUser.id)
    if(!parts?.length){setConversations([]);setConvosLoading(false);return}
    const results = await Promise.all(parts.map(async p=>{
      const id = p.conversation_id
      const {data:op} = await supabase.from('conversation_participants').select('user_id').eq('conversation_id',id).neq('user_id',currentUser.id).maybeSingle()
      if(!op) return null
      const {data:prof} = await supabase.from('profiles').select('id,display_name,username,avatar_color,avatar_url').eq('id',op.user_id).single()
      let {data:lastMsg, error:lastMsgErr} = await supabase.from('messages').select('content,created_at,sender_id,is_sticker,is_voice').eq('conversation_id',id).order('created_at',{ascending:false}).limit(1).maybeSingle()
      if(lastMsgErr && isMissingColumnError(lastMsgErr)) {
        // is_voice column doesn't exist yet (supabase_migration_voice_notes.sql
        // not run) — fall back so the conversation list still loads instead of
        // every conversation losing its last-message preview.
        console.warn('is_voice column missing, retrying without it — run supabase_migration_voice_notes.sql', lastMsgErr)
        ;({data:lastMsg} = await supabase.from('messages').select('content,created_at,sender_id,is_sticker').eq('conversation_id',id).order('created_at',{ascending:false}).limit(1).maybeSingle())
      }
      const {count:unreadCount} = await supabase.from('messages').select('id',{count:'exact',head:true}).eq('conversation_id',id).neq('sender_id',currentUser.id).gt('created_at',p.last_read_at||'1970-01-01T00:00:00Z')
      return {id, other:prof, last:lastMsg, unread:(unreadCount||0)>0}
    }))
    setConversations(results.filter(Boolean).sort((a,b)=>new Date(b.last?.created_at||0)-new Date(a.last?.created_at||0)))
    setConvosLoading(false)
  }

  useEffect(()=>{
    if(!selectedConv) { setDmBlocked(false); return }
    if(selectedConv.id==='omnicore-ai' || !selectedConv.other?.id) { setDmBlocked(false) }
    else {
      Promise.all([
        supabase.from('blocks').select('id').eq('blocker_id',currentUser.id).eq('blocked_id',selectedConv.other.id).maybeSingle(),
        supabase.from('blocks').select('id').eq('blocker_id',selectedConv.other.id).eq('blocked_id',currentUser.id).maybeSingle(),
      ]).then(([mine,theirs])=>setDmBlocked(!!mine.data || !!theirs.data))
    }
    if(selectedConv.id!=='omnicore-ai') {
      supabase.from('conversation_participants').update({last_read_at:new Date().toISOString()}).eq('conversation_id',selectedConv.id).eq('user_id',currentUser.id).then(()=>{
        unreadConvoIdsRef.current.delete(selectedConv.id)
        recomputeDMBadge()
      })
      supabase.from('messages').update({read_at:new Date().toISOString()}).eq('conversation_id',selectedConv.id).neq('sender_id',currentUser.id).is('read_at',null).then(()=>{})
    }
    const fetchMessages = async() => {
      const {data} = await supabase.from('messages').select('*,sender:profiles!sender_id(id,display_name,avatar_color,avatar_url),message_reactions(user_id,emoji)').eq('conversation_id',selectedConv.id).order('created_at',{ascending:true})
      // Preserve any not-yet-confirmed optimistic bubble for *this* conversation
      // instead of wiping it — a slow insert shouldn't make a just-sent message
      // vanish before its confirmation (or failure) comes back.
      if(data) setMessages(prev=>{
        const pending = prev.filter(m=>m.id.toString().startsWith('tmp')&&m.conversation_id===selectedConv.id)
        return [...data,...pending]
      })
    }
    fetchMessages()
    // Realtime subscription below handles live updates — this poll is just a
    // safety net in case a realtime connection silently drops, not the
    // primary sync mechanism, so it doesn't need to run every few seconds.
    const pollInterval = setInterval(fetchMessages, 30000)
    const ch = supabase.channel(`m:${selectedConv.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`conversation_id=eq.${selectedConv.id}`},async(payload)=>{
      let alreadyHave = false
      setMessages(prev=>{ alreadyHave = prev.some(m=>m.id===payload.new.id); return prev })
      if(alreadyHave) { // broadcast already delivered this one — just mark it read, skip the extra round trip
        if(payload.new.sender_id !== currentUser.id) supabase.from('messages').update({read_at:new Date().toISOString()}).eq('id',payload.new.id).then(()=>{})
        return
      }
      const {data} = await supabase.from('messages').select('*,sender:profiles!sender_id(id,display_name,avatar_color,avatar_url),message_reactions(user_id,emoji)').eq('id',payload.new.id).single()
      if(data) {
        setMessages(prev=>{
          // remove any optimistic temp message that matches, avoid duplicates
          const filtered = prev.filter(m=>!(m.id.toString().startsWith('tmp')&&m.content===data.content&&m.sender_id===data.sender_id))
          const exists = filtered.some(m=>m.id===data.id)
          return exists ? filtered : [...filtered,data]
        })
        if(data.sender_id !== currentUser.id) {
          supabase.from('messages').update({read_at:new Date().toISOString()}).eq('id',data.id).then(()=>{})
        }
      }
    }).on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages',filter:`conversation_id=eq.${selectedConv.id}`},(payload)=>{
      setMessages(prev=>prev.map(m=>m.id===payload.new.id?{...m,read_at:payload.new.read_at}:m))
    }).on('postgres_changes',{event:'*',schema:'public',table:'message_reactions'},async()=>{
      const {data} = await supabase.from('messages').select('*,sender:profiles!sender_id(id,display_name,avatar_color,avatar_url),message_reactions(user_id,emoji)').eq('conversation_id',selectedConv.id).order('created_at',{ascending:true})
      if(data) setMessages(prev=>{
        const pending = prev.filter(m=>m.id.toString().startsWith('tmp')&&m.conversation_id===selectedConv.id)
        return [...data,...pending]
      })
    }).on('broadcast',{event:'new_message'},async(payload)=>{
      // Delivered instantly by the sender — no DB round trip needed on this end.
      const msg = payload.payload
      if(!msg?.id) return
      setMessages(prev=>{
        const filtered = prev.filter(m=>!(m.id.toString().startsWith('tmp')&&m.content===msg.content&&m.sender_id===msg.sender_id))
        return filtered.some(m=>m.id===msg.id) ? filtered : [...filtered,{...msg,message_reactions:msg.message_reactions||[]}]
      })
      if(msg.sender_id !== currentUser.id) {
        supabase.from('messages').update({read_at:new Date().toISOString()}).eq('id',msg.id).then(()=>{})
      }
    }).on('broadcast',{event:'typing'},(payload)=>{
      if(payload.payload?.user_id===currentUser.id) return
      setOtherTyping(true)
      clearTimeout(dmTypingTimeoutRef.current)
      dmTypingTimeoutRef.current = setTimeout(()=>setOtherTyping(false),3000)
    }).subscribe()
    dmChannelRef.current = ch
    return()=>{ clearInterval(pollInterval); supabase.removeChannel(ch); setOtherTyping(false) }
  },[selectedConv])

  const dmScrollRef = useRef(null)
  const dmUserScrolledUp = useRef(false)
  const dmIsNearBottom = () => { const el=dmScrollRef.current; if(!el) return true; return el.scrollHeight-el.scrollTop-el.clientHeight < 120 }
  useEffect(()=>{ if(!dmUserScrolledUp.current) bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])
  // reset scroll-up flag when conversation changes
  useEffect(()=>{ dmUserScrolledUp.current=false },[selectedConv])

  const [allPeople, setAllPeople] = useState([])

  useEffect(()=>{
    if(dmView==='new'){
      supabase.from('profiles').select('id,display_name,username,avatar_color,avatar_url').neq('id',currentUser.id).limit(50).then(({data})=>setAllPeople(data||[]))
    }
  },[dmView])

  useEffect(()=>{
    if(!searchQ.trim()){setSearchResults([]);return}
    const q = searchQ.toLowerCase()
    setSearchResults(allPeople.filter(u=>u.display_name?.toLowerCase().includes(q)||u.username?.toLowerCase().includes(q)))
  },[searchQ,allPeople])

  // Global search (top search icon): searches people AND posts, not just the
  // small cached allPeople list used by the "new DM" screen above.
  const [showSearch, setShowSearch] = useState(false)
  const [gsQuery, setGsQuery] = useState('')
  const [gsTab, setGsTab] = useState('people')
  const [gsPeople, setGsPeople] = useState([])
  const [gsPosts, setGsPosts] = useState([])
  const [gsLoading, setGsLoading] = useState(false)
  useEffect(()=>{
    if(!showSearch) return
    const q = gsQuery.trim()
    if(!q){ setGsPeople([]); setGsPosts([]); return }
    setGsLoading(true)
    const t = setTimeout(async()=>{
      const [{data:people},{data:postsRes}] = await Promise.all([
        supabase.from('profiles').select('id,display_name,username,avatar_color,avatar_url').neq('id',currentUser.id)
          .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`).limit(20),
        supabase.from('posts').select('*,author:profiles!user_id(*),likes(user_id),reposts(user_id),comments(id)')
          .ilike('content',`%${q}%`).order('created_at',{ascending:false}).limit(20),
      ])
      setGsPeople(people||[])
      setGsPosts((postsRes||[]).map(p=>({...p,user_liked:p.likes?.some(l=>l.user_id===currentUser.id),user_reposted:p.reposts?.some(r=>r.user_id===currentUser.id),likes_count:p.likes?.length||0,reposts_count:p.reposts?.length||0,comments_count:p.comments?.length||0})))
      setGsLoading(false)
    },300) // debounce so we're not firing a query on every keystroke
    return ()=>clearTimeout(t)
  },[gsQuery,showSearch,currentUser.id])

  const sendPost = async() => {
    if((!composeText.trim()&&!composeImage&&!composeVideo)||composeBusy||composeVideoIssue) return
    let imageUrl = null
    let videoUrl = null
    setComposeBusy(true); setComposePct(0)
    if(composeImage) {
      const ext = composeImage.name.split('.').pop().toLowerCase()
      const path = 'posts/'+currentUser.id+'_'+Date.now()+'.'+ext
      let urlData
      try { urlData = await uploadToR2(composeImage, path) }
      catch(err) { alert('Image upload failed: '+err.message); setComposeBusy(false); return }
      imageUrl = urlData.publicUrl
    }
    if(composeVideo) {
      const ext = (composeVideo.name.split('.').pop()||'mp4').toLowerCase()
      const path = 'posts/'+currentUser.id+'_'+Date.now()+'.'+ext
      try {
        const limit = (currentUser?.verified||currentUser?.is_authentic) ? 60 : 20
        const up = await uploadVideoChunked(composeVideo, path, { maxDurationSeconds:limit, maxSizeBytes:200*1024*1024, onProgress:setComposePct })
        videoUrl = up.publicUrl
      } catch(err) { alert(err.message||'Video upload failed'); setComposeBusy(false); return }
    }
    const {data} = await supabase.from('posts').insert({user_id:currentUser.id,content:composeText.trim(),image_url:imageUrl,video_url:videoUrl}).select('*,author:profiles!user_id(*),likes(user_id),reposts(user_id),comments(id)').single()
    if(data) {
      setPosts(prev=>[{...data,likes_count:0,reposts_count:0,comments_count:0,user_liked:false,user_reposted:false},...prev])
      // Video posts also appear in Reels, same as the native app.
      if(videoUrl) { try { await supabase.from('reels').insert({user_id:currentUser.id,video_url:videoUrl,caption:composeText.trim()}) } catch(e) {} }
      // detect @mentions and notify tagged users
      const handles = [...new Set((composeText.match(/@([a-zA-Z0-9_]+)/g)||[]).map(h=>h.slice(1).toLowerCase()))]
      if(handles.length){
        const {data:taggedUsers} = await supabase.from('profiles').select('id,username').in('username',handles)
        if(taggedUsers?.length){
          await Promise.all(taggedUsers.filter(u=>u.id!==currentUser.id).map(u=>
            supabase.from('notifications').insert({user_id:u.id,actor_id:currentUser.id,type:'mention',post_id:data.id})
          ))
        }
      }
      if(handles.includes('flittersai')){
        triggerAiMentionReply({ postId: data.id, postContent: composeText.trim() })
      }
    }
    setComposeText(''); setComposeImage(null); setComposeImageUrl(null); clearComposeVideo(); setComposeBusy(false); setComposePct(0); setShowCompose(false)
  }

  const deletePost = async(postId) => {
    await supabase.from('posts').delete().eq('id',postId).eq('user_id',currentUser.id)
    setPosts(prev=>prev.filter(p=>p.id!==postId))
  }

  const openDMWithUser = async(user) => {
    setViewingUser(null)
    setShowMyProfile(false)
    const {data:myP} = await supabase.from('conversation_participants').select('conversation_id').eq('user_id',currentUser.id)
    let convId = null
    if(myP?.length){
      const {data:shared} = await supabase.from('conversation_participants').select('conversation_id').eq('user_id',user.id).in('conversation_id',myP.map(p=>p.conversation_id))
      if(shared?.length) convId = shared[0].conversation_id
    }
    if(!convId){
      const {data:conv} = await supabase.from('conversations').insert({}).select().single()
      await supabase.from('conversation_participants').insert([{conversation_id:conv.id,user_id:currentUser.id},{conversation_id:conv.id,user_id:user.id}])
      convId = conv.id
    }
    if(!myConversationIdsRef.current.includes(convId)) myConversationIdsRef.current.push(convId)
    setTabWithHash('messages')
    setSelectedConv({id:convId,other:user})
    setDmView('chat')
  }

  const dmInputRef = useRef(null)
  const dmSendInFlight = useRef(false)
  const sendMsg = async() => {
    if(dmSendInFlight.current) return
    if(!msgText.trim()||!selectedConv?.id) return
    dmSendInFlight.current = true
    const content=msgText.trim(); const reply=dmReplyTo; const replyId=dmReplyToId
    setMsgText(''); setDmReplyTo(null); setDmReplyToId(null)
    if(dmInputRef.current) dmInputRef.current.style.height='auto'
    const tempId = 'tmp'+Date.now()
    const tmp={id:tempId,conversation_id:selectedConv.id,sender_id:currentUser.id,content,reply_to:reply,reply_to_id:replyId,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    try {
      let {data:inserted, error} = await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content,reply_to:reply,reply_to_id:replyId}).select('id,created_at').single()
      if(error && isMissingColumnError(error)) {
        // reply_to_id column doesn't exist yet (migration not run) — fall back
        // so the core chat still works instead of failing every send.
        console.warn('reply_to_id column missing, retrying without it — run supabase_migration_reply_and_stickers.sql', error)
        ;({data:inserted, error} = await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content,reply_to:reply}).select('id,created_at').single())
      }
      if(inserted){
        setMessages(prev=>prev.map(m=>m.id===tempId?{...tmp,id:inserted.id,created_at:inserted.created_at}:m))
        // broadcast the full message straight to the other side — no waiting
        // on postgres replication lag for it to feel instant on their end.
        dmChannelRef.current?.send({type:'broadcast',event:'new_message',payload:{
          id:inserted.id, sender_id:currentUser.id, content, reply_to:reply, reply_to_id:replyId, created_at:inserted.created_at,
          sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url},
          message_reactions:[]
        }})
      } else {
        console.error('Message send failed:', error)
        setMessages(prev=>prev.map(m=>m.id===tempId?{...m,_failed:true}:m))
      }
      if(selectedConv.other?.id && selectedConv.id!=='omnicore-ai') {
        sendPush(selectedConv.other.id, (currentUser.display_name||'New message'), content.slice(0,100))
      }
      loadConvos()
    } finally { dmSendInFlight.current = false }
  }


  const toggleFollow = async(user) => {
    const isF = !!followed[user.id]
    // Update UI immediately
    setFollowed(p=>({...p,[user.id]:!isF}))
    if(isF) {
      const {error} = await supabase.from('follows').delete().eq('follower_id',currentUser.id).eq('following_id',user.id)
      if(error) setFollowed(p=>({...p,[user.id]:true})) // revert on error
    } else {
      const {error} = await supabase.from('follows').insert({follower_id:currentUser.id,following_id:user.id})
      if(error) setFollowed(p=>({...p,[user.id]:false})) // revert on error
    }
  }

  const handleUserClick = (user) => {
    if(!user?.id) return
    feedScrollPosRef.current = window.scrollY
    if(user.id===currentUser.id){setShowMyProfile(true);return}
    setViewingUser(user)
  }

  const handleDMLongPress = (msg) => { dmLongPressTimer.current = setTimeout(()=>setSelectedDMMsg(msg),500) }
  const handleDMPressEnd = () => clearTimeout(dmLongPressTimer.current)
  const toggleDMReaction = async(msg,emoji) => {
    const mine = msg.message_reactions?.find(r=>r.user_id===currentUser.id)
    setSelectedDMMsg(null)
    if(mine && mine.emoji===emoji){
      setMessages(prev=>prev.map(m=>m.id===msg.id?{...m,message_reactions:(m.message_reactions||[]).filter(r=>r.user_id!==currentUser.id)}:m))
      await supabase.from('message_reactions').delete().eq('message_id',msg.id).eq('user_id',currentUser.id)
    } else {
      setMessages(prev=>prev.map(m=>m.id===msg.id?{...m,message_reactions:[...(m.message_reactions||[]).filter(r=>r.user_id!==currentUser.id),{user_id:currentUser.id,emoji}]}:m))
      await supabase.from('message_reactions').upsert({message_id:msg.id,user_id:currentUser.id,emoji},{onConflict:'message_id,user_id'})
    }
  }

  const deleteDMMsg = async(msg) => {
    setSelectedDMMsg(null)
    await supabase.from('messages').delete().eq('id',msg.id).eq('sender_id',currentUser.id)
    setMessages(prev=>prev.filter(m=>m.id!==msg.id))
  }

  const saveDMEdit = async() => {
    if(!editDMText.trim()) return
    await supabase.from('messages').update({content:editDMText.trim()}).eq('id',editingDMMsg).eq('sender_id',currentUser.id)
    setMessages(prev=>prev.map(m=>m.id===editingDMMsg?{...m,content:editDMText.trim()}:m))
    setEditingDMMsg(null); setEditDMText('')
  }

  const sendDMImage = async(file)=>{
    if(!file||!selectedConv?.id) return
    setSendingDMImg(true)
    const ext=file.name.split('.').pop()
    const path='chats/dm_'+selectedConv.id+'_'+Date.now()+'.'+ext
    let urlData
    try { urlData = await uploadToR2(file, path) }
    catch(err){alert('Upload failed: '+err.message);setSendingDMImg(false);return}
    const url=urlData.publicUrl
    const tempId = 'tmp_img'+Date.now()
    const tmp={id:tempId,conversation_id:selectedConv.id,sender_id:currentUser.id,content:'',image_url:url,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    const {data:inserted} = await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content:'',image_url:url}).select('id,created_at').single()
    if(inserted){
      setMessages(prev=>prev.map(m=>m.id===tempId?{...tmp,id:inserted.id,created_at:inserted.created_at}:m))
      dmChannelRef.current?.send({type:'broadcast',event:'new_message',payload:{
        id:inserted.id, sender_id:currentUser.id, content:'', image_url:url, created_at:inserted.created_at,
        sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url},
        message_reactions:[]
      }})
    }
    setSendingDMImg(false)
  }

  const sendDMSticker = async(stickerUrl)=>{
    if(!selectedConv?.id) return
    setShowDMStickerTray(false)
    const tempId = 'tmp_stk'+Date.now()
    const tmp={id:tempId,conversation_id:selectedConv.id,sender_id:currentUser.id,content:'',is_sticker:true,sticker_url:stickerUrl,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    const {data:inserted,error} = await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content:'',is_sticker:true,sticker_url:stickerUrl}).select('id,created_at').single()
    if(inserted){
      setMessages(prev=>prev.map(m=>m.id===tempId?{...tmp,id:inserted.id,created_at:inserted.created_at}:m))
      dmChannelRef.current?.send({type:'broadcast',event:'new_message',payload:{
        id:inserted.id, sender_id:currentUser.id, content:'', is_sticker:true, sticker_url:stickerUrl, created_at:inserted.created_at,
        sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url},
        message_reactions:[]
      }})
      if(selectedConv.other?.id && selectedConv.id!=='omnicore-ai') {
        sendPush(selectedConv.other.id, (currentUser.display_name||'New message'), (currentUser.display_name||'Someone')+' sent you a sticker')
      }
      loadConvos()
    } else {
      console.error('Sticker send failed:', error)
      setMessages(prev=>prev.map(m=>m.id===tempId?{...m,_failed:true}:m))
      if(isMissingColumnError(error)) alert('Stickers need one-time setup — run supabase_migration_reply_and_stickers.sql in Supabase first.')
      else alert('Sticker failed to send: '+(error?.message||'unknown error'))
    }
  }

  const sendDMVoiceNote = async () => {
    if(!selectedConv?.id) return
    const result = await dmVoice.stop()
    if(!result || result.duration<1) return
    setSendingDMVoice(true)
    const path = 'voice/dm_'+selectedConv.id+'_'+Date.now()+'.webm'
    let urlData
    try { urlData = await uploadToR2(new File([result.blob],'voice.webm',{type:result.blob.type||'audio/webm'}), path) }
    catch(err) { alert('Voice note upload failed: '+err.message); setSendingDMVoice(false); return }
    const voiceUrl = urlData.publicUrl
    const tempId = 'tmp_voice'+Date.now()
    const tmp={id:tempId,conversation_id:selectedConv.id,sender_id:currentUser.id,content:'',is_voice:true,voice_url:voiceUrl,voice_duration:result.duration,created_at:new Date().toISOString(),sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url}}
    setMessages(prev=>[...prev,tmp])
    const {data:inserted,error} = await supabase.from('messages').insert({conversation_id:selectedConv.id,sender_id:currentUser.id,content:'',is_voice:true,voice_url:voiceUrl,voice_duration:result.duration}).select('id,created_at').single()
    if(inserted){
      setMessages(prev=>prev.map(m=>m.id===tempId?{...tmp,id:inserted.id,created_at:inserted.created_at}:m))
      dmChannelRef.current?.send({type:'broadcast',event:'new_message',payload:{
        id:inserted.id, sender_id:currentUser.id, content:'', is_voice:true, voice_url:voiceUrl, voice_duration:result.duration, created_at:inserted.created_at,
        sender:{display_name:currentUser.display_name,avatar_color:currentUser.avatar_color,avatar_url:currentUser.avatar_url},
        message_reactions:[]
      }})
      if(selectedConv.other?.id && selectedConv.id!=='omnicore-ai') {
        sendPush(selectedConv.other.id, (currentUser.display_name||'New message'), (currentUser.display_name||'Someone')+' sent a voice message')
      }
      loadConvos()
    } else {
      console.error('Voice note send failed:', error)
      setMessages(prev=>prev.map(m=>m.id===tempId?{...m,_failed:true}:m))
      if(isMissingColumnError(error)) alert('Voice notes need one-time setup — run supabase_migration_voice_notes.sql in Supabase first.')
      else alert('Voice note failed to send: '+(error?.message||'unknown error'))
    }
    setSendingDMVoice(false)
  }

  const showLocalNotif = (title, body) => {
    try {
      if(typeof Notification === 'undefined') return
      if(Notification.permission !== 'granted') return
      setTimeout(async ()=>{
        try {
          if('serviceWorker' in navigator){
            const reg = await navigator.serviceWorker.ready
            reg.showNotification(title, {body, icon:'/icon-192.png', tag:Date.now().toString()})
          } else {
            new Notification(title, {body, icon:'/icon-192.png', tag:Date.now().toString()})
          }
        }
        catch(e){ console.log('Notif error:',e.message) }
      }, 100)
    } catch(e){ console.log('showLocalNotif error:',e) }
  }

  const sendPush = async(userId, title, body) => {
    try {
      const {data} = await supabase.from('push_subscriptions').select('id,subscription').eq('user_id',userId).order('created_at',{ascending:false})
      const rows = data||[]
      if(!rows.length) { console.log('No push subscription for user',userId); return {ok:false, error:'No subscription found for this account'} }
      // Only ever target the single freshest subscription. If someone has
      // used the app on more than one domain (each origin gets its own,
      // independently-valid subscription), sending to every row on file
      // means sending the same notification once per domain they've ever
      // visited — which is exactly the "double notification" bug. Picking
      // just the newest one also naturally retires older domains' rows
      // below once they fail as stale.
      const [freshest, ...stale] = rows
      if(stale.length) supabase.from('push_subscriptions').delete().in('id', stale.map(r=>r.id)).then(()=>{})
      const res = await fetch('/api/push',{method:'POST',headers:await authJsonHeaders(),body:JSON.stringify({subscription:freshest.subscription,title,body,url:'/'})})
      if(!res.ok){
        const err = await res.json().catch(()=>({}))
        if(err.statusCode===404 || err.statusCode===410) {
          supabase.from('push_subscriptions').delete().eq('id',freshest.id).then(()=>{})
        }
        console.error('Push send failed:', err.error||('HTTP '+res.status))
        return {ok:false, error:err.error||('HTTP '+res.status)}
      }
      return {ok:true}
    } catch(e) { console.log('Push send error',e); return {ok:false, error:e.message} }
  }

  const TABS=[{id:'home',label:'Home',icon:<Home size={22}/>},{id:'messages',label:'Messages',icon:<MessageCircle size={22}/>},{id:'pulse',label:'Store',icon:<ShoppingBag size={22}/>},{id:'friends',label:'People',icon:<Users size={22}/>},{id:'notifications',label:'Alerts',icon:<Bell size={22}/>}]
  const TRENDING=[{tag:'#GlobalVoices',posts:'142K',cat:'Worldwide'},{tag:'#TechForGood',posts:'89K',cat:'Technology'},{tag:'#WorldCulture',posts:'211K',cat:'Culture'},{tag:'#FlittersSpotlight',posts:'445K',cat:'Flitters'},{tag:'#FutureNow',posts:'78K',cat:'Trending'},{tag:'#ClimateAction',posts:'190K',cat:'Environment'},{tag:'#StartupLife',posts:'55K',cat:'Business'},{tag:'#MusicMonday',posts:'33K',cat:'Entertainment'}]

  
  // ── Desktop: sidebar + centered column (the sidebar is hidden on phones by CSS) ──
  const goTab = (id) => {
    setShowAdmin(false); setShowSettings(false); setShowMyProfile(false); setViewingPost(null); setViewingUser(null)
    setViewingGroupChat(null); setShowSearch(false); setShowComposeMenu(false); setHideNav(false); setDmView('list')
    setTabWithHash(id)
  }
  const wrap = (node) => (
    <DesktopShell tab={tab} onNav={goTab}
      badges={{messages:unreadDM, notifications:unreadNotifs, messagesDot:unreadGC&&!unreadDM}}
      onSearch={()=>{goTab(tab);setShowSearch(true)}}
      onProfile={()=>{goTab(tab);setShowMyProfile(true)}}
      onSettings={()=>{goTab(tab);setShowSettings(true)}}
      onCompose={()=>{goTab('home');setShowCompose(true)}}
      onAdmin={()=>{goTab(tab);setShowAdmin(true)}} isAdmin={currentUser?.id===ADMIN_ID}
      user={currentUser} avatarUrl={avatarUrl} color={color}>
      {node}
    </DesktopShell>
  )

  if(showAdmin) return wrap(<AdminPanel currentUser={currentUser} supabase={supabase} onBack={()=>setShowAdmin(false)}/>)
  if(showSettings) return wrap(<SettingsView currentUser={currentUser} supabase={supabase} onBack={()=>setShowSettings(false)} onSignOut={handleSignOut} onAvatarUpdate={url=>{setAvatarUrl(url);currentUser.avatar_url=url}} sendPush={sendPush} setupPush={setupPush} requestNotifPermission={requestNotifPermission}/>)
  if(showMyProfile) return wrap(<MyProfileView currentUser={currentUser} supabase={supabase} avatarUrl={avatarUrl} onBack={()=>setShowMyProfile(false)} onSettings={()=>{setShowMyProfile(false);setShowSettings(true)}}/>)
  if(viewingPost) return wrap(
    <div className="screen-in-safe" style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)'}}>
      <div className="dk-bar" style={{position:'fixed',top:'var(--vv-top,0px)',left:0,right:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'calc(12px + env(safe-area-inset-top)) 16px 12px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={closePost} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',fontSize:24,padding:0}}>‹</button>
        <span style={{fontWeight:700,fontSize:17}}>Post</span>
      </div>
      {/* Header moved from sticky-in-flow to fixed (matching DM/Group Chat) —
          it no longer takes up space in normal flow, so this spacer keeps
          content from starting underneath it. ~58px covers the header's
          rendered height across devices without a real safe-area inset. */}
      <div style={{height:'calc(58px + env(safe-area-inset-top))'}}/>
      <PostCard post={viewingPost} currentUser={currentUser} supabase={supabase} onUserClick={u=>{closePost();handleUserClick(u)}} onDelete={null} autoExpandComments sendPush={sendPush}/>
    </div>
  )

  return wrap(
    <div className="app-col" style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)',fontFamily:'sans-serif'}}>
      {!hideNav && <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'calc(10px + env(safe-area-inset-top)) 16px 10px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <button onClick={()=>setShowMyProfile(true)} style={{background:'none',border:'none',cursor:'pointer',padding:0,zIndex:1}}>
          <Avatar url={avatarUrl} name={currentUser?.display_name} color={color} size={36}/>
        </button>
        {/* Absolutely centered regardless of the avatar/icons on either side
            having different widths — space-between alone doesn't actually
            center a middle element unless both sides match exactly. */}
        <div onClick={()=>window.location.reload()} style={{position:'absolute',left:'50%',top:0,bottom:0,transform:'translateX(-50%)',display:'flex',alignItems:'center',cursor:'pointer',userSelect:'none'}}>
          <img src={FLITTERS_MARK} alt="Flitters" width="36" height="36" style={{objectFit:'contain',filter:theme==='light'?'drop-shadow(0 0 1px rgba(0,0,0,0.5)) drop-shadow(0 0 1px rgba(0,0,0,0.5))':'none'}}/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,zIndex:1}}>
          
          {currentUser?.id===ADMIN_ID&&<button onClick={()=>setShowAdmin(true)} style={{background:'linear-gradient(135deg,#F7B731,#FF6B35)',border:'none',borderRadius:16,padding:'5px 10px',cursor:'pointer',color:'var(--text-primary)',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',gap:4}}><Megaphone size={13}/> Ads</button>}
<button onClick={()=>setShowSearch(true)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex'}}><Search size={22}/></button>
<button onClick={()=>setShowSettings(true)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex'}}><Settings size={22}/></button>
        </div>
      </div>}

      {showSearch && (
        <div className="dk-page" style={{position:'fixed',inset:0,zIndex:60,background:'var(--bg-app)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{position:'sticky',top:0,zIndex:10,background:'var(--bg-header)',backdropFilter:'blur(8px)',borderBottom:'1px solid var(--border-color)',padding:'calc(10px + env(safe-area-inset-top)) 16px 10px',display:'flex',alignItems:'center',gap:10}}>
            <button onClick={()=>{setShowSearch(false);setGsQuery('')}} style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',fontSize:24,padding:0}}>‹</button>
            <input autoFocus value={gsQuery} onChange={e=>setGsQuery(e.target.value)} placeholder="Search people or posts..." style={{...inp,flex:1}}/>
          </div>
          <div style={{display:'flex',borderBottom:'1px solid var(--border-color)',position:'sticky',top:58,zIndex:5,background:'var(--bg-header)'}}>
            {[{id:'people',label:'People'},{id:'posts',label:'Posts'}].map(t=>(
              <button key={t.id} onClick={()=>setGsTab(t.id)} style={{flex:1,padding:'12px 0',background:'none',border:'none',borderBottom:gsTab===t.id?'2px solid var(--primary)':'2px solid transparent',color:gsTab===t.id?'var(--text-primary)':'var(--text-muted)',fontWeight:gsTab===t.id?700:500,fontSize:14,cursor:'pointer'}}>{t.label}</button>
            ))}
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {!gsQuery.trim() && <p style={{padding:'40px 20px',textAlign:'center',color:'var(--text-quaternary)',fontSize:14}}>Search for people by name or username, or find posts by keyword.</p>}
            {gsQuery.trim() && gsLoading && <p style={{padding:'40px 20px',textAlign:'center',color:'var(--text-quaternary)',fontSize:14}}>Searching...</p>}
            {gsQuery.trim() && !gsLoading && gsTab==='people' && gsPeople.length===0 && <p style={{padding:'40px 20px',textAlign:'center',color:'var(--text-quaternary)',fontSize:14}}>No people found</p>}
            {gsTab==='people' && gsPeople.map(u=>(
              <div key={u.id} onClick={()=>{setShowSearch(false);setGsQuery('');handleUserClick(u)}} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:'1px solid var(--bg-card-5)',cursor:'pointer'}}>
                <Avatar url={u.avatar_url} name={u.display_name} color={u.avatar_color} size={44}/>
                <div><div style={{fontWeight:700,fontSize:15}}>{u.display_name}</div><div style={{color:'var(--text-muted)',fontSize:13}}>@{u.username}</div></div>
              </div>
            ))}
            {gsQuery.trim() && !gsLoading && gsTab==='posts' && gsPosts.length===0 && <p style={{padding:'40px 20px',textAlign:'center',color:'var(--text-quaternary)',fontSize:14}}>No posts found</p>}
            {gsTab==='posts' && gsPosts.map(post=>(
              <PostCard key={post.id} post={post} currentUser={currentUser} supabase={supabase} onUserClick={u=>{setShowSearch(false);setGsQuery('');handleUserClick(u)}} onDelete={null} onOpenPost={id=>{setShowSearch(false);setGsQuery('');openPost(id)}} sendPush={sendPush}/>
            ))}
          </div>
        </div>
      )}

      <div style={{paddingBottom:110}}>
        {tab==='home'&&<>
          <AnnouncementBanner supabase={supabase}/>
          <div style={{display:'flex',borderBottom:'1px solid var(--border-color)',position:'sticky',top:58,zIndex:5,background:'var(--bg-header)',backdropFilter:'blur(7px)'}}>
            {[{id:'foryou',label:'For You'},{id:'following',label:'Following'},{id:'global',label:'Global'}].map(t=>(
              <button key={t.id} onClick={()=>setFeedTab(t.id)} style={{flex:1,padding:'14px 0',background:'none',border:'none',borderBottom:feedTab===t.id?'2px solid var(--primary)':'2px solid transparent',color:feedTab===t.id?'var(--text-primary)':'var(--text-secondary)',fontWeight:feedTab===t.id?700:500,fontSize:14,cursor:'pointer'}}>{t.label}</button>
            ))}
          </div>
          {loading&&<FeedSkeleton count={5}/>}
          {!loading&&posts.length===0&&<div style={{padding:'60px 20px',textAlign:'center'}}><div style={{display:'flex',justifyContent:'center',color:'var(--text-quaternary)'}}><Globe size={44}/></div><p style={{color:'var(--text-muted)',fontSize:16,marginTop:8}}>{feedTab==='following'?'Follow people to see their posts':'No posts yet. Be the first on Flitters!'}</p></div>}
          {posts.slice(0,visibleCount).map((post,i)=>(
            <div key={(post.isRepost?'repost_'+post.id+'_'+post.reposter?.id:'post_'+post.id)}>
              <PostCard post={post} currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick} onDelete={deletePost} onOpenPost={openPost} sendPush={sendPush}/>
              {ads.length>0&&(i+1)%4===0&&<AdCard ad={ads[Math.floor(i/4)%ads.length]}/>}
              
              {(i+1)%10===0&&<ReelPreviewCard supabase={supabase} onOpen={(reelId)=>{setTabWithHash('pulse');setPendingReelId(reelId)}}/>}
            </div>
          ))}
          {!loading && (visibleCount<posts.length || (feedTab==='foryou'&&rankedMore)) && <FeedLoadMoreSentinel onReached={()=>{ setVisibleCount(v=>Math.min(v+10,posts.length)); if(feedTab==='foryou'&&rankedMore&&posts.length-visibleCount<=12) loadMoreRanked() }}/>}
        </>}

        {tab==='messages'&&<>
          {dmView==='list'&&<>
            <div style={{padding:'16px',borderBottom:'1px solid var(--border-color)',display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative'}}>
              <span style={{fontWeight:800,fontSize:20}}>Messages</span>
              <button onClick={()=>setShowComposeMenu(v=>!v)} style={{background:'rgba(var(--primary-rgb),0.1)',border:'1px solid rgba(var(--primary-rgb),0.2)',borderRadius:12,padding:'8px 16px',color:'var(--primary)',cursor:'pointer',fontWeight:700,fontSize:13}}>+ New</button>
              {showComposeMenu&&<>
                <div onClick={()=>setShowComposeMenu(false)} style={{position:'fixed',inset:0,zIndex:19}}/>
                <div style={{position:'absolute',top:'100%',right:16,marginTop:6,background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:14,overflow:'hidden',zIndex:20,minWidth:180,boxShadow:'0 8px 24px rgba(0,0,0,0.3)'}}>
                  <button onClick={()=>{setSearchQ('');setDmView('new');setShowComposeMenu(false)}} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'12px 16px',background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',fontSize:14,fontWeight:600,textAlign:'left'}}><MessageCircle size={16}/> New Message</button>
                  <button onClick={()=>{setGcName('');setGcDesc('');setGcTag('');setGcJoinMode('open');setGcColor('var(--primary)');setDmView('newgroup');setShowComposeMenu(false)}} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'12px 16px',background:'none',border:'none',borderTop:'1px solid var(--border-color)',color:'var(--text-primary)',cursor:'pointer',fontSize:14,fontWeight:600,textAlign:'left'}}><Users size={16}/> Create Group</button>
                </div>
              </>}
            </div>
            {/* Flitters AI — always pinned first */}
            <div onClick={()=>{setSelectedConv({id:'omnicore-ai',other:OMNICORE_PROFILE});setDmView('chat')}}
              style={{display:'flex',alignItems:'center',gap:12,padding:'16px',borderBottom:'1px solid var(--bg-card-5)',color:'var(--text-primary)',cursor:'pointer',background:'rgba(168,85,247,0.04)'}}>
              <img src="/flitters-ai-icon.png" alt="Flitters AI" style={{width:50,height:50,objectFit:'contain',flexShrink:0}} loading="lazy"/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                  <span style={{fontWeight:700,fontSize:15}}>Flitters AI</span>
                  <span style={{fontSize:10,background:'linear-gradient(135deg,#22D3EE,#A855F7,#EC4899)',color:'var(--text-primary)',borderRadius:6,padding:'1px 6px',fontWeight:700}}>AI</span>
                </div>
                <p style={{color:'var(--text-secondary)',fontSize:13,margin:0}}>Your AI assistant · Always online</p>
              </div>
              <span style={{color:'var(--text-quaternary)',fontSize:20}}>›</span>
            </div>
            {convosLoading && <RowSkeletonList count={6}/>}
            {!convosLoading && [...conversations.map(c=>({...c,type:'dm'})), ...groupsForList].sort((a,b)=>new Date(b.last?.created_at||0)-new Date(a.last?.created_at||0)).map(item=>item.type==='group'?(
              <div key={'g_'+item.id}
                onClick={()=>{ setViewingGroupChat(item.group); setHideNav(true) }}
                style={{display:'flex',alignItems:'center',gap:12,padding:'16px',borderBottom:'1px solid var(--bg-card-5)',color:'var(--text-primary)',cursor:'pointer',WebkitTapHighlightColor:'rgba(var(--primary-rgb),0.1)',userSelect:'none'}}>
                <div style={{position:'relative',flexShrink:0}}>
                  <div style={{width:50,height:50,borderRadius:16,background:item.group.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:'#fff',overflow:'hidden'}}>
                    {item.group.avatar_url?<img src={item.group.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" loading="lazy"/>:item.group.name[0]}
                  </div>
                  {item.unread&&<span style={{position:'absolute',top:-2,right:-2,width:13,height:13,borderRadius:'50%',background:'var(--danger)',border:'2px solid var(--bg-app)'}}/>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontWeight:item.unread?800:700,fontSize:15,display:'flex',alignItems:'center',gap:5}}><Users size={13} color="var(--text-quaternary)"/>{item.group.name}</span>
                    {item.last&&<span style={{color:item.unread?'var(--primary)':'var(--text-quaternary)',fontSize:12,fontWeight:item.unread?700:400}}>{timeAgo(item.last.created_at)}</span>}
                  </div>
                  <p style={{color:item.unread?'var(--text-primary)':'var(--text-secondary)',fontWeight:item.unread?600:400,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',margin:0}}>
                    {item.last
                      ? (item.last.is_sticker
                          ? (item.last.sender_id===currentUser.id?'You sent a sticker':'Sent a sticker')
                          : item.last.is_voice
                          ? (item.last.sender_id===currentUser.id?'You sent a voice message':'Sent a voice message')
                          : (item.last.sender_id===currentUser.id?'You: ':'')+item.last.content)
                      : 'Tap to chat'}
                  </p>
                </div>
                <span style={{color:'var(--text-quaternary)',fontSize:20}}>›</span>
              </div>
            ):(
              <div key={'c_'+item.id}
                onClick={()=>{ setSelectedConv(item); setDmView('chat') }}
                style={{display:'flex',alignItems:'center',gap:12,padding:'16px',borderBottom:'1px solid var(--bg-card-5)',color:'var(--text-primary)',cursor:'pointer',WebkitTapHighlightColor:'rgba(var(--primary-rgb),0.1)',userSelect:'none'}}>
                <div style={{position:'relative',flexShrink:0}}>
                  <Avatar url={item.other?.avatar_url} name={item.other?.display_name} color={item.other?.avatar_color||'#5B9CF6'} size={50} online={!!onlineUsers[item.other?.id]}/>
                  {item.unread&&<span style={{position:'absolute',top:-2,right:-2,width:13,height:13,borderRadius:'50%',background:'var(--danger)',border:'2px solid var(--bg-app)'}}/>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontWeight:item.unread?800:700,fontSize:15}}>{item.other?.display_name}</span>
                    {item.last&&<span style={{color:item.unread?'var(--primary)':'var(--text-quaternary)',fontSize:12,fontWeight:item.unread?700:400}}>{timeAgo(item.last.created_at)}</span>}
                  </div>
                  <p style={{color:item.unread?'var(--text-primary)':'var(--text-secondary)',fontWeight:item.unread?600:400,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',margin:0}}>
                    {item.last
                      ? (item.last.is_sticker
                          ? (item.last.sender_id===currentUser.id?'You sent a sticker':(item.other?.display_name||'They')+' sent a sticker')
                          : item.last.is_voice
                          ? (item.last.sender_id===currentUser.id?'You sent a voice message':(item.other?.display_name||'They')+' sent a voice message')
                          : (item.last.sender_id===currentUser.id?'You: ':'')+item.last.content)
                      : 'Tap to chat'}
                  </p>
                </div>
                <span style={{color:'var(--text-quaternary)',fontSize:20}}>›</span>
              </div>
            ))}
            {!convosLoading && conversations.length===0 && groupsForList.length===0 && <p style={{textAlign:'center',color:'var(--text-quaternary)',fontSize:14,padding:'40px 20px'}}>No conversations yet — tap + New to message someone or start a group.</p>}
          </>}

          {dmView==='new'&&<>
            <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border-color)',display:'flex',alignItems:'center',gap:12}}>
              <button onClick={()=>setDmView('list')} style={{background:'none',border:'none',color:'var(--text-tertiary)',cursor:'pointer',fontSize:24}}>‹</button>
              <span style={{fontWeight:700,fontSize:17}}>New Message</span>
            </div>
            <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border-color)'}}>
              <input autoFocus value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search name or username..." style={{...inp}}/>
            </div>
            {!searchQ&&allPeople.map(u=>(
              <div key={u.id} onClick={()=>openDMWithUser(u)} style={{display:'flex',alignItems:'center',gap:12,padding:'16px',borderBottom:'1px solid var(--bg-card-5)',color:'var(--text-primary)',cursor:'pointer'}}>
                <Avatar url={u.avatar_url} name={u.display_name} color={u.avatar_color||getColor(u.id)} size={46}/>
                <div style={{flex:1}}><div style={{fontWeight:700,fontSize:15}}>{u.display_name}</div><div style={{color:'var(--text-secondary)',fontSize:13}}>@{u.username}</div></div>
                <span style={{color:'var(--primary)',fontSize:22}}>›</span>
              </div>
            ))}
            {searchQ&&!searchResults.length&&<p style={{padding:'30px',textAlign:'center',color:'var(--text-quaternary)',fontSize:14}}>No users found</p>}
            {searchQ&&searchResults.map(u=>(
              <div key={u.id}
                onClick={()=>openDMWithUser(u)}
                onTouchEnd={(e)=>{ e.preventDefault(); openDMWithUser(u) }}
                style={{display:'flex',alignItems:'center',gap:12,padding:'16px',borderBottom:'1px solid var(--bg-card-5)',color:'var(--text-primary)',cursor:'pointer',WebkitTapHighlightColor:'transparent',userSelect:'none'}}>
                <Avatar url={u.avatar_url} name={u.display_name} color={u.avatar_color||getColor(u.id)} size={46}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:16}}>{u.display_name}</div>
                  <div style={{color:'var(--text-secondary)',fontSize:13}}>@{u.username}</div>
                </div>
                <span style={{color:'var(--primary)',fontSize:22}}>›</span>
              </div>
            ))}
          </>}

          {dmView==='newgroup'&&<div style={{minHeight:'100dvh'}}>
            <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border-color)',display:'flex',alignItems:'center',gap:12}}>
              <button onClick={()=>setDmView('list')} style={{background:'none',border:'none',color:'var(--text-tertiary)',cursor:'pointer',fontSize:24}}>‹</button>
              <span style={{fontWeight:700,fontSize:17,flex:1}}>Create Group</span>
              <button onClick={async()=>{
                if(!gcName.trim()) return
                setGcSaving(true)
                const tag = gcTag.trim().toLowerCase().replace(/[^a-z0-9_]/g,'')
                if(!tag){setGcSaving(false);alert('Please enter a valid group tag');return}
                const {data,error} = await supabase.from('groups').insert({name:gcName.trim(),description:gcDesc.trim(),creator_id:currentUser.id,cover_color:gcColor,tag,join_mode:gcJoinMode}).select().single()
                if(data){
                  await supabase.from('group_members').insert({group_id:data.id,user_id:currentUser.id})
                  if(!myGroupIdsRef.current.includes(data.id)) myGroupIdsRef.current.push(data.id)
                  setGroupsForList(prev=>[{id:data.id,type:'group',group:{...data,group_members:[{user_id:currentUser.id}]},last:null,unread:false},...prev])
                  setDmView('list')
                  setViewingGroupChat({...data,group_members:[{user_id:currentUser.id}]})
                  setHideNav(true)
                } else alert('Error: '+(error?.message||'could not create group'))
                setGcSaving(false)
              }} disabled={gcSaving||!gcName.trim()} style={{background:'var(--primary)',border:'none',borderRadius:20,padding:'8px 20px',color:'#fff',fontWeight:700,cursor:'pointer'}}>{gcSaving?'Creating...':'Create'}</button>
            </div>
            <div style={{padding:16}}>
              <div style={{width:72,height:72,borderRadius:20,background:gcColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,fontWeight:800,color:'#fff',margin:'16px auto 24px'}}>{gcName[0]||'G'}</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center',marginBottom:24}}>
                {['#5B9CF6','#845EF7','#FF6B35','#00C9A7','#FF4757','#F7B731','#FD79A8','#A29BFE'].map(c=><div key={c} onClick={()=>setGcColor(c)} style={{width:28,height:28,borderRadius:'50%',background:c,border:gcColor===c?'3px solid #fff':'3px solid transparent',cursor:'pointer'}}/>)}
              </div>
              <input value={gcName} onChange={e=>setGcName(e.target.value)} placeholder="Group name" style={{width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none',boxSizing:'border-box',marginBottom:12}}/>
              <div style={{position:'relative',marginBottom:12}}>
                <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)',fontSize:15}}>@</span>
                <input value={gcTag} onChange={e=>setGcTag(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} placeholder="group_tag (unique)" style={{width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px 12px 28px',color:'var(--text-primary)',fontSize:15,outline:'none',boxSizing:'border-box'}}/>
              </div>
              <textarea value={gcDesc} onChange={e=>setGcDesc(e.target.value)} placeholder="Description (optional)" rows={2} style={{width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none',resize:'none',fontFamily:'sans-serif',boxSizing:'border-box',marginBottom:12}}/>
              <div style={{marginBottom:8}}>
                <p style={{color:'var(--text-tertiary)',fontSize:13,marginBottom:8}}>Who can join?</p>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>setGcJoinMode('open')} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid '+(gcJoinMode==='open'?'var(--primary)':'var(--bg-card-2)'),background:gcJoinMode==='open'?'rgba(var(--primary-rgb),0.15)':'transparent',color:gcJoinMode==='open'?'var(--primary)':'var(--text-tertiary)',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Globe size={15}/> Anyone</button>
                  <button onClick={()=>setGcJoinMode('request')} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid '+(gcJoinMode==='request'?'#845EF7':'var(--bg-card-2)'),background:gcJoinMode==='request'?'rgba(132,94,247,0.15)':'transparent',color:gcJoinMode==='request'?'#845EF7':'var(--text-tertiary)',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Lock size={15}/> Request</button>
                </div>
              </div>
            </div>
          </div>}

          {viewingGroupChat&&<div className="dk-page" style={{position:'fixed',top:'var(--vv-top,0px)',left:0,right:0,height:'var(--vvh,100dvh)',zIndex:50,background:'var(--bg-app)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <GroupChat group={viewingGroupChat} currentUser={currentUser} supabase={supabase} onBack={()=>{setViewingGroupChat(null);setHideNav(false);loadGroupsForList()}} onUserClick={handleUserClick} onRead={(groupId)=>{unreadGroupIdsRef.current.delete(groupId);recomputeGCBadge()}}/>
          </div>}

          {dmView==='chat'&&selectedConv&&selectedConv.id==='omnicore-ai'&&<FlittersAI currentUser={currentUser} onClose={()=>{setDmView('list');setSelectedConv(null)}}/>}
          {dmView==='chat'&&selectedConv&&selectedConv.id!=='omnicore-ai'&&<div className="dk-page" style={{position:'fixed',top:'var(--vv-top,0px)',left:0,right:0,height:'var(--vvh,100dvh)',zIndex:50,background:'var(--bg-app)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            {fullscreenImg&&<div onClick={()=>setFullscreenImg(null)} style={{position:'fixed',inset:0,zIndex:999,background:'rgba(0,0,0,0.95)',display:'flex',alignItems:'center',justifyContent:'center'}}><img src={fullscreenImg} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} alt="" loading="lazy"/></div>}
            <div style={{padding:'calc(12px + env(safe-area-inset-top)) 16px 12px',borderBottom:'1px solid var(--border-color)',display:'flex',alignItems:'center',gap:12,background:'var(--bg-header)',backdropFilter:'blur(7px)',flexShrink:0}}>
              <button onClick={()=>{setDmView('list');setSelectedConv(null);setMessages([]);loadConvos()}} style={{background:'none',border:'none',color:'var(--text-tertiary)',cursor:'pointer',fontSize:24}}>‹</button>
              <div onClick={()=>setViewingUser(selectedConv.other)} style={{cursor:'pointer',flexShrink:0}}>
                <Avatar url={selectedConv.other?.avatar_url} name={selectedConv.other?.display_name} color={selectedConv.other?.avatar_color||'#5B9CF6'} size={38} online/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15}}>{selectedConv.other?.display_name}</div>
                <div style={{color:otherTyping?'var(--primary)':(onlineUsers[selectedConv?.other?.id]?'var(--repost)':'var(--text-secondary)'),fontSize:11}}>{otherTyping?'typing...':(onlineUsers[selectedConv?.other?.id]?'● Active now':'● Offline')}</div>
              </div>
            </div>
            <div ref={dmScrollRef} onScroll={()=>{ dmUserScrolledUp.current = !dmIsNearBottom() }} style={{flex:1,padding:'16px 14px',display:'flex',flexDirection:'column',gap:8,overflowY:'auto',height:0}}>
              {messages.length===0&&<div style={{textAlign:'center',marginTop:60,display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
                <Avatar url={selectedConv.other?.avatar_url} name={selectedConv.other?.display_name} color={selectedConv.other?.avatar_color||'#5B9CF6'} size={72}/>
                <p style={{color:'var(--text-quaternary)',fontSize:14}}>Say hello! 👋</p>
              </div>}
              {selectedDMMsg&&<div onClick={()=>setSelectedDMMsg(null)} style={{position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-end'}}>
                <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'#1a1d26',borderRadius:'20px 20px 0 0',padding:'16px 0 32px'}}>
                  <div style={{width:36,height:4,borderRadius:2,background:'var(--bg-card-8)',margin:'0 auto 16px'}}/>
                  <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:8,marginBottom:16,padding:'0 12px',maxHeight:170,overflowY:'auto'}}>
                    {QUICK_REACTIONS.map(e=>{
                      const mine = selectedDMMsg.message_reactions?.find(r=>r.user_id===currentUser.id)
                      const isMineActive = mine?.emoji===e
                      return (
                      <button key={e} onClick={()=>toggleDMReaction(selectedDMMsg,e)} style={{background:isMineActive?'rgba(var(--primary-rgb),0.25)':'var(--bg-card-6)',border:isMineActive?'1px solid var(--primary)':'none',borderRadius:12,padding:'8px',fontSize:22,cursor:'pointer'}}>{e}</button>
                      )
                    })}
                  </div>
                  <button onClick={()=>{setDmReplyTo(selectedDMMsg.sender?.display_name+': '+selectedDMMsg.content?.slice(0,50));setDmReplyToId(selectedDMMsg.id);setSelectedDMMsg(null)}} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid var(--border-color)',padding:'16px 20px',color:'rgba(255,255,255,0.92)',fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10}}><CornerUpLeft size={17}/> Reply</button>
                  {selectedDMMsg.content&&<button onClick={()=>{navigator.clipboard?.writeText(selectedDMMsg.content);setSelectedDMMsg(null)}} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid var(--border-color)',padding:'16px 20px',color:'rgba(255,255,255,0.92)',fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10}}><Copy size={17}/> Copy</button>}
                  {selectedDMMsg.sender_id===currentUser.id&&<>
                    <button onClick={()=>{setEditingDMMsg(selectedDMMsg.id);setEditDMText(selectedDMMsg.content);setSelectedDMMsg(null)}} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid var(--border-color)',padding:'16px 20px',color:'var(--primary)',fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10}}><Pencil size={17}/> Edit</button>
                    <button onClick={()=>deleteDMMsg(selectedDMMsg)} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid var(--border-color)',padding:'16px 20px',color:'var(--danger)',fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10}}><Trash2 size={17}/> Delete</button>
                  </>}
                  {selectedDMMsg.sender_id!==currentUser.id&&<button onClick={()=>{setReportingDMMsg(selectedDMMsg);setSelectedDMMsg(null)}} style={{width:'100%',background:'none',border:'none',borderTop:'1px solid var(--border-color)',padding:'16px 20px',color:'var(--danger)',fontSize:15,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10}}><AlertTriangle size={17}/> Report</button>}
                </div>
              </div>}
              {reportingDMMsg&&<ReportModal onClose={()=>setReportingDMMsg(null)} onSubmit={async(reason,details)=>{
                const {error} = await supabase.from('reports').insert({reporter_id:currentUser.id, reported_message_id:reportingDMMsg.id, reason, details:details||null})
                if(error) throw error
              }}/>}
              {messages.map(msg=>{
                const own = msg.sender_id===currentUser.id
                return(
                  <MessageBubble key={msg.id}
                    rowId={'dmmsg-'+msg.id}
                    msg={msg} own={own} currentUserId={currentUser.id}
                    onAvatarClick={()=>setViewingUser(msg.sender)}
                    onImageClick={setFullscreenImg}
                    onLongPress={()=>handleDMLongPress(msg)} onPressEnd={handleDMPressEnd}
                    reactions={msg.message_reactions}
                    onToggleReaction={(emoji)=>toggleDMReaction(msg,emoji)}
                    isEditing={editingDMMsg===msg.id}
                    editValue={editDMText} onEditChange={e=>setEditDMText(e.target.value)}
                    onSaveEdit={saveDMEdit} onCancelEdit={()=>setEditingDMMsg(null)}
                    showReadTicks
                    onJumpToReply={scrollToDMMessage} highlighted={dmHighlightMsgId===msg.id}
                  />
                )
              })}
              <div ref={bottomRef}/>
            </div>
            <div style={{flexShrink:0,maxWidth:600,width:'100%',margin:'0 auto',background:'var(--bg-app)',borderTop:'1px solid var(--border-color)',paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
              <ReplyComposerBar text={dmReplyTo} onCancel={()=>{setDmReplyTo(null);setDmReplyToId(null)}}/>
              {showDMStickerTray&&<StickerTray currentUser={currentUser} supabase={supabase} onSelect={sendDMSticker} onEmojiSelect={e=>setMsgText(t=>t+e)} onClose={()=>setShowDMStickerTray(false)}/>}
              {dmBlocked ? (
                <div style={{padding:'16px 14px',display:'flex',alignItems:'center',justifyContent:'center',gap:8,color:'var(--text-quaternary)',fontSize:13}}>
                  <Ban size={15}/> You can't message this conversation
                </div>
              ) : dmVoice.recording ? (
                <VoiceRecordingBar seconds={dmVoice.seconds} onCancel={dmVoice.cancel} onSend={sendDMVoiceNote}/>
              ) : (
              <div style={{padding:'10px 14px',display:'flex',gap:10,alignItems:'center'}}>
              <input ref={dmImgRef} type="file" accept="image/*" onChange={e=>sendDMImage(e.target.files[0])} style={{display:'none'}}/>
              <button onClick={()=>dmImgRef.current?.click()} disabled={sendingDMImg} style={{width:40,height:40,borderRadius:'50%',background:'var(--bg-card)',border:'none',cursor:'pointer',color:'var(--text-tertiary)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>{sendingDMImg?<Loader2 size={18} className="xspin"/>:<ImageIcon size={18}/>}</button>
              <button onClick={()=>setShowDMStickerTray(v=>!v)} style={{width:40,height:40,borderRadius:'50%',background:showDMStickerTray?'rgba(var(--primary-rgb),0.2)':'var(--bg-card)',border:'none',cursor:'pointer',color:showDMStickerTray?'var(--primary)':'var(--text-tertiary)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><Smile size={18}/></button>
              <textarea ref={dmInputRef} rows={1} value={msgText} onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey&&window.matchMedia('(hover: hover) and (pointer: fine)').matches){ e.preventDefault(); sendMsg() } }} onChange={e=>{setMsgText(e.target.value);sendDMTyping();const el=e.target;requestAnimationFrame(()=>{el.style.height='auto';el.style.height=Math.min(el.scrollHeight,120)+'px'})}} placeholder={dmReplyTo?'Reply...':'Message...'} style={{...inp,flex:1,minWidth:0,borderRadius:20,marginBottom:0,padding:'12px 18px',resize:'none',maxHeight:120,overflowY:'auto',lineHeight:1.4,fontFamily:'sans-serif'}}/>
              {msgText.trim() ? (
                <button onClick={sendMsg} style={{width:46,height:46,borderRadius:'50%',background:'var(--primary)',border:'none',cursor:'pointer',color:'#fff',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><Send size={19}/></button>
              ) : (
                <button onClick={dmVoice.start} disabled={sendingDMVoice} style={{width:46,height:46,borderRadius:'50%',background:'var(--bg-card-3)',border:'none',cursor:'pointer',color:'var(--text-primary)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>{sendingDMVoice?<Loader2 size={19} className="xspin"/>:<Mic size={19}/>}</button>
              )}
              </div>
              )}
            </div>
          </div>}
        </>}

        {tab==='friends'&&<>
          <div style={{display:'flex',borderBottom:'1px solid var(--border-color)',position:'sticky',top:58,zIndex:5,background:'var(--bg-header)',backdropFilter:'blur(7px)'}}>
            <button onClick={()=>setFriendsSubTab('friends')} style={{flex:1,padding:'14px 0',background:'none',border:'none',borderBottom:friendsSubTab==='friends'?'2px solid var(--primary)':'2px solid transparent',color:friendsSubTab==='friends'?'var(--text-primary)':'var(--text-secondary)',fontWeight:friendsSubTab==='friends'?700:500,fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Users size={15}/> Friends</button>
            <button onClick={()=>setFriendsSubTab('explore')} style={{flex:1,padding:'14px 0',background:'none',border:'none',borderBottom:friendsSubTab==='explore'?'2px solid var(--primary)':'2px solid transparent',color:friendsSubTab==='explore'?'var(--text-primary)':'var(--text-secondary)',fontWeight:friendsSubTab==='explore'?700:500,fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Compass size={15}/> Explore</button>
          </div>
          {friendsSubTab==='friends'&&<>
            {peopleLoading && <RowSkeletonList count={6}/>}
            {!peopleLoading && people.filter(u=>followed[u.id]).length===0&&<div style={{padding:'50px 20px',textAlign:'center'}}><div style={{display:'flex',justifyContent:'center',color:'var(--text-quaternary)'}}><Users size={36}/></div><p style={{color:'var(--text-secondary)',marginTop:8}}>You are not following anyone yet</p><p style={{color:'var(--text-quaternary)',fontSize:13,marginTop:4}}>Go to Explore to find people</p></div>}
            {!peopleLoading && people.filter(u=>followed[u.id]).map((u,i)=>(
              <div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid var(--bg-card-4)'}}>
                <button onClick={()=>handleUserClick(u)} style={{background:'none',border:'none',padding:0,cursor:'pointer'}}>
                  <Avatar url={u.avatar_url} name={u.display_name} color={u.avatar_color||COLORS[i%COLORS.length]} size={48}/>
                </button>
                <button onClick={()=>handleUserClick(u)} style={{flex:1,minWidth:0,background:'none',border:'none',cursor:'pointer',textAlign:'left',padding:0,color:'var(--text-primary)'}}>
                  <div style={{fontWeight:700,fontSize:15}}>{u.display_name}</div>
                  <div style={{color:'var(--text-secondary)',fontSize:13}}>@{u.username}</div>
                  {u.bio&&<div style={{color:'var(--text-muted)',fontSize:12,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.bio}</div>}
                </button>
                <button onClick={()=>toggleFollow(u)} style={{background:'var(--bg-card)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:20,padding:'8px 16px',color:'var(--text-primary)',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0}}>Following</button>
              </div>
            ))}
          </>}
          {friendsSubTab==='explore'&&<>
            <p style={{color:'var(--text-secondary)',fontSize:13,padding:'12px 16px 4px'}}>People you might know</p>
            {peopleLoading && <RowSkeletonList count={6}/>}
            {!peopleLoading && people.filter(u=>!followed[u.id]).map((u,i)=>(
              <div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid var(--bg-card-4)'}}>
                <button onClick={()=>handleUserClick(u)} style={{background:'none',border:'none',padding:0,cursor:'pointer'}}>
                  <Avatar url={u.avatar_url} name={u.display_name} color={u.avatar_color||COLORS[i%COLORS.length]} size={48}/>
                </button>
                <button onClick={()=>handleUserClick(u)} style={{flex:1,minWidth:0,background:'none',border:'none',cursor:'pointer',textAlign:'left',padding:0,color:'var(--text-primary)'}}>
                  <div style={{fontWeight:700,fontSize:15}}>{u.display_name}</div>
                  <div style={{color:'var(--text-secondary)',fontSize:13}}>@{u.username}</div>
                  {u.bio&&<div style={{color:'var(--text-muted)',fontSize:12,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.bio}</div>}
                </button>
                <button onClick={()=>toggleFollow(u)} style={{background:'var(--primary)',border:'none',borderRadius:20,padding:'8px 16px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0}}>Follow</button>
              </div>
            ))}
            {!peopleLoading && !people.filter(u=>!followed[u.id]).length&&<p style={{padding:'40px',textAlign:'center',color:'var(--text-quaternary)'}}>You follow everyone on Flitters!</p>}
          </>}
        </>}

        {/* Kept mounted always (visibility toggled via CSS) instead of
            conditionally rendered — conditional rendering was unmounting
            these on every tab switch, destroying their state, so coming
            back always meant a full refetch and the loading skeleton again,
            even on the 5th visit to the same tab. */}
        <div style={{display: tab==='pulse' ? 'block' : 'none'}}>
          <PulseTab currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick} pendingReelId={pendingReelId} onReelsOpened={()=>setPendingReelId(null)} reelsRef={reelsRef} onMessageUser={openDMWithUser}/>
        </div>
        {tab==='search'&&<div style={{padding:'60px 20px',textAlign:'center'}}><div style={{display:'flex',justifyContent:'center',color:'var(--text-quaternary)'}}><Search size={44}/></div><p style={{color:'var(--text-muted)',fontSize:16,marginTop:8}}>Search coming soon</p></div>}

        <div style={{display: tab==='notifications' ? 'block' : 'none'}}>
          <NotificationsPanel currentUser={currentUser} supabase={supabase} onUserClick={handleUserClick} onPostClick={openPost}/>
        </div>
      </div>

      {tab==='home'&&<button className="dk-hide" onClick={()=>setShowCompose(true)} style={{position:'fixed',bottom:96,right:18,width:56,height:56,borderRadius:'50%',background:'var(--primary)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:28,boxShadow:'0 4px 24px rgba(var(--primary-rgb),0.55)',zIndex:50}}>+</button>}

      <InAppToast toast={toast} onClose={()=>setToast(null)} onClick={()=>{
        const a = toast?.action
        setToast(null)
        if(!a) return
        if(a.type==='dm'){ setTab('messages'); setSelectedConv(a.conv); setDmView('chat') }
        else if(a.type==='group'){ if(a.group){ setTab('messages'); setViewingGroupChat(a.group); setHideNav(true) } }
        else if(a.type==='notif'){ setTab('notifications') }
      }}/>
      <div className="dk-hide" style={{position:'fixed',bottom:14,left:'50%',transform:(navVisible&&!(tab==='messages'&&dmView==='chat')&&!hideNav)?'translateX(-50%)':'translateX(-50%) translateY(100px)',zIndex:100,width:'calc(100% - 28px)',maxWidth:500,transition:'transform 0.3s ease',opacity:navVisible?1:0}}>
        <div style={{background:'var(--bg-header)',backdropFilter:'blur(14px)',borderRadius:30,padding:'8px 4px',border:'1px solid var(--border-color-2)',display:'flex',alignItems:'center',justifyContent:'space-around',boxShadow:'0 8px 40px var(--shadow-color)'}}>
          {TABS.map(({id,label,icon})=>{
            const badgeCount = id==='messages'?unreadDM:id==='notifications'?unreadNotifs:0
            // Groups now live in the Messages tab's unified list, so an
            // unread group shows here too — as a plain dot when there's no
            // numbered DM badge already drawing attention to this tab.
            const showDot = id==='messages'&&unreadGC&&!unreadDM
            return (
            <button key={id} onClick={()=>setTabWithHash(id)} style={{position:'relative',display:'flex',flexDirection:'column',alignItems:'center',gap:3,background:tab===id?'rgba(var(--primary-rgb),0.14)':'none',border:'none',cursor:'pointer',color:tab===id?'var(--primary)':'var(--text-muted)',padding:'8px 10px',borderRadius:20,minWidth:48}}>
              <span style={{fontSize:20,position:'relative'}}>
                {icon}
                {badgeCount>0&&<span style={{position:'absolute',top:-6,right:-10,background:'var(--danger)',color:'#fff',fontSize:10,fontWeight:800,borderRadius:9,minWidth:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px',border:'2px solid var(--bg-app)'}}>{badgeCount>9?'9+':badgeCount}</span>}
                {showDot&&<span style={{position:'absolute',top:-2,right:-6,width:9,height:9,borderRadius:'50%',background:'var(--danger)',border:'2px solid var(--bg-app)',animation:'pulseDot 1.5s infinite'}}/>}
              </span>
              <span style={{fontSize:9.5,fontWeight:tab===id?700:500}}>{label}</span>
            </button>
            )
          })}
          <style>{`@keyframes pulseDot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:0.6}}`}</style>
        </div>
      </div>

      {showCompose&&<div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'flex-end'}} onClick={()=>setShowCompose(false)}>
        <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'var(--bg-app)',borderRadius:'24px 24px 0 0',padding:'16px 20px 40px',border:'1px solid rgba(255,255,255,0.09)'}}>
          <div style={{width:36,height:4,borderRadius:2,background:'var(--bg-card-8)',margin:'0 auto 20px'}}/>
          <div style={{display:'flex',gap:12}}>
            <Avatar url={avatarUrl} name={currentUser?.display_name} color={color} size={42}/>
            <div style={{flex:1}}>
              <textarea value={composeText} onKeyDown={e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); sendPost() } }} onChange={e=>setComposeText(e.target.value)} placeholder="What's happening around the world?" autoFocus rows={3} style={{width:'100%',background:'transparent',border:'none',color:'var(--text-primary)',fontSize:17,resize:'none',outline:'none',lineHeight:1.6,fontFamily:'sans-serif'}}/>
              {composeImageUrl&&<div style={{position:'relative',marginBottom:8}}>
                <img src={composeImageUrl} style={{width:'100%',maxHeight:200,objectFit:'cover',borderRadius:12}} alt="preview" loading="lazy"/>
                <button onClick={()=>{setComposeImage(null);setComposeImageUrl(null)}} style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,0.7)',border:'none',borderRadius:'50%',width:28,height:28,color:'var(--text-primary)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14}/></button>
              </div>}
              {composeVideoUrl&&<div style={{position:'relative',marginBottom:8}}>
                <video src={composeVideoUrl} controls playsInline preload="metadata" style={{width:'100%',maxHeight:260,borderRadius:12,background:'#000'}}/>
                <button onClick={clearComposeVideo} style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,0.7)',border:'none',borderRadius:'50%',width:28,height:28,color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14}/></button>
                {composeVideoIssue&&<div style={{color:'var(--danger)',fontSize:13,marginTop:6,lineHeight:1.4}}>{composeVideoIssue}</div>}
              </div>}
              <input ref={composeVidRef} type="file" accept="video/*" onChange={e=>{const f=e.target.files[0];if(f)pickComposeVideo(f);e.target.value=''}} style={{display:'none'}}/>
              <input ref={composeImgRef} type="file" accept="image/*" onChange={e=>{const f=e.target.files[0];if(f){setComposeImage(f);if(typeof window!=='undefined')setComposeImageUrl(URL.createObjectURL(f))}}} style={{display:'none'}}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:12,borderTop:'1px solid var(--border-color)'}}>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <button onClick={()=>{clearComposeVideo();composeImgRef.current?.click()}} aria-label="Add photo" style={{background:'none',border:'none',color:'var(--primary)',cursor:'pointer',display:'flex'}}><ImageIcon size={22}/></button>
                  <button onClick={()=>composeVidRef.current?.click()} aria-label="Add video" style={{background:'none',border:'none',color:'var(--primary)',cursor:'pointer',display:'flex'}}><Video size={22}/></button>
                  <span style={{color:composeText.length>250?'var(--danger)':'var(--text-quaternary)',fontSize:13}}>{280-composeText.length}</span>
                </div>
                <button onClick={sendPost} disabled={(!composeText.trim()&&!composeImage&&!composeVideo)||composeBusy||!!composeVideoIssue} style={{background:((composeText.trim()||composeImage||composeVideo)&&!composeVideoIssue)?'var(--primary)':'var(--bg-card)',border:'none',borderRadius:24,padding:'10px 26px',color:((composeText.trim()||composeImage||composeVideo)&&!composeVideoIssue)?'#fff':'var(--text-quaternary)',fontWeight:700,fontSize:14,cursor:((composeText.trim()||composeImage||composeVideo)&&!composeVideoIssue&&!composeBusy)?'pointer':'not-allowed'}}>{composeBusy?(composeVideo?`Uploading ${Math.round(composePct*100)}%`:'Posting…'):'Flit it'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>}

      {/* Rendered as an overlay (not an early return) specifically so that
          opening a profile from within a reel — or Notifications, or
          anywhere else — doesn't unmount whatever's underneath. It used to
          be a top-level early return, which tore down the entire tree below
          it, including PulseTab's internal reel-viewing state; going back
          would then remount PulseTab fresh, landing on its default view
          instead of the reel you were actually on. */}
      {viewingUser && (
        <div className="dk-page" style={{position:'fixed',inset:0,zIndex:900,background:'var(--bg-app)'}}>
          <UserProfileView user={viewingUser} currentUser={currentUser} supabase={supabase} onBack={()=>setViewingUser(null)} onMessage={openDMWithUser} onOpenPost={openPost} sendPush={sendPush}/>
        </div>
      )}
    </div>
  )
}

export default function FlittersApp({ currentUser }) {
  if (!currentUser || !currentUser.id) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
        <img src={FLITTERS_MARK} alt="Flitters" width="70" height="70" style={{ objectFit: 'contain' }}/>
        <p style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>Something went wrong loading your account</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: 8, background: 'var(--primary)', border: 'none', borderRadius: 14, padding: '12px 28px', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Reload</button>
      </div>
    )
  }
  return <ErrorBoundary><FlittersAppInner currentUser={currentUser}/></ErrorBoundary>
}
