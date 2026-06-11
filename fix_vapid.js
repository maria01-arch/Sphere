const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

code = code.replace(
  `applicationServerKey: '${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}'`,
  `applicationServerKey: 'BPiikDJR1kYnVVizNObctiIofznuYwl0P6tGmViKwqy11Lzq5JJmMQ-tAwc12yx6tHWYrRrVOmNCUhguqjyP5Cs'`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
