'use client'
import { ArrowRight } from 'lucide-react'

export function AdCard({ ad }) {
  const openLink = () => {
    if(!ad.link_url) return
    const url = ad.link_url.startsWith('http')?ad.link_url:'https://'+ad.link_url
    window.open(url,'_blank')
  }
  return (
    <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border-color)'}}>
      <style>{'@keyframes adCtaPulse{0%,100%{box-shadow:0 0 0 0 rgba(var(--primary-rgb),0.5)}50%{box-shadow:0 0 0 8px rgba(var(--primary-rgb),0)}}'}</style>
      <div style={{display:'flex',gap:12}}>
        <div style={{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,#F7B731,#FF6B35)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:18,color:'#fff',flexShrink:0,overflow:'hidden'}}>{ad.advertiser_avatar_url?<img src={ad.advertiser_avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(ad.advertiser_name?.[0]||'A')}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',gap:6,alignItems:'flex-start',justifyContent:'space-between',marginBottom:6}}>
            <span style={{color:'var(--text-primary)',fontWeight:700,fontSize:15}}>{ad.advertiser_name}</span>
            <span style={{background:'rgba(247,183,49,0.15)',border:'1px solid rgba(247,183,49,0.3)',borderRadius:6,padding:'2px 7px',fontSize:10,color:'#F7B731',fontWeight:700,flexShrink:0,letterSpacing:0.3}}>SPONSORED</span>
          </div>
          {ad.content&&<p style={{color:'var(--text-primary)',fontSize:15,lineHeight:1.6,marginBottom:12}}>{ad.content}</p>}
          {ad.image_url&&<img onClick={openLink} src={ad.image_url} style={{width:'100%',borderRadius:12,maxHeight:300,objectFit:'cover',marginBottom:12,display:'block',cursor:ad.link_url?'pointer':'default'}} alt="ad" loading="lazy"/>}
          {ad.link_url&&<button onClick={openLink} style={{animation:'adCtaPulse 2s ease-in-out infinite',background:'var(--primary)',border:'none',borderRadius:24,padding:'10px 20px',display:'inline-flex',alignItems:'center',gap:6,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>{ad.cta_text||'Learn More'} <ArrowRight size={14}/></button>}
        </div>
      </div>
    </div>
  )
}
