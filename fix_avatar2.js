const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

code = code.replace(
  `  const uploadGroupAvatar = async (file) => {
    if(!file||!isCreator) return
    const ext = file.name.split('.').pop()
    const path = 'groups/'+group.id+'.'+ext
    const {error} = await supabase.storage.from('avatars').upload(path,file,{upsert:true})
    if(error){alert('Upload failed: '+error.message);return}
    const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
    const url = urlData.publicUrl
    const {error:dbErr} = await supabase.from('groups').update({avatar_url:url}).eq('id',group.id)
    if(dbErr){alert('DB update failed: '+dbErr.message);return}
    setGroupAvatar(url)
    alert('Group photo updated!')
  }`,
  `  const uploadGroupAvatar = async (file) => {
    if(!file) return
    const ext = file.name.split('.').pop()
    const path = 'groups/'+group.id+'.'+ext
    const {error} = await supabase.storage.from('avatars').upload(path,file,{upsert:true})
    if(error){alert('Upload failed: '+error.message);return}
    const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
    const url = urlData.publicUrl+'?t='+Date.now()
    const {data:updated,error:dbErr} = await supabase.from('groups').update({avatar_url:urlData.publicUrl}).eq('id',group.id).select().single()
    if(dbErr){alert('DB error: '+dbErr.message+' groupid:'+group.id);return}
    if(!updated){alert('No rows updated - group id mismatch?');return}
    group.avatar_url = urlData.publicUrl
    setGroupAvatar(url)
    alert('Done! url:'+url.slice(0,40))
  }`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
