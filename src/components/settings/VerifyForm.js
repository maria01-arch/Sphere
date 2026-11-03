'use client'
import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { uploadToR2 } from '@/lib/media/upload'

// ── SETTINGS ───────────────────────────────────────────────────────────────
export function VerifyForm({ currentUser, supabase, showMsg, saving, setSaving, inp }) {
  const [form, setForm] = useState({name:"",reason:"",idtype:"",txhash:"",paymethod:""})
  const [idFile, setIdFile] = useState(null)
  const [idPreview, setIdPreview] = useState('')
  const fileRef = useRef(null)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const pickFile = (file) => {
    if(!file) return
    setIdFile(file)
    setIdPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : '')
  }
  const submit = async() => {
    if(!form.name||!form.reason||!form.idtype||!form.txhash||!form.paymethod){showMsg("Please fill all fields",false);return}
    if(!idFile){showMsg("Please upload a photo of your ID document",false);return}
    setSaving(true)
    let idDocUrl = null
    const ext = idFile.name.split('.').pop()
    const path = 'verification-ids/'+currentUser.id+'_'+Date.now()+'.'+ext
    let urlData
    try { urlData = await uploadToR2(idFile, path) }
    catch(err) { showMsg("ID upload failed: "+err.message,false); setSaving(false); return }
    idDocUrl = urlData.publicUrl
    const {error} = await supabase.from("verification_applications").insert({user_id:currentUser.id,full_name:form.name,reason:form.reason,id_type:form.idtype,tx_hash:form.txhash,payment_method:form.paymethod,id_document_url:idDocUrl})
    if(error) showMsg(error.message,false)
    else showMsg("Application submitted! We will review within 48 hours.")
    setSaving(false)
  }
  return(<div>
    <label style={{color:"var(--text-tertiary)",fontSize:13,display:"block",marginBottom:6}}>Full Name</label>
    <input value={form.name} onChange={e=>set("name",e.target.value)} style={{...inp}} placeholder="Your legal name"/>
    <label style={{color:"var(--text-tertiary)",fontSize:13,display:"block",marginBottom:6}}>ID Type</label>
    <select value={form.idtype} onChange={e=>set("idtype",e.target.value)} style={{...inp,background:"rgba(255,255,255,0.07)"}}>
      <option value="">Select ID type</option>
      <option>National ID</option><option>Passport</option><option>Driver License</option>
    </select>
    <label style={{color:"var(--text-tertiary)",fontSize:13,display:"block",marginBottom:6}}>ID Document Photo</label>
    <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={e=>pickFile(e.target.files?.[0])}/>
    <div onClick={()=>fileRef.current?.click()} style={{...inp,height:'auto',minHeight:56,display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'10px 14px'}}>
      {idPreview
        ? <img src={idPreview} alt="ID preview" style={{width:44,height:44,objectFit:'cover',borderRadius:8}}/>
        : <Upload size={20} color="var(--text-tertiary)"/>}
      <span style={{color:idFile?'var(--text-primary)':'var(--text-tertiary)',fontSize:13}}>{idFile?idFile.name:'Tap to upload a clear photo of your ID'}</span>
    </div>
    <p style={{color:'var(--text-quaternary)',fontSize:11,marginTop:-8,marginBottom:14}}>Used only to confirm your identity for verification. Not shown publicly.</p>
    <label style={{color:"var(--text-tertiary)",fontSize:13,display:"block",marginBottom:6}}>Why do you want verification?</label>
    <textarea value={form.reason} onChange={e=>set("reason",e.target.value)} rows={3} style={{...inp,resize:"none"}} placeholder="Describe yourself and why you deserve verification"/>
    <label style={{color:"var(--text-tertiary)",fontSize:13,display:"block",marginBottom:6}}>Transaction Hash (TX ID)</label>
    <input value={form.txhash} onChange={e=>set("txhash",e.target.value)} style={{...inp}} placeholder="Paste your payment transaction hash"/>
    <label style={{color:"var(--text-tertiary)",fontSize:13,display:"block",marginBottom:6}}>Payment Method Used</label>
    <select value={form.paymethod} onChange={e=>set("paymethod",e.target.value)} style={{...inp,background:"rgba(255,255,255,0.07)"}}>
      <option value="">Select payment method</option>
      <option>USDT TRC-20</option><option>Bitcoin BTC</option>
    </select>
    <button onClick={submit} disabled={saving} style={{width:"100%",background:"linear-gradient(135deg,#FFD700,#FFA500)",border:"none",borderRadius:12,padding:"14px",color:"#000",fontWeight:800,fontSize:15,cursor:"pointer",marginTop:8}}>{saving?"Submitting...":"Submit Application"}</button>
  </div>)
}
