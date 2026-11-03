'use client'

// ── SKELETON LOADING PRIMITIVES ─────────────────────────────────────────────
// Used everywhere the app was showing a bare "Loading..." string or spinner.
// A shimmering block communicates "content is coming" without a jarring
// flash screen — reserved now for true first-launch only (see page.js).
export function SkeletonBlock({ w='100%', h=14, radius=6, style={} }) {
  return <div style={{width:w,height:h,borderRadius:radius,background:'var(--bg-card-3, rgba(255,255,255,0.08))',animation:'skeletonPulse 1.4s ease-in-out infinite',...style}}/>
}

export function PostSkeleton() {
  return (
    <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border-color)',display:'flex',gap:12}}>
      <SkeletonBlock w={44} h={44} radius={22}/>
      <div style={{flex:1,minWidth:0}}>
        <SkeletonBlock w={120} h={13} style={{marginBottom:8}}/>
        <SkeletonBlock w="90%" h={13} style={{marginBottom:6}}/>
        <SkeletonBlock w="60%" h={13} style={{marginBottom:12}}/>
        <div style={{display:'flex',gap:24}}>
          <SkeletonBlock w={40} h={12}/><SkeletonBlock w={40} h={12}/><SkeletonBlock w={40} h={12}/>
        </div>
      </div>
    </div>
  )
}

export function FeedSkeleton({ count=5 }) {
  return <div>{Array.from({length:count}).map((_,i)=><PostSkeleton key={i}/>)}</div>
}

export function RowSkeleton() {
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px'}}>
      <SkeletonBlock w={40} h={40} radius={20}/>
      <div style={{flex:1}}>
        <SkeletonBlock w="50%" h={12} style={{marginBottom:6}}/>
        <SkeletonBlock w="30%" h={11}/>
      </div>
    </div>
  )
}

export function RowSkeletonList({ count=6 }) {
  return <div>{Array.from({length:count}).map((_,i)=><RowSkeleton key={i}/>)}</div>
}

export function ChatSkeleton({ count=6 }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:10,padding:'8px 0'}}>
      {Array.from({length:count}).map((_,i)=>(
        <div key={i} style={{display:'flex',justifyContent:i%2?'flex-end':'flex-start'}}>
          <SkeletonBlock w={120+((i*37)%80)} h={34} radius={16}/>
        </div>
      ))}
    </div>
  )
}
