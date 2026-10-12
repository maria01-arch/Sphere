const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

code = code.replace(
  `          <span style={{color:'#ccc',fontSize:11}}>My Pulse</span>
        </div>
        {pulses.map(p=>(`,
  `          <span style={{color:'#ccc',fontSize:11}}>My Pulse</span>
        </div>}
        {pulses.map(p=>(`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
