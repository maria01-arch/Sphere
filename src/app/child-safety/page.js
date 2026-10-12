import { FLITTERS_MARK } from '@/lib/flitters-mark'
export const metadata = { title: 'Child Safety Standards — Flitters', description: 'Flitters Child Safety Standards: our zero-tolerance policy on child sexual abuse and exploitation (CSAE), how to report it, and how we respond.' }

export default function ChildSafetyStandards() {
  const s = {
    page: { minHeight:'100dvh', background:'#090B10', color:'#fff', fontFamily:'sans-serif', padding:'0 0 80px' },
    header: { padding:'24px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:12 },
    logoText: { fontWeight:900, fontSize:20, background:'linear-gradient(135deg,#A855F7,#06B6D4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'-0.5px' },
    body: { maxWidth:680, margin:'0 auto', padding:'32px 20px' },
    h1: { fontSize:28, fontWeight:800, marginBottom:8 },
    updated: { color:'#555', fontSize:13, marginBottom:36 },
    h2: { fontSize:18, fontWeight:700, marginTop:32, marginBottom:12, color:'#A855F7' },
    p: { color:'#aaa', fontSize:15, lineHeight:1.8, marginBottom:12 },
    ul: { color:'#aaa', fontSize:15, lineHeight:1.8, paddingLeft:20, marginBottom:12 },
    a: { color:'#A855F7', textDecoration:'none' },
  }
  return (
    <div style={s.page}>
      <div style={s.header}>
        <img src={FLITTERS_MARK} alt="Flitters" width={36} height={36} style={{objectFit:'contain'}}/>
        <span style={s.logoText}>Flitters</span>
      </div>
      <div style={s.body}>
        <h1 style={s.h1}>Child Safety Standards</h1>
        <p style={s.updated}>Last updated: September 15, 2026</p>

        <div style={{padding:'18px 20px',background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.25)',borderRadius:16,marginBottom:28}}>
          <p style={{...s.p,marginBottom:0,color:'#fff',fontWeight:600}}>
            Flitters has zero tolerance for child sexual abuse and exploitation (CSAE). This applies to every part of the app — posts, comments, reels, direct messages, group chats, profiles, and the Store — with no exceptions.
          </p>
        </div>

        <h2 style={s.h2}>1. Who This Applies To</h2>
        <p style={s.p}>This policy governs <strong>Flitters</strong> (package name <code>com.flitters.apps</code>), developed and operated by <strong>Xchordlabs</strong> (Flitters Labs Corp). It applies to every account, every piece of content, and every feature on the platform, for every user regardless of location.</p>

        <h2 style={s.h2}>2. Prohibited Conduct</h2>
        <p style={s.p}>The following are strictly prohibited on Flitters, and will result in immediate content removal, account termination, and referral to law enforcement where required by law:</p>
        <ul style={s.ul}>
          <li>Uploading, sharing, or linking to child sexual abuse material (CSAM) in any form, including AI-generated or altered imagery depicting a minor sexually</li>
          <li>Sexualizing, sexually objectifying, or soliciting sexual content involving a minor</li>
          <li>Grooming behavior — including attempts to build trust with a minor for the purpose of sexual exploitation, isolating a minor from trusted adults, or soliciting personal information or images from a minor</li>
          <li>Sextortion or coercion of a minor</li>
          <li>Facilitating, promoting, or providing instructions for any of the above, including sharing links or contact information for this purpose</li>
          <li>Using the app's messaging or group features to contact minors for exploitative purposes</li>
        </ul>

        <h2 style={s.h2}>3. Minimum Age & Enforcement</h2>
        <p style={s.p}>Flitters requires all users to be at least <strong>13 years old</strong>. Date of birth is collected and checked at sign-up, and accounts that fail this check are not permitted to register. We do not knowingly permit anyone under 13 to hold an account.</p>

        <h2 style={s.h2}>4. How to Report — Our In-App Mechanism</h2>
        <p style={s.p}>Every post, user profile, direct message, group message, and reel in Flitters has a built-in <strong>Report</strong> option, reachable directly from that content (via the "···" menu on posts and profiles, or by pressing and holding a message or reel). "Child sexual abuse or exploitation" is listed first among the report reasons, ahead of every other category, so it's never buried.</p>
        <p style={s.p}>Reports are not public and are not visible to the person or content being reported. They go directly to a moderation queue reviewed by our Child Safety Team, where child-safety reports are automatically prioritized above all other report types.</p>
        <p style={s.p}>If you don't have access to the app, or need to reach us directly, email <a href="mailto:support@xchord.space" style={s.a}>support@xchord.space</a> with the subject line "Child Safety Report" and as much detail as you can safely provide (username, link, or screenshot).</p>

        <h2 style={s.h2}>5. What Happens After a Report</h2>
        <ul style={s.ul}>
          <li>Child-safety reports are reviewed as a priority, ahead of other report categories</li>
          <li>Confirmed violations result in immediate content removal and account termination</li>
          <li>We preserve relevant evidence as required for legal reporting obligations</li>
          <li>Where legally required, confirmed CSAM is reported to the National Center for Missing & Exploited Children (NCMEC) via its CyberTipline, consistent with our obligations under 18 U.S.C. § 2258A, and to law enforcement where appropriate</li>
        </ul>

        <h2 style={s.h2}>6. Legal Compliance</h2>
        <p style={s.p}>Flitters complies with applicable child safety laws, including U.S. federal law governing the reporting of child sexual abuse material by online service providers. We cooperate with law enforcement and child safety organizations investigating CSAE, and will preserve and disclose information as legally required or compelled by valid legal process.</p>

        <h2 style={s.h2}>7. Contact — Child Safety Team</h2>
        <p style={s.p}>For anything related to child safety on Flitters — reporting a concern, asking about this policy, or following up on a report — contact:<br/>
          <strong>Flitters Child Safety Team</strong><br/>
          Email: <a href="mailto:support@xchord.space" style={s.a}>support@xchord.space</a><br/>
          Operated by: Flitters Labs Corp (Xchordlabs)<br/>
          Website: <a href="https://xchord.space" style={s.a}>xchord.space</a>
        </p>

        <h2 style={s.h2}>8. Related Policies</h2>
        <p style={s.p}>This Child Safety Standards page works alongside our <a href="/privacy" style={s.a}>Privacy Policy</a>, which covers how we handle personal data more broadly.</p>

        <div style={{marginTop:48,padding:'20px',background:'rgba(91,156,246,0.07)',border:'1px solid rgba(91,156,246,0.15)',borderRadius:16}}>
          <p style={{...s.p,marginBottom:0,color:'#5B9CF6',fontSize:13}}>
            This page is publicly accessible at xchord.space/child-safety and is provided in compliance with Google Play's Child Safety Standards policy.
          </p>
        </div>
      </div>
    </div>
  )
}
