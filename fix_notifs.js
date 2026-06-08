const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Fix tabs - restore messages, move pulse to middle
code = code.replace(
  `const TABS=[{id:'home',label:'Home',icon:'🏠'},{id:'search',label:'Search',icon:'🔍'},{id:'pulse',label:'Pulse',icon:'⚡'},{id:'friends',label:'People',icon:'👥'},{id:'notifications',label:'Alerts',icon:'🔔'}]`,
  `const TABS=[{id:'home',label:'Home',icon:'🏠'},{id:'messages',label:'Messages',icon:'💬'},{id:'pulse',label:'Pulse',icon:'⚡'},{id:'friends',label:'People',icon:'👥'},{id:'notifications',label:'Alerts',icon:'🔔'}]`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Tabs fixed');
