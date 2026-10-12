const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Fix 1: Realtime messages - move channel setup outside loadAll into separate useEffect
const oldLoadAll = `  useEffect(()=>{ loadAll() },[])
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])

  const loadAll = async () => {
    const [{data:msgs},{data:mems},{data:reqs}] = await Promise.all([
      supabase.from('group_messages').select('*,sender:profiles(id,display_name,avatar_url,avatar_color)').eq('group_id',group.id).order('created_at',{ascending:true}).limit(100),
      supabase.from('group_members').select('*,profile:profiles(id,display_name,username,avatar_url,avatar_color)').eq('group_id',group.id),
      supabase.from('group_join_requests').select('*,profile:profiles(id,display_name,username,avatar_url,avatar_color)').eq('group_id',group.id).eq('status','pending')
    ])
    setMessages(msgs||[])
    setMembers(mems||[])
    setJoinRequests(reqs||[])
    setLoading(false)

    const ch = supabase.channel('gc:'+group.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_messages',filter:'group_id=eq.'+group.id},async(payload)=>{
        const {data} = await supabase.from('group_messages').select('*,sender:profiles(id,display_name,avatar_url,avatar_color)').eq('id',payload.new.id).single()
        if(data) setMessages(prev=>[...prev,data])
      }).subscribe()
    return()=>supabase.removeChannel(ch)
  }`;

const newLoadAll = `  useEffect(()=>{ loadAll() },[])
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])
  useEffect(()=>{
    const ch = supabase.channel('gc:'+group.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_messages',filter:'group_id=eq.'+group.id},async(payload)=>{
        const {data} = await supabase.from('group_messages').select('*,sender:profiles(id,display_name,avatar_url,avatar_color)').eq('id',payload.new.id).single()
        if(data) setMessages(prev=>[...prev,data])
      }).subscribe()
    return()=>supabase.removeChannel(ch)
  },[])

  const loadAll = async () => {
    const [{data:msgs},{data:mems},{data:reqs}] = await Promise.all([
      supabase.from('group_messages').select('*,sender:profiles(id,display_name,avatar_url,avatar_color)').eq('group_id',group.id).order('created_at',{ascending:true}).limit(100),
      supabase.from('group_members').select('*,profile:profiles(id,display_name,username,avatar_url,avatar_color)').eq('group_id',group.id),
      supabase.from('group_join_requests').select('*,profile:profiles(id,display_name,username,avatar_url,avatar_color)').eq('group_id',group.id).eq('status','pending')
    ])
    setMessages(msgs||[])
    setMembers(mems||[])
    setJoinRequests(reqs||[])
    setLoading(false)
  }`;

if(code.includes(oldLoadAll)){code=code.replace(oldLoadAll,newLoadAll);console.log('Realtime fixed')}
else console.log('loadAll not found');

// Fix 2: sendMsg - optimistically add message immediately
code = code.replace(
  `  const sendMsg = async () => {
    if(!msgText.trim()) return
    const text = msgText.trim()
    setMsgText('')
    await supabase.from('group_messages').insert({group_id:group.id,sender_id:currentUser.id,content:text})
  }`,
  `  const sendMsg = async () => {
    if(!msgText.trim()) return
    const text = msgText.trim()
    setMsgText('')
    const tempMsg = {id:'temp_'+Date.now(),group_id:group.id,sender_id:currentUser.id,content:text,created_at:new Date().toISOString(),sender:{id:currentUser.id,display_name:currentUser.display_name,avatar_url:currentUser.avatar_url,avatar_color:currentUser.avatar_color}}
    setMessages(prev=>[...prev,tempMsg])
    await supabase.from('group_messages').insert({group_id:group.id,sender_id:currentUser.id,content:text})
  }`
);

// Fix 3: group avatar persisting - update groupAvatar state init and uploadGroupAvatar
code = code.replace(
  `  const [groupAvatar, setGroupAvatar] = useState(group.avatar_url||null)`,
  `  const [groupAvatar, setGroupAvatar] = useState(group.avatar_url||null)
  const [groupData, setGroupData] = useState(group)`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
