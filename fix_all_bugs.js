const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Fix 1: removeMember - use RLS-compatible delete with correct filter
code = code.replace(
  `  const removeMember = async (member) => {
    if(member.user_id===group.creator_id) return
    await supabase.from('group_members').delete().eq('group_id',group.id).eq('user_id',member.user_id)
    setMembers(prev=>prev.filter(m=>m.user_id!==member.user_id))
  }`,
  `  const removeMember = async (member) => {
    if(member.user_id===group.creator_id) return
    const {error} = await supabase.from('group_members').delete().eq('group_id',group.id).eq('user_id',member.user_id)
    if(!error) setMembers(prev=>prev.filter(m=>m.user_id!==member.user_id))
    else alert('Could not remove member. Check admin permissions.')
  }`
);

// Fix 2: Hide nav bar when in chat (DM or group) - make nav invisible in messages dmView=chat
code = code.replace(
  `{tab==='messages'&&dmView==='list'&&`,
  `{tab==='messages'&&dmView==='list'&&`
);

// Fix nav visibility - hide when in chat views
code = code.replace(
  `transform:navVisible?'translateX(-50%)':'translateX(-50%) translateY(100px)'`,
  `transform:(navVisible&&!(tab==='messages'&&dmView==='chat'))?'translateX(-50%)':'translateX(-50%) translateY(100px)'`
);

// Fix 3: Group chat paddingBottom - reduce when nav is hidden
code = code.replace(
  `<div style={{flex:1,padding:'16px 14px',display:'flex',flexDirection:'column',gap:8,paddingBottom:90,minHeight:'70vh'}}>`,
  `<div style={{flex:1,padding:'16px 14px',display:'flex',flexDirection:'column',gap:8,paddingBottom:20,minHeight:'70vh'}}>`
);

// Fix 4: DM chat paddingBottom
code = code.replace(
  `<div style={{minHeight:'60vh',padding:'16px 14px',display:'flex',flexDirection:'column',gap:8,paddingBottom:90}}>`,
  `<div style={{minHeight:'60vh',padding:'16px 14px',display:'flex',flexDirection:'column',gap:8,paddingBottom:20}}>`
);

// Fix 5: Group message input - change bottom:80 to bottom:0
code = code.replace(
  `<div style={{position:'sticky',bottom:80,background:'#090B10',padding:'10px 14px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,alignItems:'center'}}>
        <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Message group..."`,
  `<div style={{position:'sticky',bottom:0,background:'#090B10',padding:'10px 14px 24px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,alignItems:'center'}}>
        <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Message group..."`
);

// Fix 6: DM message input - change bottom:80 to bottom:0
code = code.replace(
  `<div style={{position:'sticky',bottom:80,background:'#090B10',padding:'10px 14px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,alignItems:'center'}}>
              <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Message..."`,
  `<div style={{position:'sticky',bottom:0,background:'#090B10',padding:'10px 14px 24px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,alignItems:'center'}}>
              <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Message..."`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
