const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

const oldLike = `      const {error} = await supabase.from('likes').insert({post_id:post.id,user_id:currentUser.id})
      if (error) { setLiked(!next); setLikes(l=>next?l-1:l+1) }`;
const newLike = `      const {error} = await supabase.from('likes').insert({post_id:post.id,user_id:currentUser.id})
      if (error) { setLiked(!next); setLikes(l=>next?l-1:l+1) }
      else if (post.user_id !== currentUser.id) await supabase.from('notifications').insert({user_id:post.user_id,actor_id:currentUser.id,type:'like',post_id:post.id})`;

const oldRepost = `      const {error} = await supabase.from('reposts').insert({post_id:post.id,user_id:currentUser.id})
      if (error) { setReposted(!next); setReposts(r=>next?r-1:r+1) }`;
const newRepost = `      const {error} = await supabase.from('reposts').insert({post_id:post.id,user_id:currentUser.id})
      if (error) { setReposted(!next); setReposts(r=>next?r-1:r+1) }
      else if (post.user_id !== currentUser.id) await supabase.from('notifications').insert({user_id:post.user_id,actor_id:currentUser.id,type:'repost',post_id:post.id})`;

if (code.includes(oldLike)) { code = code.replace(oldLike, newLike); console.log('Like notif added'); }
else console.log('Like block not found');
if (code.includes(oldRepost)) { code = code.replace(oldRepost, newRepost); console.log('Repost notif added'); }
else console.log('Repost block not found');

fs.writeFileSync('src/components/SphereApp.js', code);
