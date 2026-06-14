const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

code = code.replace(
  `    </div>
  )

export default function SphereApp({ currentUser }) {
  return <ErrorBoundary><SphereAppInner currentUser={currentUser}/></ErrorBoundary>
}`,
  `    </div>
  )
}

export default function SphereApp({ currentUser }) {
  return <ErrorBoundary><SphereAppInner currentUser={currentUser}/></ErrorBoundary>
}`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
