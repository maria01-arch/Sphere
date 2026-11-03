'use client'
import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = {error:null} }
  static getDerivedStateFromError(e) { return {error:e} }
  render() {
    if(this.state.error) return (
      <div style={{minHeight:'100dvh',background:'var(--bg-app)',color:'var(--text-primary)',padding:20,fontFamily:'sans-serif'}}>
        <h2 style={{color:'var(--danger)'}}>App Error</h2>
        <p style={{color:'var(--text-subtle)',fontSize:14,wordBreak:'break-word'}}>{this.state.error?.message}</p>
        <pre style={{color:'var(--text-muted)',fontSize:11,overflow:'auto'}}>{this.state.error?.stack?.slice(0,500)}</pre>
        <button onClick={()=>window.location.reload()} style={{marginTop:16,background:'var(--primary)',border:'none',borderRadius:12,padding:'12px 24px',color:'#fff',cursor:'pointer'}}>Reload</button>
      </div>
    )
    return this.props.children
  }
}
