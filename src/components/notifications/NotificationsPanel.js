'use client'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { RowSkeletonList } from '@/components/common/Skeletons'
import { NOTIF_TYPE_INFO } from '@/lib/constants'
import { timeAgo } from '@/lib/timeAgo'

export function NotificationsPanel({ currentUser, supabase, onUserClick, onPostClick }) {
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)
  const typeInfo = NOTIF_TYPE_INFO
  useEffect(()=>{
    supabase.from('notifications').select('*,actor:profiles!actor_id(id,display_name,username,avatar_color,avatar_url)').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(40).then(({data})=>{setNotifs(data||[]);setLoading(false)})
    supabase.from('notifications').update({read:true}).eq('user_id',currentUser.id).eq('read',false).then(()=>{})
    const ch = supabase.channel('notifs:'+currentUser.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${currentUser.id}`},async(payload)=>{
      const {data} = await supabase.from('notifications').select('*,actor:profiles!actor_id(id,display_name,username,avatar_color,avatar_url)').eq('id',payload.new.id).single()
      if(data) setNotifs(prev=>[data,...prev])
    }).subscribe()
    return()=>supabase.removeChannel(ch)
  },[])
  return(
    <div>
      <div style={{padding:'16px 16px 12px',fontWeight:800,fontSize:20,color:'var(--text-primary)',display:'flex',alignItems:'center',gap:8}}>Notifications <Bell size={18}/></div>
      {loading&&<RowSkeletonList count={5}/>}
      {!loading&&notifs.length===0&&<div style={{padding:'50px 20px',textAlign:'center'}}><div style={{display:'flex',justifyContent:'center',color:'var(--text-quaternary)'}}><Bell size={40}/></div><p style={{color:'var(--text-secondary)',marginTop:8}}>No notifications yet</p></div>}
      {notifs.map((n,i)=>{
        const info = typeInfo[n.type]||{icon:<Bell size={16}/>,text:''}
        const actor = n.actor
        const goesToPost = ['mention','like','comment','repost'].includes(n.type) && n.post_id
        return(<div key={n.id||i} onClick={()=>{ if(goesToPost) onPostClick?.(n.post_id); else if(actor) onUserClick(actor) }} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderBottom:'1px solid var(--bg-card-4)',cursor:(goesToPost||actor)?'pointer':'default',background:n.read?'transparent':'rgba(var(--primary-rgb),0.05)'}}>
          <div style={{width:44,height:44,borderRadius:'50%',background:'var(--bg-card-3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0,overflow:'hidden'}}>
            {actor?.avatar_url?<img src={actor.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" loading="lazy"/>:<span style={{color:'var(--text-secondary)',display:'flex'}}>{info.icon}</span>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <span style={{fontWeight:700,fontSize:14,color:'var(--text-primary)'}}>{actor?.display_name||'Flitters'} </span>
            <span style={{color:'var(--text-tertiary)',fontSize:14}}>{n.message||info.text}</span>
          </div>
          <span style={{color:'var(--text-quaternary)',fontSize:12,flexShrink:0}}>{timeAgo(n.created_at)}</span>
        </div>)
      })}
    </div>
  )
}
