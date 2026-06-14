const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add color definition to SphereAppInner after avatarUrl state
code = code.replace(
  `  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url||'')`,
  `  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url||'')
  const color = currentUser?.avatar_color||'#5B9CF6'`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
