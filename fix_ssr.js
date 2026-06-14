const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Fix URL.createObjectURL - only works in browser
code = code.replace(
  `onChange={e=>{const f=e.target.files[0];if(f){setComposeImage(f);setComposeImageUrl(URL.createObjectURL(f))}}}`,
  `onChange={e=>{const f=e.target.files[0];if(f){setComposeImage(f);if(typeof window!=='undefined')setComposeImageUrl(URL.createObjectURL(f))}}}`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
