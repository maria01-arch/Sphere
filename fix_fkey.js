const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Replace all occurrences of the ambiguous join
code = code.replaceAll(
  `actor:profiles(id,display_name,username,avatar_color,avatar_url)`,
  `actor:profiles!actor_id(id,display_name,username,avatar_color,avatar_url)`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done - replacements made');
