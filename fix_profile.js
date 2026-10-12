const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add missing useState for showBigAvatar in UserProfileView
code = code.replace(
  `  const [isFollowing, setIsFollowing] = useState(false)`,
  `  const [isFollowing, setIsFollowing] = useState(false)
  const [showBigAvatar, setShowBigAvatar] = useState(false)`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
