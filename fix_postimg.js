const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

code = code.replace(
  `          <p style={{color:'#ddd',fontSize:15,lineHeight:1.65,marginBottom:12,wordBreak:'break-word'}}>{post.content}</p>`,
  `          {post.content&&<p style={{color:'#ddd',fontSize:15,lineHeight:1.65,marginBottom:12,wordBreak:'break-word'}}>{post.content}</p>}
          {post.image_url&&<img src={post.image_url} style={{width:'100%',borderRadius:12,marginBottom:12,maxHeight:400,objectFit:'cover'}} alt="post"/>}`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
