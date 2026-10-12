const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Remove test button (already removed earlier, check if still there)
code = code.replace(
  `<button onClick={testPush} style={{background:'rgba(0,201,167,0.15)',border:'1px solid rgba(0,201,167,0.3)',borderRadius:16,padding:'5px 10px',cursor:'pointer',color:'#00C9A7',fontSize:12,fontWeight:700}}>🔔 Test</button>
          `,
  ``
);

// Fix sendPost - check if image upload is happening
code = code.replace(
  `  const sendPost = async() => {
    if(!composeText.trim()&&!composeImage) return
    let imageUrl = null
    if(composeImage) {
      const ext = composeImage.name.split('.').pop()
      const path = 'posts/'+currentUser.id+'_'+Date.now()+'.'+ext
      const {error} = await supabase.storage.from('avatars').upload(path,composeImage,{upsert:false})
      if(!error) { const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path); imageUrl = urlData.publicUrl }
    }
    const {data} = await supabase.from('posts').insert({user_id:currentUser.id,content:composeText.trim(),image_url:imageUrl}).select('*,author:profiles(*),likes(user_id),reposts(user_id),comments(id)').single()`,
  `  const sendPost = async() => {
    if(!composeText.trim()&&!composeImage) return
    let imageUrl = null
    if(composeImage) {
      const ext = composeImage.name.split('.').pop().toLowerCase()
      const path = 'posts/'+currentUser.id+'_'+Date.now()+'.'+ext
      const {data:upData, error} = await supabase.storage.from('avatars').upload(path, composeImage, {upsert:true, contentType:composeImage.type})
      if(error) { alert('Image upload failed: '+error.message); return }
      const {data:urlData} = supabase.storage.from('avatars').getPublicUrl(path)
      imageUrl = urlData.publicUrl
    }
    const {data} = await supabase.from('posts').insert({user_id:currentUser.id,content:composeText.trim(),image_url:imageUrl}).select('*,author:profiles(*),likes(user_id),reposts(user_id),comments(id)').single()`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
