import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function JoinPage({ params }) {
  const { tag } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth?next=/join/' + tag)
  }

  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('tag', tag)
    .single()

  if (!group) {
    return (
      <div style={{minHeight:'100vh',background:'#090B10',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16,fontFamily:'sans-serif'}}>
        <p style={{fontSize:48}}>😕</p>
        <p style={{fontSize:20,fontWeight:700}}>Group not found</p>
        <p style={{color:'#555'}}>@{tag} doesn't exist</p>
        <a href="/" style={{color:'#5B9CF6',fontSize:15}}>← Back to Sphere</a>
      </div>
    )
  }

  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    redirect('/?group=' + group.id)
  }

  if (group.join_mode === 'open') {
    await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id })
    redirect('/?group=' + group.id)
  }

  // Request mode - insert join request
  await supabase.from('group_join_requests').upsert({ group_id: group.id, user_id: user.id, status: 'pending' })

  return (
    <div style={{minHeight:'100vh',background:'#090B10',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16,fontFamily:'sans-serif',padding:24,textAlign:'center'}}>
      <div style={{width:80,height:80,borderRadius:24,background:group.cover_color||'#5B9CF6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,fontWeight:800,color:'#fff'}}>{group.name[0]}</div>
      <h1 style={{fontSize:24,fontWeight:800,margin:0}}>{group.name}</h1>
      <p style={{color:'#888',margin:0}}>@{group.tag}</p>
      {group.description&&<p style={{color:'#aaa',fontSize:15,maxWidth:300}}>{group.description}</p>}
      <div style={{background:'rgba(247,183,49,0.1)',border:'1px solid rgba(247,183,49,0.3)',borderRadius:16,padding:'16px 24px',maxWidth:300}}>
        <p style={{color:'#F7B731',fontWeight:700,margin:'0 0 4px'}}>🔒 Join Request Sent</p>
        <p style={{color:'#888',fontSize:13,margin:0}}>An admin needs to approve your request before you can join.</p>
      </div>
      <a href="/" style={{color:'#5B9CF6',fontSize:15,marginTop:8}}>← Back to Sphere</a>
    </div>
  )
}
