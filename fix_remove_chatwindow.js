const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Find and remove the entire ChatWindow function
const start = code.indexOf('\nfunction ChatWindow(');
const end = code.indexOf('\nfunction NotificationsPanel(');

if(start !== -1 && end !== -1) {
  code = code.slice(0, start) + code.slice(end);
  console.log('ChatWindow removed successfully');
} else {
  console.log('Could not find boundaries - start:'+start+' end:'+end);
}

fs.writeFileSync('src/components/SphereApp.js', code);
