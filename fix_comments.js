const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

const oldReply = `  const submitReply = async () => {
    if (!replyText.trim()) return
    const {error} = await supabase.from('comments').insert({post_id:post.id,user_id:currentUser.id,content:replyText.trim()})
    if (!error) { setComments(c=>c+1); setReplyText(''); setShowReply(false) }
  }`;

const newReply = `  const submitReply = async () => {
    if (!replyText.trim()) return
    const {error} = await supabase.from('comments').insert({post_id:post.id,user_id:currentUser.id,content:replyText.trim()})
    if (!error) {
      setComments(c=>c+1)
      setReplyText('')
      setShowReply(false)
      if (post.user_id !== currentUser.id) await supabase.from('notifications').insert({user_id:post.user_id,actor_id:currentUser.id,type:'comment',post_id:post.id})
    }
  }`;

if (code.includes(oldReply)) { code = code.replace(oldReply, newReply); console.log('Comment notif added'); }
else console.log('Block not found');

fs.writeFileSync('src/components/SphereApp.js', code);
