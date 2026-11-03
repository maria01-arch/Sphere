'use client'
import { useEffect, useRef, useState } from 'react'
import { Image as ImageIcon, Loader2, Lock, MessageCircle, ShoppingBag, X } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { getColor } from '@/lib/colors'
import { STORE_CATEGORIES } from '@/lib/constants'
import { uploadToR2 } from '@/lib/media/upload'

// Mini Store — everyone can browse and message a seller; only is_authentic
// (verified) accounts can list something (enforced both here, by hiding the
// "Sell" action, and at the database level via RLS, since hiding a button
// is never real access control on its own).
// Simple dot-indicator carousel for a listing's photos — only rendered with
// controls when there's more than one image; a single image just shows
// directly with no carousel chrome.
export function ListingCarousel({ images }) {
  const [idx, setIdx] = useState(0)
  if(!images.length) return null
  if(images.length===1) return <img src={images[0]} style={{width:'100%',maxHeight:280,objectFit:'cover',display:'block'}} alt=""/>
  return (
    <div style={{position:'relative'}}>
      <div style={{display:'flex',overflowX:'auto',scrollSnapType:'x mandatory',WebkitOverflowScrolling:'touch'}}
        onScroll={e=>{ const w=e.target.clientWidth; if(w) setIdx(Math.round(e.target.scrollLeft/w)) }}>
        {images.map((url,i)=>(
          <img key={i} src={url} style={{width:'100%',flexShrink:0,scrollSnapAlign:'start',maxHeight:280,objectFit:'cover',display:'block'}} alt=""/>
        ))}
      </div>
      <div style={{position:'absolute',bottom:10,left:0,right:0,display:'flex',justifyContent:'center',gap:5}}>
        {images.map((_,i)=><span key={i} style={{width:6,height:6,borderRadius:'50%',background:i===idx?'#fff':'rgba(255,255,255,0.4)'}}/>)}
      </div>
    </div>
  )
}

export function StoreSection({ currentUser, supabase, onUserClick, onMessageUser }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('browse') // 'browse' | 'create' | 'mine' | 'detail'
  const [selected, setSelected] = useState(null)
  const [myListings, setMyListings] = useState([])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [formCategory, setFormCategory] = useState(STORE_CATEGORIES[0])
  const [ctaText, setCtaText] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [imageFiles, setImageFiles] = useState([]) // up to 3
  const [imagePreviews, setImagePreviews] = useState([])
  const [saving, setSaving] = useState(false)
  const [activeCount, setActiveCount] = useState(0)
  const fileRef = useRef(null)
  const MAX_IMAGES = 3
  const MAX_ACTIVE_LISTINGS = 5

  useEffect(()=>{ loadListings() },[])
  // Deliberately no blanket cleanup-on-every-change effect here — since new
  // previews are appended to the existing array rather than replacing it,
  // that would revoke blob URLs still being displayed. Revocation happens
  // explicitly in removeImage/resetForm instead.

  const loadListings = async () => {
    setLoading(true)
    const {data} = await supabase.from('store_listings').select('*,seller:profiles!seller_id(id,display_name,username,avatar_url,avatar_color,is_authentic,verified)').order('created_at',{ascending:false})
    setListings(data||[])
    setLoading(false)
    if(data) setActiveCount(data.filter(l=>l.seller_id===currentUser.id && l.status==='active').length)
  }

  const loadMyListings = async () => {
    const {data} = await supabase.from('store_listings').select('*').eq('seller_id',currentUser.id).order('created_at',{ascending:false})
    setMyListings(data||[])
  }

  const pickImages = (files) => {
    const room = MAX_IMAGES - imageFiles.length
    if(room<=0) return
    const picked = Array.from(files).slice(0,room)
    setImageFiles(prev=>[...prev,...picked])
    setImagePreviews(prev=>[...prev,...picked.map(f=>URL.createObjectURL(f))])
  }

  const removeImage = (idx) => {
    URL.revokeObjectURL(imagePreviews[idx])
    setImageFiles(prev=>prev.filter((_,i)=>i!==idx))
    setImagePreviews(prev=>prev.filter((_,i)=>i!==idx))
  }

  const resetForm = () => {
    setTitle('');setDescription('');setPrice('');setFormCategory(STORE_CATEGORIES[0]);setCtaText('');setCtaUrl('')
    imagePreviews.forEach(u=>URL.revokeObjectURL(u))
    setImageFiles([]);setImagePreviews([])
  }

  // A link typed without a scheme ("wa.me/234...", "myshop.com") would
  // otherwise render as a broken relative link inside the app instead of
  // opening the intended external site.
  const normalizeUrl = (url) => {
    const trimmed = url.trim()
    if(!trimmed) return null
    return /^https?:\/\//i.test(trimmed) ? trimmed : 'https://'+trimmed
  }

  const openCreateForm = () => {
    if(activeCount >= MAX_ACTIVE_LISTINGS) { alert(`You can have at most ${MAX_ACTIVE_LISTINGS} active listings at a time — mark one as sold, out of stock, or delete it before adding another.`); return }
    setView('create')
  }

  const createListing = async () => {
    if(!title.trim()) { alert('Title required'); return }
    if(activeCount >= MAX_ACTIVE_LISTINGS) { alert(`You can have at most ${MAX_ACTIVE_LISTINGS} active listings at a time.`); return }
    if((ctaText.trim() && !ctaUrl.trim()) || (!ctaText.trim() && ctaUrl.trim())) { alert('Fill in both the button text and its link, or leave both empty'); return }
    setSaving(true)
    const imageUrls = []
    try {
      for(const file of imageFiles) {
        const ext = (file.name.split('.').pop()||'jpg').toLowerCase()
        const path = 'store/'+currentUser.id+'_'+Date.now()+'_'+imageUrls.length+'.'+ext
        const urlData = await uploadToR2(file, path)
        imageUrls.push(urlData.publicUrl)
      }
    } catch(err) { alert('Image upload failed: '+err.message); setSaving(false); return }
    const {data,error} = await supabase.from('store_listings').insert({
      seller_id: currentUser.id, title: title.trim(), description: description.trim()||null,
      price: price.trim()||null, category: formCategory, image_urls: imageUrls,
      cta_text: ctaText.trim()||null, cta_url: normalizeUrl(ctaUrl),
    }).select('*,seller:profiles!seller_id(id,display_name,username,avatar_url,avatar_color,is_authentic,verified)').single()
    if(data) {
      setListings(prev=>[data,...prev])
      setActiveCount(c=>c+1)
      resetForm()
      setView('browse')
    } else alert('Error: '+(error?.message||'could not create listing — make sure you\'re verified (is_authentic).'))
    setSaving(false)
  }

  const updateStatus = async (listing, status) => {
    if(status==='active' && listing.status!=='active' && activeCount >= MAX_ACTIVE_LISTINGS) {
      alert(`You can have at most ${MAX_ACTIVE_LISTINGS} active listings at a time — mark another one as sold or out of stock first.`)
      return
    }
    const {error} = await supabase.from('store_listings').update({status, updated_at:new Date().toISOString()}).eq('id',listing.id)
    if(error) { alert(error.message); return }
    setMyListings(prev=>prev.map(l=>l.id===listing.id?{...l,status}:l))
    setListings(prev=>prev.map(l=>l.id===listing.id?{...l,status}:l))
    if(status==='active' && listing.status!=='active') setActiveCount(c=>c+1)
    else if(status!=='active' && listing.status==='active') setActiveCount(c=>Math.max(0,c-1))
  }

  const deleteListing = async (listing) => {
    if(!window.confirm('Delete this listing permanently?')) return
    await supabase.from('store_listings').delete().eq('id',listing.id)
    setMyListings(prev=>prev.filter(l=>l.id!==listing.id))
    setListings(prev=>prev.filter(l=>l.id!==listing.id))
    if(listing.status==='active') setActiveCount(c=>Math.max(0,c-1))
  }

  const filtered = listings.filter(l=>
    (category==='All'||l.category===category) &&
    (!search.trim() || l.title.toLowerCase().includes(search.trim().toLowerCase()) || (l.description||'').toLowerCase().includes(search.trim().toLowerCase()))
  )

  if(view==='create') return (
    <div style={{minHeight:'60vh'}}>
      <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border-color)',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>{setView('browse');resetForm()}} style={{background:'none',border:'none',color:'var(--text-tertiary)',cursor:'pointer',fontSize:24}}>‹</button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>List a Product</span>
        <button onClick={createListing} disabled={saving||!title.trim()} style={{background:title.trim()?'var(--primary)':'var(--bg-card-3)',border:'none',borderRadius:20,padding:'8px 18px',color:title.trim()?'var(--text-primary)':'var(--text-quaternary)',fontWeight:700,cursor:title.trim()?'pointer':'default'}}>{saving?'Posting...':'Post'}</button>
      </div>
      <div style={{padding:16,display:'flex',flexDirection:'column',gap:12}}>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={e=>{pickImages(e.target.files);e.target.value=''}} style={{display:'none'}}/>
        <div style={{display:'flex',gap:8}}>
          {imagePreviews.map((url,i)=>(
            <div key={i} style={{position:'relative',width:'calc((100% - 16px)/3)',aspectRatio:'1',borderRadius:12,overflow:'hidden',background:'#000',flexShrink:0}}>
              <img src={url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
              <button onClick={()=>removeImage(i)} style={{position:'absolute',top:4,right:4,width:20,height:20,borderRadius:'50%',background:'rgba(0,0,0,0.6)',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}><X size={12}/></button>
            </div>
          ))}
          {imageFiles.length<MAX_IMAGES&&(
            <div onClick={()=>fileRef.current?.click()} style={{width:imagePreviews.length?'calc((100% - 16px)/3)':'100%',aspectRatio:imagePreviews.length?'1':undefined,height:imagePreviews.length?undefined:160,borderRadius:12,border:'1.5px dashed var(--border-color-2)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,cursor:'pointer',color:'var(--text-tertiary)',flexShrink:0}}>
              <ImageIcon size={imagePreviews.length?20:28}/>
              <span style={{fontSize:imagePreviews.length?10:13}}>{imagePreviews.length?'Add':'Add photos'}</span>
            </div>
          )}
        </div>
        <p style={{color:'var(--text-quaternary)',fontSize:11,margin:'-6px 0 0'}}>Up to {MAX_IMAGES} photos</p>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Product or service name" style={{background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:15,outline:'none'}}/>
        <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description (optional)" rows={3} style={{background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:14,outline:'none',resize:'none',fontFamily:'sans-serif'}}/>
        <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="Price — e.g. $25, ₦15,000, Contact for price" style={{background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:14,outline:'none'}}/>
        <div>
          <p style={{color:'var(--text-tertiary)',fontSize:13,marginBottom:8}}>Category</p>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {STORE_CATEGORIES.map(c=>(
              <button key={c} onClick={()=>setFormCategory(c)} style={{padding:'6px 14px',borderRadius:14,border:'none',background:formCategory===c?'rgba(var(--primary-rgb),0.2)':'var(--bg-card)',color:formCategory===c?'var(--primary)':'var(--text-secondary)',fontSize:13,fontWeight:600,cursor:'pointer'}}>{c}</button>
            ))}
          </div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <input value={ctaText} onChange={e=>setCtaText(e.target.value)} placeholder="Button text (optional) — e.g. Order Now" style={{flex:1,background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:14,outline:'none',minWidth:0}}/>
          <input value={ctaUrl} onChange={e=>setCtaUrl(e.target.value)} placeholder="Button link (optional)" style={{flex:1,background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:12,padding:'12px 16px',color:'var(--text-primary)',fontSize:14,outline:'none',minWidth:0}}/>
        </div>
        <p style={{color:'var(--text-quaternary)',fontSize:12,margin:0}}>Buyers can always message you directly too — this button is for an extra action like a payment link, WhatsApp order line, or website.</p>
      </div>
    </div>
  )

  if(view==='mine') return (
    <div style={{minHeight:'60vh'}}>
      <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border-color)',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setView('browse')} style={{background:'none',border:'none',color:'var(--text-tertiary)',cursor:'pointer',fontSize:24}}>‹</button>
        <span style={{fontWeight:700,fontSize:17,flex:1}}>My Listings</span>
      </div>
      {myListings.length===0&&<div style={{padding:'50px 20px',textAlign:'center'}}><ShoppingBag size={40} color="var(--text-quaternary)"/><p style={{color:'var(--text-secondary)',marginTop:10}}>You haven't listed anything yet</p></div>}
      {myListings.map(l=>(
        <div key={l.id} style={{padding:'14px 16px',borderBottom:'1px solid var(--border-color)',display:'flex',gap:12}}>
          <div style={{width:56,height:56,borderRadius:10,background:'var(--bg-card)',overflow:'hidden',flexShrink:0}}>
            {(l.image_urls?.[0]||l.image_url)&&<img src={l.image_urls?.[0]||l.image_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" loading="lazy"/>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2,flexWrap:'wrap'}}>
              <span style={{fontWeight:700,fontSize:14,color:'var(--text-primary)'}}>{l.title}</span>
              {l.status==='sold'&&<span style={{fontSize:10,fontWeight:700,color:'var(--repost)',background:'rgba(var(--repost-rgb),0.12)',borderRadius:6,padding:'1px 6px'}}>SOLD</span>}
              {l.status==='out_of_stock'&&<span style={{fontSize:10,fontWeight:700,color:'#F7B731',background:'rgba(247,183,49,0.12)',borderRadius:6,padding:'1px 6px'}}>OUT OF STOCK</span>}
            </div>
            {l.price&&<p style={{color:'var(--text-secondary)',fontSize:13,margin:'0 0 8px'}}>{l.price}</p>}
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {l.status!=='sold'&&<button onClick={()=>updateStatus(l,'sold')} style={{background:'rgba(var(--repost-rgb),0.1)',border:'none',borderRadius:10,padding:'5px 10px',color:'var(--repost)',fontSize:11,fontWeight:700,cursor:'pointer'}}>Mark Sold</button>}
              {l.status!=='out_of_stock'&&<button onClick={()=>updateStatus(l,'out_of_stock')} style={{background:'rgba(247,183,49,0.1)',border:'none',borderRadius:10,padding:'5px 10px',color:'#F7B731',fontSize:11,fontWeight:700,cursor:'pointer'}}>Out of Stock</button>}
              {l.status!=='active'&&<button onClick={()=>updateStatus(l,'active')} style={{background:'rgba(var(--primary-rgb),0.1)',border:'none',borderRadius:10,padding:'5px 10px',color:'var(--primary)',fontSize:11,fontWeight:700,cursor:'pointer'}}>Relist</button>}
              <button onClick={()=>deleteListing(l)} style={{background:'rgba(var(--danger-rgb),0.1)',border:'none',borderRadius:10,padding:'5px 10px',color:'var(--danger)',fontSize:11,fontWeight:700,cursor:'pointer'}}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  if(view==='detail'&&selected) {
    const l = selected
    const images = (l.image_urls?.length ? l.image_urls : (l.image_url ? [l.image_url] : []))
    const isOwn = l.seller_id === currentUser.id
    return (
      <div style={{minHeight:'60vh'}}>
        <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border-color)',display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>setView('browse')} style={{background:'none',border:'none',color:'var(--text-tertiary)',cursor:'pointer',fontSize:24}}>‹</button>
          <span style={{fontWeight:700,fontSize:17,flex:1}}>Listing</span>
        </div>
        {images.length>0&&<div style={{position:'relative'}}>
          <ListingCarousel key={l.id} images={images}/>
          {l.status!=='active'&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}><span style={{color:'#fff',fontWeight:800,fontSize:20,letterSpacing:1,border:'2px solid #fff',padding:'6px 20px',borderRadius:10,transform:'rotate(-8deg)'}}>{l.status==='sold'?'SOLD':'OUT OF STOCK'}</span></div>}
        </div>}
        <div style={{padding:16}}>
          <h2 style={{color:'var(--text-primary)',fontSize:19,fontWeight:800,margin:'0 0 4px'}}>{l.title}</h2>
          {l.price&&<p style={{color:'var(--primary)',fontSize:17,fontWeight:700,margin:'0 0 10px'}}>{l.price}</p>}
          {l.description&&<p style={{color:'var(--text-secondary)',fontSize:14,lineHeight:1.5,margin:'0 0 16px',wordBreak:'break-word'}}>{l.description}</p>}
          <div onClick={()=>onUserClick(l.seller)} style={{display:'flex',alignItems:'center',gap:10,padding:'12px',background:'var(--bg-card)',borderRadius:14,cursor:'pointer',marginBottom:16}}>
            <Avatar url={l.seller?.avatar_url} name={l.seller?.display_name} color={l.seller?.avatar_color||getColor(l.seller?.id)} size={40}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:14,color:'var(--text-primary)'}}>{l.seller?.display_name}</div>
              <div style={{color:'var(--text-quaternary)',fontSize:12}}>@{l.seller?.username}</div>
            </div>
            <span style={{color:'var(--text-quaternary)',fontSize:20}}>›</span>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>!isOwn&&onMessageUser(l.seller)} disabled={isOwn} title={isOwn?"This is your own listing":undefined} style={{flex:1,background:'var(--bg-card-3)',border:'none',borderRadius:14,padding:'13px',color:isOwn?'var(--text-quaternary)':'var(--text-primary)',fontWeight:700,fontSize:14,cursor:isOwn?'default':'pointer',opacity:isOwn?0.5:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><MessageCircle size={16}/> Message</button>
            {l.cta_text&&l.cta_url&&l.status==='active'&&<a href={l.cta_url} target="_blank" rel="noopener noreferrer" style={{flex:1,background:'var(--primary)',border:'none',borderRadius:14,padding:'13px',color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer',textDecoration:'none',textAlign:'center'}}>{l.cta_text}</a>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{padding:'4px 16px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontWeight:800,fontSize:18,display:'inline-flex',alignItems:'center',gap:6}}><ShoppingBag size={17}/> Store</span>
        <div style={{display:'flex',gap:8}}>
          {currentUser.is_authentic&&<button onClick={()=>{loadMyListings();setView('mine')}} style={{background:'var(--bg-card)',border:'none',borderRadius:12,padding:'6px 12px',color:'var(--text-secondary)',cursor:'pointer',fontWeight:700,fontSize:12}}>My Listings</button>}
          {currentUser.is_authentic ? (
            <button onClick={openCreateForm} style={{background:'rgba(var(--primary-rgb),0.1)',border:'1px solid rgba(var(--primary-rgb),0.2)',borderRadius:12,padding:'6px 14px',color:'var(--primary)',cursor:'pointer',fontWeight:700,fontSize:13}}>+ Sell {activeCount>0&&`(${activeCount}/${MAX_ACTIVE_LISTINGS})`}</button>
          ) : (
            <span title="Verified accounts only" style={{background:'var(--bg-card)',border:'none',borderRadius:12,padding:'6px 12px',color:'var(--text-quaternary)',fontWeight:600,fontSize:12,display:'inline-flex',alignItems:'center',gap:5}}><Lock size={12}/> Sell</span>
          )}
        </div>
      </div>
      <div style={{padding:'0 16px 10px'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search the store..." style={{width:'100%',background:'var(--bg-card)',border:'1px solid var(--border-color-2)',borderRadius:24,padding:'10px 16px',color:'var(--text-primary)',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
      </div>
      <div style={{display:'flex',gap:8,padding:'0 16px 14px',overflowX:'auto',scrollbarWidth:'none'}}>
        {['All',...STORE_CATEGORIES].map(c=>(
          <button key={c} onClick={()=>setCategory(c)} style={{flexShrink:0,padding:'6px 14px',borderRadius:14,border:'none',background:category===c?'rgba(var(--primary-rgb),0.2)':'var(--bg-card)',color:category===c?'var(--primary)':'var(--text-secondary)',fontSize:13,fontWeight:600,cursor:'pointer'}}>{c}</button>
        ))}
      </div>
      {loading&&<div style={{padding:'40px',textAlign:'center'}}><Loader2 size={28} className="xspin" color="var(--text-quaternary)"/></div>}
      {!loading&&filtered.length===0&&<div style={{padding:'50px 20px',textAlign:'center'}}><ShoppingBag size={40} color="var(--text-quaternary)"/><p style={{color:'var(--text-secondary)',marginTop:10}}>{search.trim()||category!=='All'?'No matching listings':'No listings yet'}{currentUser.is_authentic&&!search.trim()&&category==='All'?' — be the first to sell something!':''}</p></div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,padding:'0 16px 20px'}}>
        {filtered.map(l=>{
          const thumb = l.image_urls?.[0] || l.image_url
          return (
          <div key={l.id} onClick={()=>{setSelected(l);setView('detail')}} style={{borderRadius:14,overflow:'hidden',background:'var(--bg-card)',cursor:'pointer',position:'relative'}}>
            <div style={{aspectRatio:'1',background:'var(--bg-card-2)',position:'relative'}}>
              {thumb?<img src={thumb} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} alt="" loading="lazy"/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}><ShoppingBag size={28} color="var(--text-quaternary)"/></div>}
              {l.status!=='active'&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#fff',fontWeight:800,fontSize:11,letterSpacing:0.5,border:'1.5px solid #fff',padding:'3px 10px',borderRadius:6}}>{l.status==='sold'?'SOLD':'OUT OF STOCK'}</span></div>}
            </div>
            <div style={{padding:'8px 10px'}}>
              <p style={{color:'var(--text-primary)',fontSize:13,fontWeight:700,margin:'0 0 2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.title}</p>
              {l.price&&<p style={{color:'var(--primary)',fontSize:13,fontWeight:700,margin:0}}>{l.price}</p>}
              <div style={{display:'flex',alignItems:'center',gap:4,marginTop:4}}>
                <Avatar url={l.seller?.avatar_url} name={l.seller?.display_name} color={l.seller?.avatar_color||getColor(l.seller?.id)} size={14}/>
                <span style={{color:'var(--text-quaternary)',fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.seller?.display_name}</span>
              </div>
            </div>
          </div>
        )})}
      </div>
    </div>
  )
}
