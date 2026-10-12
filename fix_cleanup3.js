const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Remove test button from header
const btnStart = code.indexOf(`<button onClick={async()=>{
    if(typeof Notification === 'undefined')`);
const btnEnd = code.indexOf(`}}>🔔 Test</button>`) + `}}>🔔 Test</button>`.length;
if(btnStart !== -1 && btnEnd !== -1) {
  code = code.slice(0, btnStart) + code.slice(btnEnd);
  console.log('Test button removed');
}

// Remove testPush function
const fnStart = code.indexOf(`\n  const testPush = async() => {`);
const fnEnd = code.indexOf(`\n  const TABS=`);
if(fnStart !== -1 && fnEnd !== -1) {
  code = code.slice(0, fnStart) + code.slice(fnEnd);
  console.log('testPush function removed');
}

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
