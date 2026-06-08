const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

code = code.replace(`\n      <p style={{color:'#ff0',fontSize:11,padding:'4px 16px'}}>{debugMsg}</p>`, '');

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
