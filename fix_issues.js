const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Fix 1: Double messages - filter out temp messages when real ones arrive
// Find the DM realtime subscription and add dedup
code = code.replace(
  `if(data) setMessages(prev=>[...prev,data])
    }).subscribe()
    return()=>supabase.removeChannel(ch)
  },[selectedConv])`,
  `if(data) setMessages(prev=>[...prev.filter(m=>!m.id.toString().startsWith('tmp')),data])
    }).subscribe()
    return()=>supabase.removeChannel(ch)
  },[selectedConv])`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
