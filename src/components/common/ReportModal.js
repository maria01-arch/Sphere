'use client'
import { useState } from 'react'
import { Check, CheckCircle2 } from 'lucide-react'
import { REPORT_REASONS } from '@/lib/constants'

export function ReportModal({ onClose, onSubmit }) {
  const [reason, setReason] = useState(null)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if(done) return (
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-app)',borderRadius:18,padding:24,maxWidth:340,width:'100%',textAlign:'center'}}>
        <CheckCircle2 size={40} color="var(--repost)" style={{marginBottom:10}}/>
        <p style={{color:'var(--text-primary)',fontWeight:700,fontSize:16,marginBottom:6}}>Report submitted</p>
        <p style={{color:'var(--text-secondary)',fontSize:13,marginBottom:18}}>Thanks — our team will review this.</p>
        <button onClick={onClose} style={{width:'100%',background:'var(--bg-card)',border:'none',borderRadius:14,padding:12,color:'var(--text-primary)',fontWeight:700,cursor:'pointer'}}>Close</button>
      </div>
    </div>
  )

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-app)',borderRadius:'20px 20px 0 0',padding:'20px 16px calc(20px + env(safe-area-inset-bottom))',maxWidth:500,width:'100%',maxHeight:'80vh',overflowY:'auto',boxSizing:'border-box'}}>
        <p style={{color:'var(--text-primary)',fontWeight:800,fontSize:17,marginBottom:4}}>Report</p>
        <p style={{color:'var(--text-quaternary)',fontSize:13,marginBottom:16}}>Why are you reporting this?</p>
        {REPORT_REASONS.map(r=>(
          <button key={r.id} onClick={()=>setReason(r.id)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',background:reason===r.id?'rgba(var(--primary-rgb),0.12)':'var(--bg-card)',border:reason===r.id?'1px solid var(--primary)':'1px solid transparent',borderRadius:12,padding:'13px 14px',marginBottom:8,cursor:'pointer',textAlign:'left'}}>
            <span style={{color:r.urgent?'var(--danger)':'var(--text-primary)',fontWeight:r.urgent?700:500,fontSize:14}}>{r.label}</span>
            {reason===r.id&&<Check size={16} color="var(--primary)"/>}
          </button>
        ))}
        {reason&&<textarea value={details} onChange={e=>setDetails(e.target.value)} placeholder="Add any extra details (optional)" rows={3} style={{width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 14px',color:'var(--text-primary)',fontSize:14,outline:'none',resize:'none',fontFamily:'sans-serif',boxSizing:'border-box',marginTop:4,marginBottom:14}}/>}
        <button onClick={async()=>{
          if(!reason||submitting) return
          setSubmitting(true)
          try { await onSubmit(reason, details.trim()); setDone(true) }
          catch(err) { alert('Could not submit report: '+err.message) }
          setSubmitting(false)
        }} disabled={!reason||submitting} style={{width:'100%',background:reason?'var(--primary)':'var(--bg-card-3)',border:'none',borderRadius:14,padding:14,color:reason?'var(--text-primary)':'var(--text-quaternary)',fontWeight:700,fontSize:15,cursor:reason?'pointer':'default'}}>{submitting?'Submitting...':'Submit Report'}</button>
      </div>
    </div>
  )
}
