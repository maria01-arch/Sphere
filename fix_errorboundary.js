const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add error boundary at the top after imports
code = code.replace(
  `const COLORS =`,
  `class ErrorBoundary extends (require('react').Component) {
  constructor(props) { super(props); this.state = {error:null} }
  static getDerivedStateFromError(e) { return {error:e} }
  render() {
    if(this.state.error) return (
      <div style={{minHeight:'100vh',background:'#090B10',color:'#fff',padding:20,fontFamily:'sans-serif'}}>
        <h2 style={{color:'#FF4757'}}>App Error</h2>
        <p style={{color:'#aaa',fontSize:14,wordBreak:'break-word'}}>{this.state.error?.message}</p>
        <pre style={{color:'#666',fontSize:11,overflow:'auto'}}>{this.state.error?.stack?.slice(0,500)}</pre>
        <button onClick={()=>window.location.reload()} style={{marginTop:16,background:'#5B9CF6',border:'none',borderRadius:12,padding:'12px 24px',color:'#fff',cursor:'pointer'}}>Reload</button>
      </div>
    )
    return this.props.children
  }
}

const COLORS =`
);

// Wrap SphereApp export with ErrorBoundary
code = code.replace(
  `export default function SphereApp({ currentUser }) {`,
  `function SphereAppInner({ currentUser }) {`
);

// Add wrapper at the end
code = code.replace(
  `}\n~/sphere`,
  `}

export default function SphereApp({ currentUser }) {
  return <ErrorBoundary><SphereAppInner currentUser={currentUser}/></ErrorBoundary>
}`
);

// Fix the last function closing
const lastBrace = code.lastIndexOf('\n}');
code = code.slice(0, lastBrace) + `

export default function SphereApp({ currentUser }) {
  return <ErrorBoundary><SphereAppInner currentUser={currentUser}/></ErrorBoundary>
}`;

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
