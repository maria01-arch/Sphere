const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

code = code.replace(
  `    await supabase.from('groups').update({avatar_url:url}).eq('id',group.id)
    setGroupAvatar(url)`,
  `    const {error:dbErr} = await supabase.from('groups').update({avatar_url:url}).eq('id',group.id)
    if(dbErr){alert('DB update failed: '+dbErr.message);return}
    setGroupAvatar(url)
    alert('Group photo updated!')`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
