import { FLITTERS_MARK } from '@/lib/flitters-mark'
export const metadata = { title: 'Terms of Service — Flitters', description: 'Flitters Terms of Service' }

export default function Terms() {
  const s = {
    page: { minHeight:'100dvh', background:'#05060A', color:'#fff', fontFamily:'sans-serif', padding:'0 0 80px' },
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
        <h1 style={s.h1}>Terms of Service</h1>
        <p style={s.updated}>Last updated: November 5, 2026</p>

        <p style={s.p}>These Terms of Service ("Terms") govern your use of Flitters (formerly Sphere), the social platform at <strong>xchord.space</strong> and the Flitters mobile app ("Flitters", "we", "our", "us"), operated by Xchordlabs. By creating an account or using Flitters you agree to these Terms and to our <a href="/privacy" style={s.a}>Privacy Policy</a>. If you do not agree, please do not use Flitters.</p>

        <h2 style={s.h2}>1. Who can use Flitters</h2>
        <ul style={s.ul}>
          <li>You must be at least 13 years old (or the minimum age in your country, if higher).</li>
          <li>You must give accurate information when you sign up and keep your password safe. You are responsible for activity on your account.</li>
          <li>One person, one account. Do not create accounts to impersonate, mislead or evade a ban.</li>
        </ul>

        <h2 style={s.h2}>2. Your content</h2>
        <p style={s.p}>You own what you post (text, photos, videos, reels, messages). By posting, you give Flitters a non-exclusive, worldwide, royalty-free licence to host, store, display, distribute and adapt your content only so we can run and promote the service. This licence ends when you delete the content or your account, except where others have already shared it or we must keep a copy by law.</p>
        <p style={s.p}>You are responsible for your content. Only post things you have the right to share.</p>

        <h2 style={s.h2}>3. What is not allowed</h2>
        <ul style={s.ul}>
          <li>Content that sexually exploits or endangers children. We report it and remove the account (see our <a href="/child-safety" style={s.a}>Child Safety Standards</a>).</li>
          <li>Harassment, threats, hate speech, or content that promotes violence or self-harm.</li>
          <li>Scams, fake verification claims, impersonation, spam, or misleading engagement.</li>
          <li>Illegal content or activity, including selling illegal goods or services.</li>
          <li>Malware, scraping, attempting to break or overload the service, or accessing other people's accounts.</li>
          <li>Posting private information about others without their permission.</li>
        </ul>

        <h2 style={s.h2}>4. Moderation</h2>
        <p style={s.p}>We may remove content, limit features, suspend or close accounts that break these Terms or the law. You can report posts, comments, messages and accounts from inside the app. You can block people at any time.</p>

        <h2 style={s.h2}>5. Verification and paid plans</h2>
        <ul style={s.ul}>
          <li>Flitters Basic and Flitters Premium are paid subscriptions that give you a verified badge and extra features. The current prices and perks are shown on the Get Verified page and may change; a change will not affect a period you have already paid for.</li>
          <li>A subscription covers the period you paid for (one month or one year). To keep your badge you must pay again before it ends. When it ends, the badge and plan features are removed.</li>
          <li>Refunds: if you cancel before your paid period ends, the unused days are refunded. Email support@xchord.space with your username and transaction details. If you paid and your plan was not activated, contact us the same way. Your rights under the law of your country are not affected.</li>
          <li>A badge confirms that an account completed our verification steps. It is not an endorsement of the account or its content. We may remove a badge if the account breaks these Terms or the application contained false information.</li>
          <li>ID documents you upload for verification are used only to check your identity, and are not shown publicly.</li>
        </ul>

        <h2 style={s.h2}>6. Advertising</h2>
        <p style={s.p}>Flitters shows ads, including through Google AdSense and sponsored posts from advertisers. Sponsored content is marked "Sponsored". Advertisers are responsible for their ads; we do not guarantee any product or service advertised.</p>

        <h2 style={s.h2}>7. Our service</h2>
        <p style={s.p}>We work to keep Flitters available and safe, but it is provided "as is" and "as available". Features can change, and the service may be interrupted. Flitters, its name, logo and software belong to us or our licensors; these Terms do not give you any rights to them other than using the service.</p>

        <h2 style={s.h2}>8. Ending your account</h2>
        <p style={s.p}>You can delete your account at any time from Settings (see <a href="/delete-account" style={s.a}>delete account</a>). We may suspend or end your access if you break these Terms. Sections that by their nature should continue (such as content licences already granted for shared content, and limits of liability) continue after your account ends.</p>

        <h2 style={s.h2}>9. Limits of liability</h2>
        <p style={s.p}>To the extent the law allows, Xchordlabs is not liable for indirect or consequential losses, lost profits or data, or for content posted by users. Nothing in these Terms limits rights you have under consumer protection laws that cannot be limited by contract, including those that apply to you in the European Economic Area or the United Kingdom.</p>

        <h2 style={s.h2}>10. Changes to these Terms</h2>
        <p style={s.p}>We may update these Terms. If a change is significant we will tell you in the app or on this page. Using Flitters after a change means you accept the updated Terms.</p>

        <h2 style={s.h2}>11. Contact</h2>
        <p style={s.p}>
          <strong>Xchordlabs</strong><br/>
          Email: <a href="mailto:support@xchord.space" style={s.a}>support@xchord.space</a><br/>
          Website: <a href="https://xchord.space" style={s.a}>xchord.space</a>
        </p>
      </div>
    </div>
  )
}
