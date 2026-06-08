const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Create supabase once at module level, not inside component
code = code.replace(
  `import { createClient } from '@/lib/supabase/client'`,
  `import { createClient } from '@/lib/supabase/client'\nconst supabase = createClient()`
);

// Remove the supabase creation inside SphereApp
code = code.replace(
  `\n  const supabase = createClient()`,
  ``
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
