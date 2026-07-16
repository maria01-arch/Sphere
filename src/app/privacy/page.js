export const metadata = { title: 'Privacy Policy — Flitters', description: 'Flitters Privacy Policy' }

export default function PrivacyPolicy() {
  const s = {
    page: { minHeight:'100vh', background:'#090B10', color:'#fff', fontFamily:'sans-serif', padding:'0 0 80px' },
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
        <img src="/flitters-mark.png" alt="Flitters" width={36} height={36} style={{objectFit:'contain'}}/>
        <span style={s.logoText}>Flitters</span>
      </div>
      <div style={s.body}>
        <h1 style={s.h1}>Privacy Policy</h1>
        <p style={s.updated}>Last updated: July 1, 2025</p>

        <p style={s.p}>Welcome to Flitters (formerly known as Sphere) ("we", "our", or "us"). This Privacy Policy explains how we collect, use, and protect your information when you use the Flitters social media platform at <strong>flitters.app</strong>.</p>

        <h2 style={s.h2}>1. Information We Collect</h2>
        <p style={s.p}>We collect the following types of information:</p>
        <ul style={s.ul}>
          <li><strong>Account information</strong> — display name, username, email address, password (hashed), bio, location, and profile photo.</li>
          <li><strong>Content you create</strong> — posts, comments, reposts, reels (videos), group messages, and direct messages.</li>
          <li><strong>Usage data</strong> — pages viewed, features used, interactions (likes, follows, reactions), and timestamps.</li>
          <li><strong>Device information</strong> — browser type, operating system, IP address, and push notification tokens.</li>
          <li><strong>Cookies</strong> — session cookies for authentication and preference storage.</li>
        </ul>

        <h2 style={s.h2}>2. How We Use Your Information</h2>
        <ul style={s.ul}>
          <li>To operate and improve the Flitters platform</li>
          <li>To personalize your feed using our recommendation algorithm</li>
          <li>To send you notifications about activity on your account</li>
          <li>To show you relevant advertisements (including via Google AdSense)</li>
          <li>To enforce our community guidelines and terms of service</li>
          <li>To communicate with you about your account</li>
        </ul>

        <h2 style={s.h2}>3. Advertising</h2>
        <p style={s.p}>Flitters uses <strong>Google AdSense</strong> to display advertisements. Google may use cookies and device identifiers to show you personalized ads based on your browsing activity across websites. You can opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" style={s.a} target="_blank">Google's Ad Settings</a>.</p>
        <p style={s.p}>We also display direct sponsored content from advertisers who purchase ad placements through our platform. These are clearly marked as "Sponsored".</p>

        <h2 style={s.h2}>4. Data Sharing</h2>
        <p style={s.p}>We do not sell your personal information. We may share data with:</p>
        <ul style={s.ul}>
          <li><strong>Supabase</strong> — our database and authentication provider</li>
          <li><strong>Google</strong> — for advertising (AdSense) and analytics</li>
          <li><strong>Vercel</strong> — our hosting provider</li>
          <li>Law enforcement, when required by law</li>
        </ul>

        <h2 style={s.h2}>5. Data Storage & Security</h2>
        <p style={s.p}>Your data is stored securely on Supabase infrastructure with row-level security policies. Passwords are hashed and never stored in plain text. We use HTTPS for all data transmission.</p>

        <h2 style={s.h2}>6. Your Rights</h2>
        <ul style={s.ul}>
          <li>You can edit or delete your profile at any time from Settings</li>
          <li>You can delete your posts and reels at any time</li>
          <li>You can request full account deletion by contacting us</li>
          <li>You can opt out of push notifications in your browser settings</li>
        </ul>

        <h2 style={s.h2}>7. Children's Privacy</h2>
        <p style={s.p}>Flitters is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us immediately.</p>

        <h2 style={s.h2}>8. Cookies</h2>
        <p style={s.p}>We use essential cookies for authentication and session management. Third-party advertising cookies may be set by Google AdSense. You can control cookies through your browser settings.</p>

        <h2 style={s.h2}>9. Changes to This Policy</h2>
        <p style={s.p}>We may update this Privacy Policy from time to time. We will notify users of significant changes by posting a notice on the platform. Continued use of Flitters after changes constitutes acceptance of the updated policy.</p>

        <h2 style={s.h2}>10. Contact Us</h2>
        <p style={s.p}>If you have questions about this Privacy Policy, please contact us at:<br/>
          <strong>Flitters Labs Corp</strong><br/>
          Email: <a href="mailto:support@flitters.app" style={s.a}>support@flitters.app</a><br/>
          Website: <a href="https://flitters.app" style={s.a}>flitters.app</a>
        </p>

        <div style={{marginTop:48,padding:'20px',background:'rgba(91,156,246,0.07)',border:'1px solid rgba(91,156,246,0.15)',borderRadius:16}}>
          <p style={{...s.p,marginBottom:0,color:'#5B9CF6',fontSize:13}}>
            By using Flitters, you agree to this Privacy Policy. This policy complies with GDPR, CCPA, and Google AdSense program requirements.
          </p>
        </div>
      </div>
    </div>
  )
}
