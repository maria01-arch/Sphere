import { FLITTERS_MARK } from '@/lib/flitters-mark'
export const metadata = { title: 'Delete Your Account — Flitters', description: 'How to request deletion of your Flitters account and data.' }

export default function DeleteAccount() {
  const s = {
    page: { minHeight:'100dvh', background:'#090B10', color:'#fff', fontFamily:'sans-serif', padding:'0 0 80px' },
    header: { padding:'24px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:12 },
    logoText: { fontWeight:900, fontSize:20, background:'linear-gradient(135deg,#A855F7,#06B6D4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'-0.5px' },
    body: { maxWidth:680, margin:'0 auto', padding:'32px 20px' },
    h1: { fontSize:28, fontWeight:800, marginBottom:8 },
    updated: { color:'#555', fontSize:13, marginBottom:36 },
    h2: { fontSize:18, fontWeight:700, marginTop:32, marginBottom:12, color:'#A855F7' },
    p: { color:'#aaa', fontSize:15, lineHeight:1.8, marginBottom:12 },
    ol: { color:'#aaa', fontSize:15, lineHeight:1.9, paddingLeft:22, marginBottom:12 },
    ul: { color:'#aaa', fontSize:15, lineHeight:1.8, paddingLeft:20, marginBottom:12 },
    a: { color:'#A855F7', textDecoration:'none' },
    step: { display:'flex', gap:14, alignItems:'flex-start', marginBottom:18 },
    stepNum: { flexShrink:0, width:28, height:28, borderRadius:'50%', background:'rgba(168,85,247,0.15)', border:'1px solid rgba(168,85,247,0.3)', color:'#A855F7', fontWeight:800, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' },
  }
  return (
    <div style={s.page}>
      <div style={s.header}>
        <img src={FLITTERS_MARK} alt="Flitters" width={36} height={36} style={{objectFit:'contain'}}/>
        <span style={s.logoText}>Flitters</span>
      </div>
      <div style={s.body}>
        <h1 style={s.h1}>Delete Your Account</h1>
        <p style={s.updated}>Flitters, developed by Xchordlabs — last updated September 26, 2026</p>

        <h2 style={s.h2}>How to request deletion</h2>
        <div style={s.step}><div style={s.stepNum}>1</div><p style={{...s.p,marginBottom:0}}>Open the Flitters app and sign in to the account you want to delete.</p></div>
        <div style={s.step}><div style={s.stepNum}>2</div><p style={{...s.p,marginBottom:0}}>Go to <strong>Settings</strong> (the gear icon on your Home tab).</p></div>
        <div style={s.step}><div style={s.stepNum}>3</div><p style={{...s.p,marginBottom:0}}>Scroll down and tap <strong>Delete Account</strong>.</p></div>
        <div style={s.step}><div style={s.stepNum}>4</div><p style={{...s.p,marginBottom:0}}>Type <strong>DELETE</strong> to confirm, then tap <strong>Delete</strong>. This takes effect immediately — there's no waiting period and no way to undo it.</p></div>

        <p style={s.p}>If you no longer have access to the app (lost your device, uninstalled it, etc.), email <a href="mailto:support@xchord.space" style={s.a}>support@xchord.space</a> from the address associated with your account and ask us to delete it — we'll process it manually and confirm once it's done.</p>

        <h2 style={s.h2}>What gets deleted</h2>
        <p style={s.p}>Deleting your account permanently removes:</p>
        <ul style={s.ul}>
          <li>Your profile (name, username, bio, avatar)</li>
          <li>Every post, comment, like, repost, and reel you created</li>
          <li>Your Store listings</li>
          <li>Direct messages and group messages you sent, and your membership in every group</li>
          <li>Your Pulses (status updates) and sticker packs</li>
          <li>Follows and blocks involving your account</li>
          <li>Notifications tied to your account</li>
          <li>Your push notification subscription</li>
          <li>Any pending verification application</li>
          <li>Your login credentials</li>
        </ul>

        <h2 style={s.h2}>What's retained, and why</h2>
        <ul style={s.ul}>
          <li><strong>Safety reports.</strong> If you reported someone or were reported by someone, that record is kept for moderation and legal purposes even after either account is deleted — this is standard practice for trust & safety and helps us respond to abuse patterns and legal requests.</li>
          <li><strong>Media in storage.</strong> Images, videos, and voice notes you shared are removed from the app immediately, but a copy may briefly persist in our backend storage systems before being fully purged. We don't use it for anything once your account is deleted.</li>
          <li><strong>Group content from others.</strong> If you were in a group with other people, messages *they* sent stay intact — deleting your account only removes what belongs to you. If you created a group, the group itself continues to exist for its remaining members, just without an owner.</li>
        </ul>
        <p style={s.p}>Outside of the above, we don't currently offer a way to delete only part of your data (e.g. just your messages) without deleting the whole account.</p>

        <h2 style={s.h2}>Questions</h2>
        <p style={s.p}>Email <a href="mailto:support@xchord.space" style={s.a}>support@xchord.space</a>. See also our <a href="/privacy" style={s.a}>Privacy Policy</a>.</p>
      </div>
    </div>
  )
}
